"""
Streaming chat over WebSocket.

Protocol (JSON messages both directions):

Client -> Server:
    {"type": "user_message", "content": "..."}

Server -> Client:
    {"type": "user_message_saved", "message": {...}}
    {"type": "token", "delta": "..."}                 (repeated)
    {"type": "assistant_message_saved", "message": {...}}
    {"type": "error", "detail": "..."}

Connect with: ws://host/ws/chat/{conversation_id}?token=<jwt>
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_ws
from app.db.models import Conversation, Message, User
from app.db.session import get_db
from app.providers.base import ChatMessage, ProviderError
from app.providers.registry import get_provider
from app.schemas.chat import MessageOut

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = (
    "You are Bunty, a helpful, precise, local-first AI assistant. "
    "Answer clearly and concisely."
)


async def _load_conversation(
    conversation_id: str, db: AsyncSession, user: User
) -> Conversation | None:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == user.id
        )
    )
    return result.scalar_one_or_none()


async def _history_as_chat_messages(conversation: Conversation, db: AsyncSession) -> list[ChatMessage]:
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at)
    )
    history = [ChatMessage(role="system", content=SYSTEM_PROMPT)]
    for m in result.scalars().all():
        history.append(ChatMessage(role=m.role, content=m.content))
    return history


@router.websocket("/ws/chat/{conversation_id}")
async def chat_socket(
    websocket: WebSocket,
    conversation_id: str,
    user: User = Depends(get_current_user_ws),
    db: AsyncSession = Depends(get_db),
) -> None:
    await websocket.accept()

    conversation = await _load_conversation(conversation_id, db, user)
    if conversation is None:
        await websocket.send_json({"type": "error", "detail": "Conversation not found"})
        await websocket.close()
        return

    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") != "user_message":
                await websocket.send_json({"type": "error", "detail": "Unknown message type"})
                continue

            content = (payload.get("content") or "").strip()
            if not content:
                await websocket.send_json({"type": "error", "detail": "Empty message"})
                continue

            # Persist user message
            user_message = Message(conversation_id=conversation.id, role="user", content=content)
            db.add(user_message)
            await db.commit()
            await db.refresh(user_message)
            await websocket.send_json(
                {"type": "user_message_saved", "message": MessageOut.model_validate(user_message).model_dump(mode="json")}
            )

            # Auto-title new conversations from the first message
            if conversation.title == "New Chat":
                conversation.title = content[:60]
                await db.commit()

            chat_history = await _history_as_chat_messages(conversation, db)
            provider = get_provider(conversation.provider)

            assistant_text = ""
            started = time.monotonic()
            total_tokens: int | None = None
            try:
                async for chunk in provider.stream_chat(chat_history, model=conversation.model):
                    if chunk.delta:
                        assistant_text += chunk.delta
                        await websocket.send_json({"type": "token", "delta": chunk.delta})
                    if chunk.done:
                        total_tokens = chunk.total_tokens
            except ProviderError as exc:
                await websocket.send_json({"type": "error", "detail": str(exc)})
                continue

            latency_ms = int((time.monotonic() - started) * 1000)
            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=assistant_text,
                token_count=total_tokens,
                latency_ms=latency_ms,
            )
            db.add(assistant_message)
            await db.commit()
            await db.refresh(assistant_message)
            await websocket.send_json(
                {
                    "type": "assistant_message_saved",
                    "message": MessageOut.model_validate(assistant_message).model_dump(mode="json"),
                }
            )
    except WebSocketDisconnect:
        return
