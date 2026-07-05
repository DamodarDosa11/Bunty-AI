"""
Read-only endpoints for discovering available providers/models and their
health, used by the frontend's model picker and status indicator.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.models import User
from app.providers.registry import get_active_provider

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)) -> dict:
    provider = get_active_provider()
    try:
        models = await provider.list_models()
    except Exception:  # noqa: BLE001 - surface as empty list, not a 500
        models = []
    return {"provider": provider.key, "models": models}


@router.get("/health")
async def health(current_user: User = Depends(get_current_user)) -> dict:
    provider = get_active_provider()
    ok = await provider.health_check()
    return {"provider": provider.key, "healthy": ok}
