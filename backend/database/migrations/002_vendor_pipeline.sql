-- Run manually against Supabase / Postgres (e.g. SQL editor) if upgrading an existing DB.
-- Adds pipeline phases to events and stores enriched + scored vendor candidates.

-- 1) Extend event_status (run each statement separately if your PG version requires it)
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'enriching';
ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'scoring';

-- 2) Candidate row lifecycle
DO $$ BEGIN
    CREATE TYPE vendor_candidate_stage AS ENUM (
        'shortlisted',
        'enriching',
        'enriched',
        'scoring',
        'scored',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3) Table
CREATE TABLE IF NOT EXISTS vendor_candidates (
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

CREATE INDEX IF NOT EXISTS idx_vendor_candidates_event_id ON vendor_candidates (event_id);
CREATE INDEX IF NOT EXISTS idx_vendor_candidates_stage ON vendor_candidates (stage);
