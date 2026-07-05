"""
REST endpoints for managing conversations (list, create, rename, pin,
delete) and fetching a conversation's message history. Actual chat
streaming happens over the WebSocket in app/routers/chat_ws.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db.models import Conversation, User
from app.db.session import get_db
from app.schemas.chat import (
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    ConversationWithMessages,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])
settings = get_settings()


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.pinned.desc(), Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    conversation = Conversation(
        user_id=current_user.id,
        title=payload.title,
        model=payload.model or settings.ollama_default_model,
        provider=payload.provider or settings.active_provider,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def _get_owned_conversation(
    conversation_id: str, db: AsyncSession, current_user: User
) -> Conversation:
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.get("/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    return await _get_owned_conversation(conversation_id, db, current_user)


@router.patch("/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Conversation:
    conversation = await _get_owned_conversation(conversation_id, db, current_user)
    if payload.title is not None:
        conversation.title = payload.title
    if payload.pinned is not None:
        conversation.pinned = payload.pinned
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    conversation = await _get_owned_conversation(conversation_id, db, current_user)
    await db.delete(conversation)
    await db.commit()
