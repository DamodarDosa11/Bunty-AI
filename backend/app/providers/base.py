"""
Common provider interface.

Every model backend (Ollama today; OpenAI, Anthropic, Gemini, Grok,
OpenRouter, Azure OpenAI in future phases) implements this interface. The
rest of the app (routers, services) only ever talks to `LLMProvider`, never
to a concrete provider -- so adding a new provider or switching the active
one is a registration + config change, not a rewrite.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass
class StreamChunk:
    """One piece of a streaming response."""

    delta: str
    done: bool = False
    # Populated only on the final chunk, when the provider reports it.
    total_tokens: int | None = None


class ProviderError(RuntimeError):
    """Raised when a provider fails to respond (connection, timeout, bad model, etc.)."""


class LLMProvider(ABC):
    key: str  # unique registry key, e.g. "ollama"

    @abstractmethod
    async def stream_chat(
        self, messages: list[ChatMessage], model: str
    ) -> AsyncIterator[StreamChunk]:
        """Stream a chat completion chunk by chunk."""
        raise NotImplementedError

    @abstractmethod
    async def list_models(self) -> list[str]:
        """Return the model names currently available from this provider."""
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the provider backend is reachable."""
        raise NotImplementedError
