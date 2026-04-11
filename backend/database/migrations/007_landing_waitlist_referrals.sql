-- Add referral tracking columns to landing_waitlist.
-- referral_code: unique short code generated for each user on signup, used in their share link.
-- referred_by:   the referral_code of the user who referred this signup (nullable).
-- referral_count: how many confirmed signups have used this user's referral_code.

ALTER TABLE landing_waitlist
  ADD COLUMN IF NOT EXISTS referral_code  TEXT,
  ADD COLUMN IF NOT EXISTS referred_by    TEXT,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_landing_waitlist_referral_code
  ON landing_waitlist (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_landing_waitlist_referred_by
  ON landing_waitlist (referred_by)
  WHERE referred_by IS NOT NULL;
