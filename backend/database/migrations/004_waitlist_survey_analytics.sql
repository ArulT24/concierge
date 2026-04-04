-- Waitlist survey intent + party intake access gate

CREATE TABLE IF NOT EXISTS party_planning_access (
    email        TEXT PRIMARY KEY,
    granted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS planning_interest_raw TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS planning_interest_category TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS waitlist_survey_completed_at TIMESTAMPTZ;
