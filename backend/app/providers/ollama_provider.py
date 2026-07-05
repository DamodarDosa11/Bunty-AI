"""
Ollama provider.

Talks to a local Ollama daemon (default http://localhost:11434) over its
HTTP API. Ollama must be installed and running separately, and the model
must be pulled first: `ollama pull mistral`. See BUILD_GUIDE.txt for setup.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx

from app.core.config import get_settings
from app.providers.base import ChatMessage, LLMProvider, ProviderError, StreamChunk

settings = get_settings()


class OllamaProvider(LLMProvider):
    key = "ollama"

    def __init__(self, base_url: str | None = None, timeout: float | None = None) -> None:
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout = timeout or settings.ollama_request_timeout_seconds

    async def stream_chat(
        self, messages: list[ChatMessage], model: str
    ) -> AsyncIterator[StreamChunk]:
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
        }
        url = f"{self.base_url}/api/chat"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        raise ProviderError(
                            f"Ollama returned {response.status_code}: {body.decode(errors='replace')}"
                        )
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        if data.get("error"):
                            raise ProviderError(str(data["error"]))

                        message = data.get("message") or {}
                        delta = message.get("content", "")
                        done = bool(data.get("done"))

                        yield StreamChunk(
                            delta=delta,
                            done=done,
                            total_tokens=data.get("eval_count") if done else None,
                        )
                        if done:
                            return
        except httpx.ConnectError as exc:
            raise ProviderError(
                f"Could not connect to Ollama at {self.base_url}. "
                "Is `ollama serve` running? See BUILD_GUIDE.txt."
            ) from exc
        except httpx.TimeoutException as exc:
            raise ProviderError("Ollama request timed out.") from exc

    async def list_models(self) -> list[str]:
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
        except httpx.HTTPError as exc:
            raise ProviderError(f"Failed to list Ollama models: {exc}") from exc

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except httpx.HTTPError:
            return False
