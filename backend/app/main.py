"""
Bunty AI backend entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000

On startup this creates the SQLite database (if missing) and bootstraps a
default admin user for local single-user use. See BUILD_GUIDE.txt.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.models import User
from app.db.session import AsyncSessionLocal, init_db
from app.routers import auth, chat_ws, conversations, files, providers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bunty")

settings = get_settings()


async def _bootstrap_default_admin() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == settings.default_admin_username))
        if result.scalar_one_or_none() is not None:
            return
        admin = User(
            username=settings.default_admin_username,
            hashed_password=hash_password(settings.default_admin_password),
            role="admin",
        )
        db.add(admin)
        await db.commit()
        logger.info(
            "Bootstrapped default admin user '%s'. Change the password after first login.",
            settings.default_admin_username,
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _bootstrap_default_admin()
    logger.info("%s backend ready on provider '%s'", settings.app_name, settings.active_provider)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(conversations.router)
app.include_router(providers.router)
app.include_router(files.router)
app.include_router(chat_ws.router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "app": settings.app_name}