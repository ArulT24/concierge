"""Anthropic-based fit score for one vendor vs party requirements (MVP)."""

from __future__ import annotations

import json
import re
from typing import Any

from backend.config import get_settings
from backend.logging_config import get_logger

logger = get_logger(__name__)

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```")


def score_vendor_fit_sync(
    requirements: dict[str, Any],
    *,
    category: str,
    exa_name: str,
    exa_description: str,
    exa_score: float | None,
    enrichment: dict[str, Any],
) -> dict[str, Any]:
    """Return dict with fit_score (0–100), rationale, pros, cons; or error key."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return {
            "fit_score": None,
            "rationale": "ANTHROPIC_API_KEY not set — skipping LLM scoring.",
            "pros": [],
            "cons": [],
            "skipped": True,
        }

    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    req_lines = []
    if isinstance(requirements, dict):
        for k, v in requirements.items():
            if v is not None and str(v).strip():
                req_lines.append(f"- {k}: {v}")
    req_block = "\n".join(req_lines) if req_lines else "(no structured requirements)"

    enrich_lines = json.dumps(enrichment, indent=2)[:6000]

    prompt = f"""You are helping rank vendors for a kids birthday party.

## Party requirements (ground truth)
{req_block}

## Vendor category
{category}

## Exa discovery snippet
- Name: {exa_name}
- Description: {exa_description[:1200]}
- Exa relevance score (0-1 scale if present): {exa_score}

## Data scraped from the vendor website (may be partial)
```json
{enrich_lines}
```

Task: Score how good a *fit* this vendor is for THIS party (not generic quality).
Output **only** valid JSON (no markdown) with this shape:
{{
  "fit_score": <integer 0-100>,
  "rationale": "<2-4 sentences, specific to this party>",
  "pros": ["<short bullet>", "..."],
  "cons": ["<short bullet>", "..."]
}}
Rules: If contact info is missing (no phone and no email), cap fit_score at 55 unless the site clearly offers another strong booking path mentioned in enrichment.
"""

    try:
        msg = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        block = msg.content[0]
        text = block.text if hasattr(block, "text") else str(block)
        text = text.strip()
        m = _JSON_FENCE.search(text)
        if m:
            text = m.group(1).strip()
        data = json.loads(text)
        fit = data.get("fit_score")
        if isinstance(fit, (int, float)):
            fit_f = max(0.0, min(100.0, float(fit)))
        else:
            fit_f = 50.0
        return {
            "fit_score": fit_f,
            "rationale": str(data.get("rationale", ""))[:4000],
            "pros": data.get("pros") if isinstance(data.get("pros"), list) else [],
            "cons": data.get("cons") if isinstance(data.get("cons"), list) else [],
            "skipped": False,
        }
    except Exception as exc:
        logger.error("anthropic scoring failed", error=str(exc))
        return {
            "fit_score": None,
            "rationale": f"Scoring error: {exc!s}"[:2000],
            "pros": [],
            "cons": [],
            "skipped": True,
            "error": str(exc),
        }
