from __future__ import annotations

from pydantic import BaseModel, Field

from backend.agents.base_agent import BaseAgent
from backend.models.vendor import VendorCategory

SYSTEM_PROMPT = """\
You are an event planning strategist. Given a set of party requirements, you \
produce a concrete research plan with parallel tasks for finding vendors.

For each vendor category (venue, entertainment, cake, decoration), generate:

1. **search_queries**: 2-3 Google Maps / Yelp search queries tailored to the \
   event. Include the location, age-appropriateness, theme, and budget context. \
   Example: "indoor kids birthday party venue near 94105 for 20 guests"

2. **call_script_notes**: Key questions the voice AI should ask when calling \
   this type of vendor. Be specific to the category:
   - Venue: availability on the date, capacity, pricing for the age group, \
     included amenities, food policy
   - Entertainment: availability, age-appropriate acts, pricing, duration, \
     space requirements
   - Cake: order lead time, flavors, dietary accommodations, pricing per \
     serving, delivery
   - Decoration: not applicable (no calls — we build a shopping cart instead)

3. **priority**: Rank from 1 (most important) to 4. Venue is almost always 1 \
   because it constrains everything else. Decorations are typically 4.

Also produce a short **summary** (1-2 sentences) of the plan that can be sent \
to the parent so they know what's happening.

Output exactly 4 tasks, one per category. Tailor everything to the specific \
child's age, theme, guest count, budget, and location.
"""


class ResearchTask(BaseModel):
    """A single vendor research task to be executed in parallel."""

    category: VendorCategory
    search_queries: list[str] = Field(
        description="Google Maps / Yelp search queries for this vendor type"
    )
    call_script_notes: str = Field(
        description="Key questions for the automated voice call to this vendor type"
    )
    priority: int = Field(ge=1, le=4, description="1=highest priority")


class ResearchPlan(BaseModel):
    """Complete research plan decomposed from event requirements."""

    tasks: list[ResearchTask] = Field(
        description="Exactly 4 tasks, one per vendor category"
    )
    summary: str = Field(
        description="Short summary of the plan to send to the parent"
    )


class PlanningAgent(BaseAgent[ResearchPlan]):

    @property
    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    @property
    def output_model(self) -> type[ResearchPlan]:
        return ResearchPlan

    @property
    def temperature(self) -> float:
        return 0.5
