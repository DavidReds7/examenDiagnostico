import re

from django.core.exceptions import ValidationError

_XMLISH = re.compile(r"</?[A-Za-z][^>]*>|&#?\w+;|<!ENTITY|<!\[CDATA\[|\]\]>|\x00")


class LibroGenero:
    FICCION = "ficcion"
    NO_FICCION = "no_ficcion"
    POESIA = "poesia"
    ENSAYO = "ensayo"
    INFANTIL = "infantil"
    OTRO = "otro"

    choices = (
        (FICCION, "Ficción"),
        (NO_FICCION, "No ficción"),
        (POESIA, "Poesía"),
        (ENSAYO, "Ensayo"),
        (INFANTIL, "Infantil"),
        (OTRO, "Otro"),
    )


def texto_sin_payload_xml(valor):
    if valor is None:
        return
    if _XMLISH.search(valor):
        raise ValidationError(
            "El texto no puede contener construcciones tipo XML o entidades peligrosas.",
            code="xml_payload",
        )


def titulo_autor_validos(valor):
    if not valor or not valor.strip():
        raise ValidationError("Este campo no puede quedar vacío.", code="blank")
    valor_limpio = valor.strip()
    if len(valor_limpio) > 200:
        raise ValidationError("Máximo 200 caracteres.", code="max_length")


def genero_valido(valor):
    permitidos = {c[0] for c in LibroGenero.choices}
    if valor not in permitidos:
        raise ValidationError("Género no reconocido.", code="invalid_choice")
