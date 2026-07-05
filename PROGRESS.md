# PROGRESS.md

Tracks status against the full roadmap requested for Bunty AI (formerly
Aadhya AI). Existing Phase 1 functionality (streaming chat, conversations,
basic JWT auth, SQLite persistence) is preserved and untouched except
where noted below.

## Completed

### ✅ Rename: Aadhya AI → Bunty AI
Full rename across backend, frontend, docs, config, and the project
folder itself. Zero remaining references to "Aadhya" anywhere in the
codebase (verified by grep). Details in `CHANGELOG.md`.

No functional/behavioral changes — this was purely identifiers and copy.

## Not started (planned, in requested order)

These are large, independent modules. Each will be built, tested, and
documented (README/BUILD_GUIDE/CHANGELOG) fully before moving to the
next, per your "complete one module before starting another" instruction.

1. **Feature 1 — Authentication overhaul**
   Current state: single hardcoded local-admin-bootstrap + username/password
   JWT login only (`backend/app/routers/auth.py`, `core/security.py`).
   No Google Sign-In, no forgot-password, no remember-me, no session
   management beyond a JWT expiry, no user profile beyond username/role.
   Needs: pluggable auth-provider architecture, Google OAuth, email
   verification/reset flow (needs an email-sending mechanism — will need
   to ask you for an SMTP/transactional-email provider choice), refresh
   tokens or persisted sessions for "remember me", basic profile fields.

2. **Feature 2 — Connector framework** (Gmail, Drive, Calendar, GitHub)
   Nothing exists yet. Needs a new `backend/app/connectors/` package with
   a base `Connector` interface (mirroring the existing
   `app/providers/base.py` pattern already used for LLM providers — good
   precedent to extend), OAuth flows per provider, a connections table,
   background sync (needs a task runner — will ask you APScheduler vs.
   Celery/Redis vs. simple asyncio background tasks, since Phase 1 has no
   task queue at all).

3. **Feature 3 — Projects system**
   Nothing exists yet. Needs new DB models (Project, ProjectFile,
   ProjectNote), a project_id FK on Conversation, new routers, and
   frontend UI (project switcher, file upload, notes panel).

4. **Feature 4 — Memory (short/long-term, embeddings, semantic search)**
   Nothing exists yet. Needs an embeddings provider decision (local via
   Ollama's embedding models to stay consistent with the local-first
   design, vs. a hosted API — will ask you), a vector store decision
   (sqlite-vec/pgvector-style extension vs. a dedicated library like
   Chroma), and new memory tables + retrieval logic wired into the chat
   pipeline.

5. **Feature 5 — Architecture review pass**
   Deferred until after 1–4 exist, since "architecture" here means
   organizing the *larger* system (connectors, projects, memory) well —
   doing it now would mean re-doing it after each feature lands.

6. **Feature 6 — Full documentation refresh**
   INSTALL.md, DEPENDENCIES.md, SECURITY.md don't exist yet (only
   README.md, BUILD_GUIDE.txt, ARCHITECTURE.md do). Will create these
   alongside their corresponding feature (e.g. SECURITY.md lands with
   Feature 1, DEPENDENCIES.md lands as new packages are actually added
   rather than upfront).

## Next files to modify (Feature 1, when you're ready to start)

- `backend/app/core/security.py` — add refresh-token support alongside
  existing `create_access_token`/`decode_access_token`
- `backend/app/db/models.py` — extend `User` (email, is_verified,
  auth_provider, avatar_url) + new `PasswordResetToken` /
  `RefreshToken` tables
- `backend/app/routers/auth.py` — add `/forgot-password`,
  `/reset-password`, `/google`, `/google/callback`, `/logout`,
  `/refresh` endpoints
- `backend/app/core/config.py` — add `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, SMTP settings
- New: `backend/app/auth_providers/` package (base interface +
  `password_provider.py` + `google_provider.py`) so the "modular, more
  providers later" requirement is structural, not incidental
- Frontend: `LoginScreen.tsx` gets a "Continue with Google" button +
  "Forgot password?" link; new `RegisterScreen.tsx`,
  `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`,
  `ProfileSettings.tsx`

## Before I start Feature 1, I need from you

- Google OAuth: do you already have a Google Cloud project / OAuth
  client ID+secret, or should the guide walk you through creating one?
- Email delivery for password reset: which provider (SendGrid, SES,
  Postmark, Resend, plain SMTP)? Phase 1 has no email-sending capability
  at all today.
- Confirm SQLite is fine to keep as the datastore through these
  features, or if you want to move to Postgres now (connectors + memory
  + projects will each add real relational load; SQLite works but you
  said "scalability" is a goal).
