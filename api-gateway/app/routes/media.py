"""Resolvers del servicio media (otro equipo). Media exige el header X-User-Id."""
from urllib.parse import quote

from ariadne import MutationType, ObjectType, QueryType

from ..clients import MEDIA_URL, PUBLIC_URL, call, load_user
from .profiles import decode_file

query = QueryType()
mutation = MutationType()
attachment = ObjectType("Attachment")

# Media usa ese formato de ID.
def as_user(user_id: str) -> dict:
    return {"X-User-Id": user_id}


@query.field("listAttachments")
async def resolve_list_attachments(_, info, channelId, userId):
    # Se piden solo archivos (IMAGE y DOCUMENT); los LINK son previews de enlaces.
    items = []
    for category in ("IMAGE", "DOCUMENT"):
        page = await call("GET", f"{MEDIA_URL}/api/v1/channels/{channelId}/attachments", "media",
                        headers=as_user(userId), params={"category": category, "limit": 100})
        items.extend(page.get("items", []))
    info.context["media_user"] = userId
    return sorted(items, key=lambda a: a.get("created_at", ""), reverse=True)


@attachment.field("download_url")
def resolve_download_url(obj, info):
    # Se descarga a través del gateway (ruta REST /files/attachments/... en main.py).
    user_id = info.context.get("media_user", obj.get("uploader_id"))
    return f"{PUBLIC_URL}/files/attachments/{obj['id']}?user_id={quote(user_id)}"


@attachment.field("uploader")
async def resolve_uploader(obj, info):
    return await load_user(info, obj.get("uploader_id"))


@mutation.field("uploadAttachment")
async def resolve_upload_attachment(_, info, channelId, userId, filename, contentType, dataBase64):
    content = decode_file(dataBase64)
    info.context["media_user"] = userId
    return await call("POST", f"{MEDIA_URL}/api/v1/channels/{channelId}/attachments", "media",
                    headers=as_user(userId),
                    files={"file": (filename, content, contentType or "application/octet-stream")})


@mutation.field("deleteAttachment")
async def resolve_delete_attachment(*_, attachmentId, userId):
    await call("DELETE", f"{MEDIA_URL}/api/v1/attachments/{attachmentId}", "media",
                headers=as_user(userId))
    return True
