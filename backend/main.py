from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database.connection import dispose_engine, get_engine
from backend.logging_config import get_logger, setup_logging
from backend.routers.chat import router as chat_router

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info(
        "starting concierge",
        env=settings.app_env.value,
        debug=settings.app_debug,
    )
    get_engine()
    logger.info("database pool initialized")
    yield
    await dispose_engine()
    logger.info("shutting down concierge")


app = FastAPI(
    title="Concierge",
    description="AI event planning agent — WhatsApp interface",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if get_settings().app_debug else [],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
