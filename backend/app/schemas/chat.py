from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    token_count: int | None
    latency_ms: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: str
    title: str
    pinned: bool
    model: str
    provider: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationWithMessages(ConversationOut):
    messages: list[MessageOut] = []


class ConversationCreate(BaseModel):
    title: str = "New Chat"
    model: str | None = None
    provider: str | None = None


class ConversationUpdate(BaseModel):
    title: str | None = None
    pinned: bool | None = None


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1)
