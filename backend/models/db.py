from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class EventRow(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_phone: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(
        Text, nullable=False, default="birthday_party"
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "intake",
            "planning",
            "researching",
            "enriching",
            "scoring",
            "ready",
            "archived",
            name="event_status",
            create_type=False,
        ),
        nullable=False,
        default="intake",
        index=True,
    )
    requirements: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    planning_interest_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    planning_interest_category: Mapped[str | None] = mapped_column(Text, nullable=True)
    waitlist_survey_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    messages: Mapped[list[MessageRow]] = relationship(back_populates="event")
    vendor_searches: Mapped[list[VendorSearchRow]] = relationship(
        back_populates="event"
    )
    vendor_candidates: Mapped[list["VendorCandidateRow"]] = relationship(
        back_populates="event"
    )
    vendor_calls: Mapped[list[VendorCallRow]] = relationship(back_populates="event")
    event_options: Mapped[list[EventOptionRow]] = relationship(back_populates="event")


class MessageRow(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    direction: Mapped[str] = mapped_column(
        Enum("inbound", "outbound", name="message_direction", create_type=False),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sid: Mapped[str | None] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    event: Mapped[EventRow] = relationship(back_populates="messages")

    __table_args__ = (Index("idx_messages_event_id", "event_id"),)


class VendorSearchRow(Base):
    __tablename__ = "vendor_searches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(
        Enum(
            "venue", "entertainment", "cake", "decoration",
            name="vendor_category",
            create_type=False,
        ),
        nullable=False,
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    results: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    event: Mapped[EventRow] = relationship(back_populates="vendor_searches")

    __table_args__ = (Index("idx_vendor_searches_event_id", "event_id"),)


class VendorCandidateRow(Base):
    __tablename__ = "vendor_candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(
        Enum(
            "venue",
            "entertainment",
            "cake",
            "decoration",
            name="vendor_category",
            create_type=False,
        ),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    exa_name: Mapped[str] = mapped_column(Text, nullable=False, default="")
    exa_description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    exa_score: Mapped[float | None] = mapped_column(nullable=True)
    stage: Mapped[str] = mapped_column(
        Enum(
            "shortlisted",
            "enriching",
            "enriched",
            "scoring",
            "scored",
            "failed",
            name="vendor_candidate_stage",
            create_type=False,
        ),
        nullable=False,
        default="shortlisted",
    )
    enrichment: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    fit_score: Mapped[float | None] = mapped_column(nullable=True)
    fit_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    scoring_meta: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    display_rank: Mapped[int | None] = mapped_column(nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    event: Mapped[EventRow] = relationship(back_populates="vendor_candidates")

    __table_args__ = (
        Index("idx_vendor_candidates_event_id", "event_id"),
        Index("idx_vendor_candidates_stage", "stage"),
    )


class VendorCallRow(Base):
    __tablename__ = "vendor_calls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    vendor_name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        Enum(
            "venue", "entertainment", "cake", "decoration",
            name="vendor_category",
            create_type=False,
        ),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "pending", "in_progress", "completed", "failed",
            name="call_status",
            create_type=False,
        ),
        nullable=False,
        default="pending",
    )
    vapi_call_id: Mapped[str | None] = mapped_column(Text)
    transcript: Mapped[str | None] = mapped_column(Text)
    extracted_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    call_duration: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    event: Mapped[EventRow] = relationship(back_populates="vendor_calls")

    __table_args__ = (
        Index("idx_vendor_calls_event_id", "event_id"),
        Index("idx_vendor_calls_status", "status"),
    )


class EventOptionRow(Base):
    __tablename__ = "event_options"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(
        Enum(
            "venue", "entertainment", "cake", "decoration",
            name="vendor_category",
            create_type=False,
        ),
        nullable=False,
    )
    options_summary: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    event: Mapped[EventRow] = relationship(back_populates="event_options")

    __table_args__ = (Index("idx_event_options_event_id", "event_id"),)


class PartyPlanningAccessRow(Base):
    __tablename__ = "party_planning_access"

    email: Mapped[str] = mapped_column(Text, primary_key=True)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LandingWaitlistRow(Base):
    __tablename__ = "landing_waitlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    planning_interest: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
