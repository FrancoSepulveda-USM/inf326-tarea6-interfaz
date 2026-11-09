"""Conexión del API Gateway con los microservicios (todo por sus APIs REST públicas)."""
import asyncio
import logging
import os

import httpx
from graphql import GraphQLError

# Variables de entorno
USERS_URL = os.environ.get("USERS_URL", "http://users:8000")
CHANNELS_URL = os.environ.get("CHANNELS_URL", "http://channels:8000")
MESSAGES_URL = os.environ.get("MESSAGES_URL", "http://messages:8000")
PROFILES_URL = os.environ.get("PROFILES_URL", "http://profiles:8000")
MEDIA_URL = os.environ.get("MEDIA_URL", "http://media:8000")
POLLS_URL = os.environ.get("POLLS_URL", "http://polls-api:8004")
# URL con la que el navegador ve al gateway (para armar links de descarga).
PUBLIC_URL = os.environ.get("GATEWAY_PUBLIC_URL", "http://localhost:8080").rstrip("/")
TIMEOUT = float(os.environ.get("GATEWAY_TIMEOUT_SECONDS", "10"))

log = logging.getLogger("gateway")

async def call(method: str, url: str, service: str, *, not_found_none: bool = False, **kwargs):
    """Llama a un microservicio y convierte sus errores en errores de GraphQL.
    Si el servicio está caído solo falla el campo que lo usa; el resto de la
    consulta sigue funcionando.
    """
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.request(method, url, **kwargs)
    except httpx.HTTPError:
        log.exception("Servicio %s no disponible (%s %s)", service, method, url)
        raise GraphQLError(f"El servicio {service} no está disponible")

    if response.status_code == 404 and not_found_none:
        return None
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail")
        except Exception:
            detail = response.text
        if isinstance(detail, list):  # errores de validación de FastAPI
            detail = "; ".join(str(d.get("msg", d)) for d in detail)
        raise GraphQLError(f"{service} ({response.status_code}): {detail}")
    if response.status_code == 204 or not response.content:
        return None
    return response.json()


async def load_user(info, user_id: str):
    """Obtiene un usuario evitando pedir el mismo varias veces en una consulta (problema n+1).
    Funciona como un DataLoader -> guarda una tarea por ID en el
    contexto de la petición, así 20 mensajes del mismo autor = 1 llamada.
    """
    if not user_id:
        return None
    cache = info.context.setdefault("users_cache", {})
    if user_id not in cache:
        cache[user_id] = asyncio.ensure_future(
            call("GET", f"{USERS_URL}/api/v1/users/{user_id}", "users", not_found_none=True))
    try:
        return await cache[user_id]
    except GraphQLError:
        return None  # si users falla, el autor queda vacío pero el resto se muestra
