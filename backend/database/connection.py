from __future__ import annotations

import ssl as _ssl
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _build_connect_args(url: str) -> dict:
    """Enable SSL for hosted Postgres (Supabase, Neon, etc.)."""
    if "localhost" in url or "127.0.0.1" in url or "postgres:" in url.split("@")[-1].split("/")[0].split(":")[0]:
        return {}
    ctx = _ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = _ssl.CERT_NONE
    return {"ssl": ctx}


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        url = str(settings.database_url).split("?")[0]
        _engine = create_async_engine(
            url,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True,
            echo=settings.app_debug,
            connect_args=_build_connect_args(url),
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
        )
    return _session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency that yields a session and commits/rollbacks."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
