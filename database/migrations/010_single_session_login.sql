-- Migration: 010_single_session_login
-- Adds active_session_token to users table to enforce one active login per user.
-- The token stored here is a short hash of the current JWT so we can invalidate
-- old sessions without storing the full token.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS active_session_token TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_session_at    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_session_device TEXT DEFAULT NULL;
