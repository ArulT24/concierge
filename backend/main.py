from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database.connection import dispose_engine, get_engine
from backend.logging_config import get_logger, setup_logging
from backend.routers.chat import router as chat_router
from backend.routers.pipeline import router as pipeline_router
from backend.routers.scrape_vendor import router as scrape_vendor_router
from backend.routers.search import router as search_router
from backend.routers.waitlist import router as waitlist_router
from backend.routers.whatsapp import router as whatsapp_router

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

_settings = get_settings()
_cors_origins: list[str] = (
    ["*"]
    if _settings.app_debug
    else [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat_router)
app.include_router(pipeline_router)
app.include_router(scrape_vendor_router)
app.include_router(search_router)
app.include_router(waitlist_router)
app.include_router(whatsapp_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
