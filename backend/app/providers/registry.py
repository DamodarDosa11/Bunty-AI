"""
Provider registry.

`get_active_provider()` is the single call site the rest of the app uses.
To add a new provider: implement LLMProvider in a new module, register it
in `_PROVIDERS` below, and set ACTIVE_PROVIDER in .env to its key. No other
code changes are required.
"""
from __future__ import annotations

from app.core.config import get_settings
from app.providers.base import LLMProvider
from app.providers.ollama_provider import OllamaProvider

settings = get_settings()

_PROVIDERS: dict[str, LLMProvider] = {
    "ollama": OllamaProvider(),
    # Future: "openai": OpenAIProvider(), "anthropic": AnthropicProvider(), ...
}


def get_active_provider() -> LLMProvider:
    provider = _PROVIDERS.get(settings.active_provider)
    if provider is None:
        raise ValueError(
            f"Unknown ACTIVE_PROVIDER '{settings.active_provider}'. "
            f"Available: {list(_PROVIDERS)}"
        )
    return provider


def get_provider(key: str) -> LLMProvider:
    provider = _PROVIDERS.get(key)
    if provider is None:
        raise ValueError(f"Unknown provider '{key}'. Available: {list(_PROVIDERS)}")
    return provider
