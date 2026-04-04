"""Vendor website enrichment via Browserbase + Playwright (remote browser).

Loads each URL in a Browserbase session, then extracts contact signals from HTML
and JSON-LD. Falls back to ``/contact`` when the homepage is thin.
"""
from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from browserbase import Browserbase
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from backend.config import get_settings
from backend.logging_config import get_logger

logger = get_logger(__name__)

# US-centric phone pattern; catches many common formats
_PHONE_RE = re.compile(
    r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
)
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+"
)


class VendorPageData(BaseModel):
    """Structured data extracted from a vendor's website."""

    url: str
    business_name: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    pricing_info: str = ""
    hours: str = ""
    description: str = ""
    photos: list[str] = Field(default_factory=list)
    scrape_success: bool = False
    error: str = ""


def _first_match(pattern: re.Pattern[str], text: str) -> str:
    m = pattern.search(text)
    return m.group(0).strip() if m else ""


def _mailto_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.lower().startswith("mailto:"):
            addr = href[7:].split("?")[0].strip()
            if addr:
                return addr
    return ""


def _json_ld_business(blob: dict[str, Any]) -> dict[str, str]:
    """Pull common LocalBusiness-style fields from one JSON-LD object."""
    out: dict[str, str] = {}

    name = blob.get("name")
    if isinstance(name, str) and name.strip():
        out["name"] = name.strip()

    phone = blob.get("telephone") or blob.get("phone")
    if isinstance(phone, str) and phone.strip():
        out["phone"] = phone.strip()
    elif isinstance(phone, list) and phone:
        p0 = phone[0]
        if isinstance(p0, str) and p0.strip():
            out["phone"] = p0.strip()

    email = blob.get("email")
    if isinstance(email, str) and email.strip():
        out["email"] = email.strip()

    addr = blob.get("address")
    if isinstance(addr, dict):
        parts = [
            addr.get("streetAddress"),
            addr.get("addressLocality"),
            addr.get("addressRegion"),
            addr.get("postalCode"),
        ]
        line = ", ".join(p for p in parts if isinstance(p, str) and p.strip())
        if line:
            out["address"] = line
    elif isinstance(addr, str) and addr.strip():
        out["address"] = addr.strip()

    desc = blob.get("description")
    if isinstance(desc, str) and desc.strip():
        out["description"] = desc.strip()[:2000]

    return out


def _extract_from_ld_json(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    merged: dict[str, str] = {}
    for script in soup.find_all("script", type="application/ld+json"):
        raw = script.string or script.get_text() or ""
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        candidates: list[dict[str, Any]] = []
        if isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                candidates.extend(x for x in data["@graph"] if isinstance(x, dict))
            else:
                candidates.append(data)
        elif isinstance(data, list):
            candidates.extend(x for x in data if isinstance(x, dict))

        for blob in candidates:
            part = _json_ld_business(blob)
            for k, v in part.items():
                if v and (k not in merged or len(v) > len(merged.get(k, ""))):
                    merged[k] = v
    return merged


def _extract_from_html(html: str, page_url: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    meta_desc = ""
    md = soup.find("meta", attrs={"name": "description"})
    if md and md.get("content"):
        meta_desc = md["content"].strip()

    text = soup.get_text(" ", strip=True)
    phone = _first_match(_PHONE_RE, text)
    email = _mailto_from_html(html)
    if not email:
        em = _first_match(_EMAIL_RE, text)
        # avoid image filenames
        if em and not em.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
            email = em

    ld = _extract_from_ld_json(html)
    if ld.get("name") and not title:
        title = ld["name"]
    if ld.get("phone"):
        phone = phone or ld["phone"]
    if ld.get("email"):
        email = email or ld["email"]
    address = ld.get("address", "")
    description = ld.get("description") or meta_desc

    og = soup.find("meta", property="og:image")
    photos: list[str] = []
    if og and og.get("content"):
        src = og["content"].strip()
        if src.startswith("http"):
            photos.append(src)
        elif src:
            photos.append(urljoin(page_url, src))

    return {
        "business_name": title,
        "phone": phone,
        "email": email,
        "address": address,
        "description": (description or "")[:2000],
        "photos": photos,
    }


def _scrape_url_with_page(page, url: str) -> dict[str, str]:
    page.goto(url, timeout=35_000, wait_until="domcontentloaded")
    html = page.content()
    return _extract_from_html(html, page.url)


def _merge_extraction(into: dict[str, Any], new: dict[str, Any]) -> None:
    for key in ("business_name", "phone", "email", "address", "description"):
        v = new.get(key)
        if isinstance(v, str) and v.strip() and not (into.get(key) or "").strip():
            into[key] = v.strip()
    new_photos = new.get("photos") or []
    if isinstance(new_photos, list):
        bucket = into.setdefault("photos", [])
        if isinstance(bucket, list):
            for p in new_photos:
                if isinstance(p, str) and p and p not in bucket:
                    bucket.append(p)


def scrape_vendor_page_sync(url: str) -> VendorPageData:
    """Blocking: open ``url`` in Browserbase and extract vendor fields."""
    settings = get_settings()
    if not settings.browserbase_api_key:
        logger.warning("browserbase scrape skipped: BROWSERBASE_API_KEY not set")
        return VendorPageData(url=url, scrape_success=False, error="missing_api_key")

    if not url or not urlparse(url).scheme.startswith("http"):
        return VendorPageData(url=url, scrape_success=False, error="invalid_url")

    bb = Browserbase(api_key=settings.browserbase_api_key)
    create_kwargs: dict[str, Any] = {}
    if settings.browserbase_project_id:
        create_kwargs["project_id"] = settings.browserbase_project_id

    session = bb.sessions.create(**create_kwargs)
    merged: dict[str, Any] = {
        "business_name": "",
        "phone": "",
        "email": "",
        "address": "",
        "description": "",
        "photos": [],
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.connect_over_cdp(session.connect_url)
            context = browser.contexts[0]
            page = context.pages[0]
            try:
                data = _scrape_url_with_page(page, url)
                _merge_extraction(merged, data)

                # Thin contact signals → try /contact
                if not merged["phone"] and not merged["email"]:
                    contact_url = urljoin(url, "/contact")
                    if contact_url.rstrip("/") != url.rstrip("/"):
                        try:
                            extra = _scrape_url_with_page(page, contact_url)
                            _merge_extraction(merged, extra)
                        except Exception as exc:
                            logger.debug(
                                "contact page scrape failed",
                                url=contact_url[:120],
                                error=str(exc),
                            )
            finally:
                page.close()
                browser.close()

        # True when we extracted contact/location signals (not just a generic <title>)
        success = bool(merged["phone"] or merged["email"] or merged["address"])
        return VendorPageData(
            url=url,
            business_name=merged.get("business_name", ""),
            phone=merged.get("phone", ""),
            email=merged.get("email", ""),
            address=merged.get("address", ""),
            description=merged.get("description", ""),
            photos=list(merged.get("photos") or []),
            scrape_success=success,
        )
    except Exception as exc:
        logger.error("browserbase scrape failed", url=url[:100], error=str(exc))
        return VendorPageData(
            url=url,
            scrape_success=False,
            error=str(exc)[:500],
        )


async def scrape_vendor_page(url: str) -> VendorPageData:
    """Scrape a vendor website via Browserbase (runs sync client in a thread pool)."""
    return await asyncio.to_thread(scrape_vendor_page_sync, url)
