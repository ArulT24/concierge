-- Add planning_interest to landing_waitlist for capturing the user's one-line use case.

ALTER TABLE landing_waitlist ADD COLUMN IF NOT EXISTS planning_interest TEXT;
