"""
Application configuration.

All runtime configuration is centralized here and loaded from environment
variables (or a local .env file). Nothing in this module should be hardcoded
that a deployer would need to change -- see BUILD_GUIDE.txt for the full list
of variables and where to set them.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- General ---
    app_name: str = "Bunty AI"
    environment: str = "development"
    debug: bool = True

    # --- Server ---
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # --- Database ---
    database_url: str = f"sqlite+aiosqlite:///{DATA_DIR / 'bunty.db'}"

    # --- Auth ---
    # IMPORTANT: override via .env in any non-local deployment. See SECURITY.md.
    secret_key: str = "dev-secret-key-change-me-in-env-file"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    jwt_algorithm: str = "HS256"

    # --- Default admin bootstrap (single-user local mode) ---
    default_admin_username: str = "admin"
    default_admin_password: str = "changeme123"

    # --- Ollama provider ---
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "mistral"
    ollama_request_timeout_seconds: float = 120.0

    # --- Active provider ---
    # Switching providers is a config change: set this to another registered
    # provider key (e.g. "openai") once that provider is implemented.
    active_provider: str = "ollama"


@lru_cache
def get_settings() -> Settings:
    return Settings()
