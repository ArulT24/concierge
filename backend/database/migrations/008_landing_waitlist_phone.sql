-- Add phone_number support to landing_waitlist.
-- phone_number: E.164-formatted number from Supabase Auth OTP sign-up.
-- email is made nullable so phone-only users can join without an email address.
-- A CHECK constraint ensures at least one of email or phone_number is always present.

ALTER TABLE landing_waitlist ALTER COLUMN email DROP NOT NULL;

ALTER TABLE landing_waitlist
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_landing_waitlist_email
  ON landing_waitlist (email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_landing_waitlist_phone_number
  ON landing_waitlist (phone_number)
  WHERE phone_number IS NOT NULL;

ALTER TABLE landing_waitlist
  ADD CONSTRAINT email_or_phone_required
  CHECK (email IS NOT NULL OR phone_number IS NOT NULL);
