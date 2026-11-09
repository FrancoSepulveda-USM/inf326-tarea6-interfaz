"""API Gateway en GraphQL (Ariadne sobre FastAPI).

La interfaz solo habla con este servicio. El gateway llama a los microservicios
por sus APIs REST públicas y junta (agrega) los datos que necesita cada vista.
"""
import logging

import httpx
from ariadne import load_schema_from_path, make_executable_schema
from ariadne.asgi import GraphQL
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .clients import MEDIA_URL, PROFILES_URL, TIMEOUT
from .routes import chat, media, polls, profiles

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s:%(levelname)s:%(name)s:%(message)s')

type_defs = load_schema_from_path("./app/schemas/")#Leer archivos schemeas

# Unir eesquemas con los resolvers
schema = make_executable_schema(
    type_defs,
    chat.query, chat.mutation, chat.user, chat.message,
    profiles.query, profiles.mutation,
    media.query, media.mutation, media.attachment,
    polls.query, polls.mutation, polls.poll,
)

app = FastAPI(title="API Gateway")
app.add_middleware(CORSMiddleware, allow_origins=['*'],
                allow_methods=("GET", "POST", "OPTIONS"), allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok"}


async def proxy_file(url: str, headers: dict | None = None) -> Response:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            upstream = await client.get(url, headers=headers or {})
    except httpx.HTTPError:
        raise HTTPException(503, "Servicio no disponible")
    if upstream.status_code != 200:
        raise HTTPException(upstream.status_code, "Archivo no disponible")
    passthrough = {k: v for k, v in upstream.headers.items()
                    if k.lower() in ("content-disposition", "x-content-type-options")}
    return Response(content=upstream.content, headers=passthrough,
                    media_type=upstream.headers.get("content-type"))


@app.get("/files/profiles/avatars/{name}")
async def avatar_file(name: str):
    return await proxy_file(f"{PROFILES_URL}/avatars/{name}")


@app.get("/files/attachments/{attachment_id}")
async def attachment_file(attachment_id: str, user_id: str):
    return await proxy_file(f"{MEDIA_URL}/api/v1/attachments/{attachment_id}/download",
                            {"X-User-Id": user_id})


# GraphQL (y su explorador web) en /graphql
app.mount("/graphql", GraphQL(schema, debug=True))
