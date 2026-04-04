"""Dev-only HTTP API to try Browserbase vendor scraping from the Next test UI."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from backend.config import get_settings
from backend.services.search.browserbase_client import (
    VendorPageData,
    scrape_vendor_page,
)

router = APIRouter(prefix="/api/scrape-vendor", tags=["scrape-vendor"])


class ScrapeVendorRequest(BaseModel):
    url: HttpUrl = Field(description="Vendor website URL to scrape")


@router.post("", response_model=VendorPageData)
async def scrape_vendor(body: ScrapeVendorRequest) -> VendorPageData:
    """Run Browserbase + Playwright enrichment on a single URL.

    Disabled in production (``APP_DEBUG=false``) to avoid open proxy abuse.
    """
    settings = get_settings()
    if not settings.app_debug:
        raise HTTPException(
            status_code=403,
            detail="Vendor scrape API is only available when APP_DEBUG=true.",
        )
    if not settings.browserbase_api_key:
        raise HTTPException(
            status_code=503,
            detail="BROWSERBASE_API_KEY is not configured.",
        )

    return await scrape_vendor_page(str(body.url))
