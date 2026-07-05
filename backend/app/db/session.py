"""
Async database engine and session factory.

SQLite is the default (see app.core.config.Settings.database_url). Swapping
to PostgreSQL only requires changing DATABASE_URL to an asyncpg DSN, e.g.
postgresql+asyncpg://user:pass@host/dbname -- no code changes needed here.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create all tables. Called once on application startup.

    For anything beyond local/dev use, replace this with Alembic migrations
    (see DATABASE_SCHEMA.md for the migration plan)."""
    # Import models so they're registered on Base.metadata before create_all.
    from app.db import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
