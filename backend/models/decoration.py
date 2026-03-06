from __future__ import annotations

from pydantic import BaseModel, Field


class DecorationItem(BaseModel):
    """Single decoration product."""

    name: str
    description: str = ""
    url: str = ""
    image_url: str = ""
    price: float | None = None
    quantity: int = 1
    source: str = "amazon"


class DecorationCart(BaseModel):
    """Shopping cart of decoration items for a theme."""

    theme: str
    items: list[DecorationItem] = Field(default_factory=list)
    estimated_total: float = 0.0

    def recalculate_total(self) -> None:
        self.estimated_total = sum(
            (item.price or 0) * item.quantity for item in self.items
        )
