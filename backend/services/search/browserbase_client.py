"""Browserbase client for deep vendor page scraping (Phase B).

This module provides the interface for scraping individual vendor websites
using Browserbase's headless browser service. It is NOT used in Phase A --
the search pipeline works with Exa results only.
"""
from __future__ import annotations

from pydantic import BaseModel

from backend.logging_config import get_logger

logger = get_logger(__name__)


class VendorPageData(BaseModel):
    """Structured data extracted from a vendor's website."""

    url: str
    business_name: str = ""
    phone: str = ""
    address: str = ""
    pricing_info: str = ""
    hours: str = ""
    description: str = ""
    photos: list[str] = []
    scrape_success: bool = False


async def scrape_vendor_page(url: str) -> VendorPageData:
    """Scrape a vendor's website for enrichment data.

    Phase B implementation -- currently returns a stub.
    Will use Browserbase + Playwright for real scraping.
    """
    logger.info("browserbase scrape skipped (phase B)", url=url[:100])
    return VendorPageData(url=url, scrape_success=False)
