"""Resolvers del servicio polls (otro equipo)."""
import asyncio

from ariadne import MutationType, ObjectType, QueryType

from ..clients import MESSAGES_URL, POLLS_URL, call, load_user
from .chat import POLL_ID

query = QueryType()
mutation = MutationType()
poll = ObjectType("Poll")


async def fetch_poll(poll_id: str):
    return await call("GET", f"{POLLS_URL}/api/v1/polls/{poll_id}", "polls", not_found_none=True)


@query.field("getPoll")
async def resolve_get_poll(*_, id):
    return await fetch_poll(id)


@query.field("listPolls")
async def resolve_list_polls(*_, channelId):
    # Polls no tiene endpoint para listar. Cuando se crea una encuesta, polls
    # publica un anuncio en el canal ("Poll ID: <id>") usando la API de messages.
    # El gateway agrega ambos servicios: lee los mensajes y consulta cada encuesta.
    messages = await call("GET", f"{MESSAGES_URL}/api/v1/channels/{channelId}/messages", "messages")
    ids = []
    for msg in messages:
        found = POLL_ID.search(msg.get("content", ""))
        if found and found.group(1) not in ids:
            ids.append(found.group(1))
    results = await asyncio.gather(*(fetch_poll(i) for i in ids), return_exceptions=True)
    polls = [p for p in results if isinstance(p, dict)]
    return sorted(polls, key=lambda p: p.get("created_at", ""), reverse=True)


@mutation.field("createPoll")
async def resolve_create_poll(*_, channelId, authorId, question, options, durationMinutes=None):
    body = {"channel_id": channelId, "author_id": authorId, "question": question,
            "options": [o.strip() for o in options if o.strip()]}
    if durationMinutes:
        body["duration_minutes"] = durationMinutes
    return await call("POST", f"{POLLS_URL}/api/v1/polls", "polls", json=body)


@mutation.field("votePoll")
async def resolve_vote_poll(*_, pollId, voterId, optionId):
    await call("POST", f"{POLLS_URL}/api/v1/polls/{pollId}/votes", "polls",
                json={"voter_id": voterId, "option_id": optionId})
    return await fetch_poll(pollId)  # se devuelve la encuesta con los conteos nuevos


@mutation.field("closePoll")
async def resolve_close_poll(*_, pollId, authorId):
    return await call("POST", f"{POLLS_URL}/api/v1/polls/{pollId}/close", "polls",
                    json={"author_id": authorId})


@poll.field("author")
async def resolve_poll_author(obj, info):
    return await load_user(info, obj.get("author_id"))
