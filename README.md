# Bunty AI — Phase 1

A local-first AI desktop assistant. Phase 1 delivers a real, working core:
streaming chat against a local Ollama model, multiple conversations,
markdown + code rendering, auth, and a persistent SQLite history — all
running as a normal web app (backend + frontend) before we layer in
memory, RAG, agents, multimodal input, voice, and desktop packaging.

## What's in Phase 1

- **Backend** — FastAPI, async SQLAlchemy + SQLite, JWT auth, WebSocket
  streaming chat, a provider abstraction so swapping/adding model backends
  is a config change, not a rewrite.
- **Frontend** — React + TypeScript + Tailwind + Framer Motion. Streaming
  UI, markdown rendering with syntax-highlighted code blocks, conversation
  sidebar with search/pin/delete, token + latency indicators.
- **Model backend** — Ollama, talking to your local `ollama serve` daemon.
  Default model: `mistral`.

## What's not in Phase 1 (planned next)

Memory (short/long-term, embeddings), RAG/knowledge base, AI agents, tool
execution (Python/terminal/git/browser), multimodal input (images, OCR,
camera), voice, plugin architecture, Electron/Tauri desktop packaging,
Docker, and additional model providers (OpenAI, Anthropic, Gemini, etc).
The architecture is built so each of these slots in without reworking
what's here — see `ARCHITECTURE.md`.

## Quick start

See `BUILD_GUIDE.txt` for exhaustive, line-by-line setup instructions.
Short version:

```bash
# 1. Ollama (separate install): https://ollama.com
ollama serve
ollama pull mistral

# 2. Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with `admin` / `changeme123`
(change this — see SECURITY notes in BUILD_GUIDE.txt).

## Project layout

```
bunty-ai/
├── backend/
│   ├── app/
│   │   ├── core/        # config, security (JWT/hashing), request deps
│   │   ├── db/          # SQLAlchemy models + async session
│   │   ├── providers/   # LLMProvider interface + Ollama implementation
│   │   ├── routers/     # auth, conversations, chat websocket, providers
│   │   ├── schemas/     # Pydantic request/response models
│   │   └── main.py      # app assembly, startup bootstrap
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/  # LoginScreen, Sidebar, ChatWindow, MessageRow, ...
    │   ├── lib/          # REST client, WebSocket client
    │   └── types/        # shared API types
    ├── package.json
    └── vite.config.ts
```

## Design note

The UI deliberately avoids chat-bubble styling in favor of a quiet,
editorial transcript layout — a vertical rule marks each turn, and a
single amber "signal" color is reserved for the active/streaming state
and interactive accents. Dark graphite background, serif display type for
headings, sans body text, mono for code.
