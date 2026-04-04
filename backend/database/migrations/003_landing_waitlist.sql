-- Landing page waitlist signups (email only). Run against Postgres / Supabase when upgrading.

CREATE TABLE IF NOT EXISTS landing_waitlist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_landing_waitlist_email ON landing_waitlist (email);
