# ARCHITECTURE.md — Bunty AI (Phase 1)

## Overview

Two independent processes talking over HTTP + WebSocket:

```
┌────────────────┐        HTTP (REST)         ┌──────────────────┐        HTTP        ┌─────────┐
│  React frontend │ ─────────────────────────► │  FastAPI backend │ ──────────────────► │ Ollama  │
│  (Vite, :5173)  │ ◄───────────────────────── │     (:8000)      │ ◄────────────────── │ (:11434)│
└────────────────┘   WebSocket (streaming)     └──────────────────┘                    └─────────┘
                                                        │
                                                        ▼
                                                  SQLite (data/bunty.db)
```

In dev, Vite proxies `/api/*` and `/ws/*` to the backend (see
`frontend/vite.config.ts`), so the browser only ever talks to one origin.

## Backend layers

- **`app/core`** — cross-cutting concerns: `config.py` (all settings, env-driven),
  `security.py` (password hashing + JWT), `deps.py` (FastAPI dependencies for
  the current user, over both HTTP and WebSocket).
- **`app/db`** — `models.py` (User, Conversation, Message) and `session.py`
  (async engine/session factory). Swappable to Postgres by changing
  `DATABASE_URL` only.
- **`app/providers`** — `base.py` defines `LLMProvider`, an abstract async
  interface (`stream_chat`, `list_models`, `health_check`). `ollama_provider.py`
  implements it against Ollama's `/api/chat` streaming endpoint.
  `registry.py` maps a config string (`ACTIVE_PROVIDER`) to a provider
  instance. Adding OpenAI/Anthropic/Gemini/etc later means: implement
  `LLMProvider`, register it, done — no router or frontend changes needed.
- **`app/routers`** — `auth.py` (login/register/me), `conversations.py`
  (CRUD + history), `chat_ws.py` (the streaming protocol, see below),
  `providers.py` (model list + health, for the frontend's status indicator).
- **`app/schemas`** — Pydantic I/O models, kept separate from ORM models so
  the wire format can evolve independently of storage.

## Streaming chat protocol

WebSocket at `/ws/chat/{conversation_id}?token=<jwt>` (token is a query
param because browsers can't set custom headers on WebSocket upgrade
requests).

Client sends one message type:
```json
{"type": "user_message", "content": "..."}
```

Server sends, in order, for each turn:
```json
{"type": "user_message_saved", "message": {...}}
{"type": "token", "delta": "..."}          // repeated, one per chunk
{"type": "assistant_message_saved", "message": {...}}
```
or, if the provider fails:
```json
{"type": "error", "detail": "human-readable reason"}
```

The user's message is persisted before the model is called, so history is
never lost even if the provider call fails. The full conversation history
(with a fixed system prompt) is sent to the provider on every turn — no
truncation or summarization yet. That's the first thing the memory phase
replaces (short-term window + summarized long-term memory).

## Frontend structure

- `lib/api.ts` — thin fetch wrapper, attaches the JWT, typed responses.
- `lib/socket.ts` — opens the chat WebSocket, exposes `send`/`close`.
- `components/ChatWindow.tsx` — owns per-conversation state: loads history
  via REST, opens a socket, reduces incoming events into message list +
  in-progress streaming buffer.
- `components/Sidebar.tsx`, `MessageRow.tsx`, `MessageInput.tsx`,
  `Markdown.tsx`, `LoginScreen.tsx` — presentational, prop-driven.
- `App.tsx` — auth gate + conversation list state, composes Sidebar and
  ChatWindow.

State is intentionally kept in React state (no Redux/Zustand store wired
up yet) since Phase 1 has one screen's worth of state. `zustand` is already
a dependency for when agent/tool state needs to be shared more broadly.

## Where later phases attach

- **Memory** — new `app/services/memory.py` + tables; `chat_ws.py`'s
  `_history_as_chat_messages` becomes memory-aware instead of loading full
  history.
- **RAG** — new `app/services/rag.py`, a vector store (e.g. `pgvector` or
  `chromadb`), and an ingestion router. Retrieved chunks get injected into
  the system/context messages before the provider call.
- **Agents & tools** — new `app/services/agents/` package with an
  orchestrator; tool execution goes through a sandboxed executor service,
  not directly from routers.
- **Multimodal** — extend `ChatMessage` to carry attachments; extend the
  WebSocket protocol with an `attachment` field; Ollama's vision models
  (e.g. llama3.2-vision) plug into the existing `OllamaProvider`.
- **Desktop packaging** — Electron/Tauri wraps the built frontend and
  spawns the backend as a subprocess; no backend code changes required.
