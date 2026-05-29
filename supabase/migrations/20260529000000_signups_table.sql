-- Signups: waitlist + pre-approved testers for the private-preview alpha.
--
-- The landing-page form on subsounder.com inserts unknown emails as
-- 'waitlist' via /api/waitlist. An admin manually inserts 'pre_approved'
-- rows for friendly alpha testers, who are then forwarded to the login page
-- (email prepopulated) when they hit the landing form.
--
-- Emails are stored lowercased; the API normalizes on insert and lookup.

CREATE TABLE signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('waitlist', 'pre_approved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signups ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role (bypasses RLS) reads/writes this
-- table. There is no per-user scope; signups predate accounts.

COMMENT ON TABLE signups IS
  'Waitlist + pre-approved testers for the private-preview alpha. Admin '
  'inserts pre_approved rows manually; /api/waitlist inserts waitlist rows '
  'for unknown emails.';
