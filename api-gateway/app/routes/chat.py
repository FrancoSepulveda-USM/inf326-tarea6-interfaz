#Gateway para el chat base
import re

from ariadne import MutationType, ObjectType, QueryType

from ..clients import CHANNELS_URL, MESSAGES_URL, USERS_URL, PROFILES_URL, call, load_user

query = QueryType()
mutation = MutationType()
user = ObjectType("User")
message = ObjectType("Message")

POLL_ID = re.compile(r"Poll ID: ([0-9a-fA-F-]{36})")


# Users
@query.field("listUsers")
async def resolve_list_users(*_):
    # Se leen los eventos -> (chat.user.created).
    events = await call("GET", f"{USERS_URL}/api/v1/events", "users")
    seen = {}
    for event in events:
        if event.get("type") == "chat.user.created":
            data = event.get("data") or {}
            if data.get("id"):
                seen[data["id"]] = data
    return list(seen.values())


@query.field("getUser")
async def resolve_get_user(_, info, id):
    return await load_user(info, id)


@mutation.field("createUser")
async def resolve_create_user(*_, displayName):
    return await call("POST", f"{USERS_URL}/api/v1/users", "users",
                    json={"display_name": displayName})


@user.field("profile")
async def resolve_user_profile(obj, *_):
    try:
        return await call("GET", f"{PROFILES_URL}/api/v1/profiles/{obj['id']}", "profiles",
                        not_found_none=True)
    except Exception:
        return None  #Si profiles está caído, el usuario se muestra igual sin perfil


# Canales
@query.field("listChannels")
async def resolve_list_channels(*_):
    return await call("GET", f"{CHANNELS_URL}/api/v1/channels", "channels")


@query.field("getChannel")
async def resolve_get_channel(*_, id):
    return await call("GET", f"{CHANNELS_URL}/api/v1/channels/{id}", "channels",
                    not_found_none=True)


@mutation.field("createChannel")
async def resolve_create_channel(*_, name):
    return await call("POST", f"{CHANNELS_URL}/api/v1/channels", "channels", json={"name": name})


# Messages

@query.field("listMessages")
async def resolve_list_messages(*_, channelId):
    items = await call("GET", f"{MESSAGES_URL}/api/v1/channels/{channelId}/messages", "messages")
    return sorted(items, key=lambda m: m.get("created_at", ""))


@mutation.field("sendMessage")
async def resolve_send_message(*_, channelId, authorId, content):
    return await call("POST", f"{MESSAGES_URL}/api/v1/channels/{channelId}/messages", "messages",
                    json={"author_id": authorId, "content": content})


@message.field("author")
async def resolve_message_author(obj, info):
    return await load_user(info, obj.get("author_id"))


@message.field("poll_id")
def resolve_message_poll_id(obj, *_):
    found = POLL_ID.search(obj.get("content", ""))
    return found.group(1) if found else None
