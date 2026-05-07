from rest_framework import serializers

from libros.models import Libro
from libros.validators import genero_valido, texto_sin_payload_xml, titulo_autor_validos


class LibroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Libro
        fields = [
            "id",
            "titulo",
            "autor",
            "anio",
            "genero",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "creado_en", "actualizado_en"]

    def validate_titulo(self, valor):
        titulo_autor_validos(valor)
        texto_sin_payload_xml(valor)
        return valor.strip()

    def validate_autor(self, valor):
        titulo_autor_validos(valor)
        texto_sin_payload_xml(valor)
        return valor.strip()

    def validate_anio(self, valor):
        if valor < 1000 or valor > 2100:
            raise serializers.ValidationError("Año fuera del rango permitido (1000-2100).")
        return valor

    def validate_genero(self, valor):
        genero_valido(valor)
        return valor
