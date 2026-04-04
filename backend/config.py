from __future__ import annotations

from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root (parent of `backend/`) so .env.local is found even if cwd is elsewhere.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_PROJECT_ROOT / ".env"),
            str(_PROJECT_ROOT / ".env.local"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────
    app_env: Environment = Environment.DEVELOPMENT
    app_debug: bool = False
    log_level: str = "INFO"

    # ── Postgres ─────────────────────────────────────
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://concierge:changeme@postgres:5432/concierge",
    )

    # ── Redis ────────────────────────────────────────
    redis_url: RedisDsn = Field(default="redis://redis:6379/0")

    # ── OpenAI ───────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # ── Anthropic (pipeline fit scoring) ─────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # ── Twilio / WhatsApp ────────────────────────────
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""

    # ── Vapi ─────────────────────────────────────────
    vapi_api_key: str = ""
    vapi_phone_number_id: str = ""

    # ── SerpAPI ──────────────────────────────────────
    serpapi_key: str = ""

    # ── Exa ───────────────────────────────────────────
    exa_api_key: str = ""

    # ── Browserbase ───────────────────────────────────
    browserbase_api_key: str = ""
    browserbase_project_id: str = ""

    # ── CORS ──────────────────────────────────────
    cors_origins: str = ""

    @property
    def sync_database_url(self) -> str:
        """Swap asyncpg driver for psycopg2 (Alembic, Celery, etc.)."""
        return str(self.database_url).replace(
            "postgresql+asyncpg", "postgresql+psycopg2"
        )

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION


@lru_cache
def get_settings() -> Settings:
    return Settings()
