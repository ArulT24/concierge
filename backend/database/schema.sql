CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────

CREATE TYPE event_status AS ENUM (
    'intake',
    'planning',
    'researching',
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

-- ── Events ──────────────────────────────────────────

CREATE TABLE events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone    TEXT        NOT NULL,
    email         TEXT,
    city          TEXT,
    event_type    TEXT        NOT NULL DEFAULT 'birthday_party',
    status        event_status NOT NULL DEFAULT 'intake',
    requirements  JSONB       NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_phone ON events (user_phone);
CREATE INDEX idx_events_status     ON events (status);

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
