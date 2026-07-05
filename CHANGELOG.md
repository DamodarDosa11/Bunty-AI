# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed — Default Ollama model: `llama3` → `mistral`

The application's out-of-the-box default model is now `mistral` instead of
`llama3`. This only changes the *default value* used when no model is
explicitly set — it does not remove or restrict support for other models
(anything pulled into your local Ollama daemon can still be used).

**Updated:**
- `backend/app/core/config.py` — `Settings.ollama_default_model`
- `backend/app/db/models.py` — `Conversation.model` column default
- `backend/.env.example` — `OLLAMA_DEFAULT_MODEL`
- `backend/app/providers/ollama_provider.py` — docstring's `ollama pull`
  example
- `README.md` — default model callout + quick-start `ollama pull` command
- `BUILD_GUIDE.txt` — pull command, verification JSON example, env var
  doc, and the "changing the default model" section's existing-code
  snippet

**Action needed for existing local installs:**
```bash
ollama pull mistral
```
Existing conversations keep whatever model they were created with
(stored per-conversation in the `conversations.model` column) — this
change only affects *new* conversations that don't explicitly request a
different model.

### Added — Sidebar modernization + chat input redesign

Two UI-only features, no backend, schema, or API changes.

**Feature 1 — Modernized left sidebar** (`frontend/src/components/Sidebar.tsx`):
- Reworked spacing and padding throughout (header, new-chat button, search,
  conversation list, footer) for a less cramped, more deliberate layout.
- New-chat button, search field, and conversation rows now use consistent
  `rounded-xl` / `rounded-lg` corners in place of the previous mix.
- Hover animations via `framer-motion` (already a dependency, previously
  unused in this file): new-chat button lifts slightly on hover, rows
  shift subtly on hover, pin/delete icon buttons scale on hover/tap.
- Active chat is now highlighted with a persistent background *and* an
  animated left accent bar (`layoutId="active-chat-indicator"`) that
  slides smoothly between conversations instead of just a flat background
  swap.
- Typography pass: sidebar title uses `tracking-tight`, section labels are
  bolder (`font-semibold`), conversation rows get a leading chat-bubble
  icon so the list reads less like plain text links.
- Replaced text-glyph affordances (`+`, `★ / ☆`, `×`) with a small
  dependency-free inline SVG icon set (new `frontend/src/components/
  icons.tsx`) for a more professional look: plus, search, pin, trash,
  chat-bubble icons.
- Search input now has a leading search icon instead of being bare text.

**Feature 2 — Improved chat input area** (`frontend/src/components/
MessageInput.tsx`):
- Input container is now `rounded-2xl` with tighter, more consistent
  internal padding and a subtle shadow.
- Auto-growing textarea behavior preserved and extended (max height raised
  slightly, from 200px to 220px, to fit a couple more lines comfortably
  before scrolling).
- Send button redesigned: icon-based (paper-plane SVG instead of the word
  "Send"), fixed 36×36 icon-button size, `framer-motion` scale animation
  on hover/tap, and a clearer enabled/disabled color contrast (signal
  amber when there's text to send, muted ink-800 otherwise).
- Added an attachment button (paperclip icon) and a voice-input button
  (mic icon) to the left/right of the textarea. Both are visual
  placeholders — clearly disabled with a "coming soon" tooltip — since
  there is no backend support for file uploads or speech-to-text yet.
  They are intentionally inert so the UI doesn't imply functionality that
  doesn't exist.
- New shared `IconButton` helper inside `MessageInput.tsx` for the
  attach/voice buttons, reusing the same icon set added for the sidebar.

**Not changed:** `ChatWindow.tsx`, `MessageRow.tsx`, `App.tsx`, all
backend code, WebSocket protocol, and API contracts. `MessageInput`'s
public props (`onSend`, `disabled`) are unchanged, so no call sites needed
updating.

Verified: `npm run build` (in `frontend/`) completes with no TypeScript
or build errors.

### Changed — Rename: Aadhya AI → Bunty AI

The application has been renamed from **Aadhya AI** to **Bunty AI**. This
was a text/identifier rename only — no behavior, schema, or API changes.

**Updated:**
- App display name (`Settings.app_name`) in `backend/app/core/config.py`
- Backend logger name: `"aadhya"` → `"bunty"` (`backend/app/main.py`)
- WebSocket system prompt persona name (`backend/app/routers/chat_ws.py`)
- SQLite database filename: `data/aadhya.db` → `data/bunty.db`
  (`backend/app/core/config.py`, `backend/.env.example`)
- Frontend `<title>` and app copy (`frontend/index.html`,
  `LoginScreen.tsx`, `Sidebar.tsx`, `MessageInput.tsx`, `MessageRow.tsx`)
- Frontend `package.json` name: `aadhya-ai-frontend` → `bunty-ai-frontend`
  (and `package-lock.json`)
- localStorage auth token key: `aadhya_token` → `bunty_token`
  (`frontend/src/lib/api.ts`)
- CSS component class prefix: `.prose-aadhya` → `.prose-bunty`
  (`frontend/src/index.css`, `frontend/src/components/Markdown.tsx`)
- Project root folder: `aadhya-ai/` → `bunty-ai/`
- All documentation: `README.md`, `ARCHITECTURE.md`, `BUILD_GUIDE.txt`

**Breaking / needs-action for existing local installs:**
- Any browser tab with an existing session will read a stale
  `aadhya_token` key that the app no longer looks for. Users will be
  redirected to the sign-in screen automatically (harmless) — no manual
  action required, but you can run
  `localStorage.removeItem('aadhya_token')` to clean up the orphaned key.
- The SQLite filename changed. Your existing `backend/data/aadhya.db` is
  **not** automatically migrated (renaming would risk touching a real
  user's data without consent). To keep existing users/conversations:
  ```bash
  mv backend/data/aadhya.db backend/data/bunty.db
  ```
  If you skip this, the app will simply create a fresh, empty
  `bunty.db` on next startup — bootstrapping the default admin account
  again.

No API routes, schemas, or environment variable *names* changed — only
the default *value* of `DATABASE_URL` in `.env.example`. If you have an
existing `backend/.env` (not `.env.example`), it still points at the old
filename and will keep working as-is unless you update it or move your
`.env` to match the new default.

---

## [0.1.0] — Phase 1 (baseline, pre-rename)

Initial local-first AI desktop assistant core, as "Aadhya AI":
- FastAPI backend, async SQLAlchemy + SQLite
- JWT-based auth (single-provider, username/password, bcrypt hashing)
- WebSocket streaming chat against a local Ollama model
- Provider abstraction (`app/providers/`) for swapping model backends
- React + TypeScript + Tailwind frontend, conversation sidebar with
  search/pin/delete, markdown + syntax-highlighted code rendering
