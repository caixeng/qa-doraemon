-- ============================================================================
-- Migration 028: Account hygiene
--
-- 1. users.must_change_password — set true when an account is provisioned
--    with a generated password; the frontend blocks the app behind a
--    change-password screen until the user picks their own.
-- 2. Drop create_parent_account_by_phone: no frontend caller exists, and it
--    INSERTs directly into auth.users with a hardcoded '123456' password —
--    the exact pattern that caused the NULL-token 500s fixed in migration
--    017. Parent accounts, when needed, must go through an Edge Function
--    using the Admin API (like create-staff-account).
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.create_parent_account_by_phone(uuid);
