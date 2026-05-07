import hashlib
import re

from django.db import connection, transaction
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from libros.models import IdempotenciaCreacionLibro, Libro
from libros.serializers import LibroSerializer


class LibroViewSet(viewsets.ModelViewSet):
    queryset = Libro.objects.all()
    serializer_class = LibroSerializer
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        raw_key = request.headers.get("Idempotency-Key")
        if not raw_key:
            raise DRFValidationError(
                {"Idempotency-Key": "Cabecera obligatoria para crear registros de forma segura e idempotente."}
            )
        if not isinstance(raw_key, str):
            raise DRFValidationError({"Idempotency-Key": "Valor de cabecera inválido."})
        raw_key = raw_key.strip()
        if len(raw_key) < 8 or len(raw_key) > 128:
            raise DRFValidationError({"Idempotency-Key": "La longitud debe estar entre 8 y 128 caracteres."})
        if not re.match(r"^[A-Za-z0-9_-]+$", raw_key):
            raise DRFValidationError(
                {"Idempotency-Key": "Solo se permiten letras ASCII, dígitos, guión medio y guión bajo."}
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:48]

        def nombre_cerrojo():
            return f"libro_idem_{token}"

        cerrojo_mysql = nombre_cerrojo()
        cerrojo_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT GET_LOCK(%s, 15)", [cerrojo_mysql])
                fila = cursor.fetchone()
                cerrojo_ok = bool(fila and fila[0] == 1)
            if not cerrojo_ok:
                return Response(
                    {"detail": "No fue posible coordinar la petición concurrente. Intente nuevamente."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            with transaction.atomic():
                previo = (
                    IdempotenciaCreacionLibro.objects.select_related("libro").filter(clave=raw_key).first()
                )
                if previo:
                    salida = LibroSerializer(previo.libro, context=self.get_serializer_context())
                    return Response(salida.data, status=status.HTTP_200_OK)

                libro = Libro(**serializer.validated_data)
                libro.save()
                IdempotenciaCreacionLibro.objects.create(clave=raw_key, libro=libro)

            salida = LibroSerializer(libro, context=self.get_serializer_context())
            respuesta = Response(salida.data, status=status.HTTP_201_CREATED)
            ubicacion = request.build_absolute_uri(f"/api/libros/{libro.pk}/")
            respuesta["Location"] = ubicacion
            return respuesta
        finally:
            if cerrojo_ok:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT RELEASE_LOCK(%s)", [cerrojo_mysql])
