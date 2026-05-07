from django.db import models
from django.db.models import Q

from libros.validators import LibroGenero, texto_sin_payload_xml


class Libro(models.Model):
    titulo = models.CharField(max_length=200)
    autor = models.CharField(max_length=200)
    anio = models.PositiveSmallIntegerField()
    genero = models.CharField(max_length=32, choices=LibroGenero.choices)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-actualizado_en", "-id"]
        constraints = [
            models.CheckConstraint(
                check=Q(anio__gte=1000) & Q(anio__lte=2100),
                name="libro_anio_rango",
            ),
        ]

    def clean(self):
        texto_sin_payload_xml(self.titulo)
        texto_sin_payload_xml(self.autor)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class IdempotenciaCreacionLibro(models.Model):
    clave = models.CharField(max_length=128, unique=True, db_index=True)
    libro = models.OneToOneField(
        Libro,
        on_delete=models.CASCADE,
        related_name="idempotencia_origen",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
