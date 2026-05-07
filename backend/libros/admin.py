from django.contrib import admin

from libros.models import IdempotenciaCreacionLibro, Libro


@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ("id", "titulo", "autor", "anio", "genero", "actualizado_en")
    search_fields = ("titulo", "autor")
    list_filter = ("genero",)


@admin.register(IdempotenciaCreacionLibro)
class IdempotenciaCreacionLibroAdmin(admin.ModelAdmin):
    list_display = ("id", "clave", "libro", "creado_en")
    search_fields = ("clave",)
