from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent

SYSTEM_PROMPT = """\
You are a search query optimizer for Exa, an AI-powered web search engine.

Exa works best with **natural language descriptions of ideal results**, NOT keyword queries.

Your job: take rough search queries (Google Maps / Yelp style) plus event context, \
and rewrite them into 2-4 Exa-optimized queries that will surface the best vendor \
options for a kids' birthday party.

### Guidelines
- Write each query as a complete sentence describing the ideal search result.
- Include the city/zip, child's age, theme, guest count, and budget when relevant.
- Vary angles across queries: e.g. for venues, try one for dedicated party venues, \
  one for restaurants with party rooms, one for parks/community centers.
- For cake, try one for custom bakeries and one for grocery store bakery options.
- For entertainment, try one for performers and one for activity providers.
- For decorations, search for party supply stores and online retailers.
- Keep queries specific but not so narrow they return nothing.
- Pick search_type: "auto" for most categories, "deep" only for obscure requests.

### Example
Category: venue
Raw queries: ["indoor kids birthday venue near 94105", "party venue SF 20 guests"]
Context: child_age=6, theme=dinosaur, budget=$300-$500, guest_count=20

Output queries:
- "A kids birthday party venue in San Francisco 94105 that has indoor space for \
   at least 20 children around age 6, ideally dinosaur or adventure themed"
- "Restaurant in San Francisco with a private party room for kids birthday parties, \
   accommodating 20 guests, budget-friendly under $500"
- "Community center or recreation space near 94105 that rents rooms for children's \
   birthday parties"
"""


class FormattedQueries(BaseModel):
    """Exa-optimized search queries for a single vendor category."""

    queries: list[str] = Field(
        min_length=1,
        max_length=5,
        description="Exa-optimized natural language search queries",
    )
    search_type: Literal["auto", "fast", "deep"] = Field(
        default="auto",
        description="Exa search type: auto for most, deep for obscure requests",
    )


class QueryFormatterAgent(BaseAgent[FormattedQueries]):

    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    @property
    def output_model(self) -> type[FormattedQueries]:
        return FormattedQueries

    @property
    def temperature(self) -> float:
        return 0.6

    async def format_queries(
        self,
        category: str,
        raw_queries: list[str],
        requirements: dict,
    ) -> FormattedQueries:
        context_parts = []
        if requirements.get("child_age"):
            context_parts.append(f"child_age={requirements['child_age']}")
        if requirements.get("theme"):
            context_parts.append(f"theme={requirements['theme']}")
        if requirements.get("guest_count"):
            context_parts.append(f"guest_count={requirements['guest_count']}")
        if requirements.get("zip_code"):
            context_parts.append(f"zip_code={requirements['zip_code']}")
        if requirements.get("budget_low") or requirements.get("budget_high"):
            low = requirements.get("budget_low", "?")
            high = requirements.get("budget_high", "?")
            context_parts.append(f"budget=${low}-${high}")
        if requirements.get("venue_preferences"):
            context_parts.append(f"venue_preferences={requirements['venue_preferences']}")
        if requirements.get("food_preferences"):
            context_parts.append(f"food_preferences={requirements['food_preferences']}")
        if requirements.get("entertainment_preferences"):
            context_parts.append(f"entertainment_preferences={requirements['entertainment_preferences']}")
        if requirements.get("decoration_preferences"):
            context_parts.append(f"decoration_preferences={requirements['decoration_preferences']}")

        context_str = ", ".join(context_parts) if context_parts else "no additional context"

        messages = [
            {
                "role": "user",
                "content": (
                    f"Category: {category}\n"
                    f"Raw queries: {raw_queries}\n"
                    f"Context: {context_str}\n\n"
                    "Rewrite these into Exa-optimized natural language queries."
                ),
            }
        ]

        return await super().run(messages)
