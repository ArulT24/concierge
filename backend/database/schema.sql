CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────

CREATE TYPE event_status AS ENUM (
    'intake',
    'planning',
    'researching',
    'enriching',
    'scoring',
    'ready',
    'archived'
);

CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE vendor_category AS ENUM (
    'venue',
    'entertainment',
    'cake',
    'decoration'
);

CREATE TYPE call_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed'
);

CREATE TYPE vendor_candidate_stage AS ENUM (
    'shortlisted',
    'enriching',
    'enriched',
    'scoring',
    'scored',
    'failed'
);

-- ── Events ──────────────────────────────────────────

CREATE TABLE events (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone                    TEXT        NOT NULL,
    email                         TEXT,
    city                          TEXT,
    event_type                    TEXT        NOT NULL DEFAULT 'birthday_party',
    status                        event_status NOT NULL DEFAULT 'intake',
    requirements                  JSONB       NOT NULL DEFAULT '{}',
    planning_interest_raw         TEXT,
    planning_interest_category    TEXT,
    waitlist_survey_completed_at  TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_phone ON events (user_phone);
CREATE INDEX idx_events_status     ON events (status);

-- ── Party planning access (web /chat — kids intake) ───

CREATE TABLE party_planning_access (
    email      TEXT PRIMARY KEY,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Messages ────────────────────────────────────────

CREATE TABLE messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID              NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    direction  message_direction NOT NULL,
    content    TEXT              NOT NULL,
    sid        TEXT UNIQUE,
    created_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_event_id ON messages (event_id);

-- ── Vendor searches ─────────────────────────────────

CREATE TABLE vendor_searches (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category   vendor_category NOT NULL,
    query      TEXT            NOT NULL,
    results    JSONB           NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_searches_event_id ON vendor_searches (event_id);

-- ── Vendor calls ────────────────────────────────────

CREATE TABLE vendor_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    vendor_name     TEXT            NOT NULL,
    phone           TEXT            NOT NULL,
    category        vendor_category NOT NULL,
    status          call_status     NOT NULL DEFAULT 'pending',
    vapi_call_id    TEXT,
    transcript      TEXT,
    extracted_data  JSONB           NOT NULL DEFAULT '{}',
    call_duration   INTEGER,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_calls_event_id ON vendor_calls (event_id);
CREATE INDEX idx_vendor_calls_status   ON vendor_calls (status);

-- ── Event options (final compiled results) ──────────

CREATE TABLE event_options (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID            NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category        vendor_category NOT NULL,
    options_summary JSONB           NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_options_event_id ON event_options (event_id);

-- ── Landing waitlist (marketing signups) ───────────

CREATE TABLE landing_waitlist (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT        NOT NULL,
    planning_interest   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_landing_waitlist_email ON landing_waitlist (email);
-- ── Vendor candidates (Exa → enrich → score pipeline) ─

CREATE TABLE vendor_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category        vendor_category NOT NULL,
    url             TEXT NOT NULL,
    exa_name        TEXT NOT NULL DEFAULT '',
    exa_description TEXT NOT NULL DEFAULT '',
    exa_score       DOUBLE PRECISION,
    stage           vendor_candidate_stage NOT NULL DEFAULT 'shortlisted',
    enrichment      JSONB NOT NULL DEFAULT '{}',
    fit_score       DOUBLE PRECISION,
    fit_rationale   TEXT,
    scoring_meta    JSONB NOT NULL DEFAULT '{}',
    display_rank    INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_vendor_candidates_event_category_url UNIQUE (event_id, category, url)
);

CREATE INDEX idx_vendor_candidates_event_id ON vendor_candidates (event_id);
CREATE INDEX idx_vendor_candidates_stage ON vendor_candidates (stage);

-- ── Updated-at trigger ──────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vendor_calls_updated_at
    BEFORE UPDATE ON vendor_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
