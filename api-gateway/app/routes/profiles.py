"""Resolvers del servicio profiles (nuestro equipo)."""
import base64
import binascii

from ariadne import MutationType, QueryType
from graphql import GraphQLError

from ..clients import PROFILES_URL, call

query = QueryType()
mutation = MutationType()


def decode_file(data_base64: str) -> bytes:
    try:
        return base64.b64decode(data_base64, validate=True)
    except (binascii.Error, ValueError):
        raise GraphQLError("El archivo no viene en base64 válido")


def clean(value):#Convertit texto vacio en None.
    """'' o espacios -> None (para borrar una red social)."""
    if value is None:
        return None
    value = value.strip()
    return value or None

# Obtener perfiles
@query.field("getProfile")
async def resolve_get_profile(*_, userId):
    return await call("GET", f"{PROFILES_URL}/api/v1/profiles/{userId}", "profiles",
                    not_found_none=True)

# Acutlaizar perfiles
@mutation.field("updateProfile")
async def resolve_update_profile(*_, userId, input):
    body = {}
    for field in ("bio", "status"):
        if field in input and input[field] is not None:
            body[field] = input[field].strip()
    for field in ("interests", "languages"):
        if field in input and input[field] is not None:
            body[field] = [v.strip() for v in input[field] if v and v.strip()]
    socials = {k: clean(input[k]) for k in ("github", "linkedin", "twitter") if k in input}
    if socials:
        body["social_handles"] = socials
    return await call("PATCH", f"{PROFILES_URL}/api/v1/profiles/{userId}", "profiles", json=body)

# Subir perfiles
@mutation.field("uploadAvatar")
async def resolve_upload_avatar(*_, userId, filename, contentType, dataBase64):
    content = decode_file(dataBase64)
    return await call("POST", f"{PROFILES_URL}/api/v1/profiles/{userId}/avatar", "profiles",
                        files={"avatar": (filename, content, contentType or "application/octet-stream")})

# Eliminar perfiles
@mutation.field("deleteAvatar")
async def resolve_delete_avatar(*_, userId):
    return await call("DELETE", f"{PROFILES_URL}/api/v1/profiles/{userId}/avatar", "profiles")
