-- Add structured intake columns to landing_waitlist.
-- event_category stores the discrete bucket (birthday, vacation, celebration, holiday, other).
-- intake_answers stores the per-question answers as JSONB for queryability.

ALTER TABLE landing_waitlist
  ADD COLUMN IF NOT EXISTS event_category TEXT,
  ADD COLUMN IF NOT EXISTS intake_answers  JSONB;

CREATE INDEX IF NOT EXISTS idx_landing_waitlist_event_category
  ON landing_waitlist (event_category);
