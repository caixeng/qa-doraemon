-- ============================================================================
-- Migration 017: Fix NULL auth token columns (GoTrue "Database error querying
-- schema" bug)
--
-- Some auth.users rows had NULL instead of '' in confirmation_token,
-- email_change, recovery_token, etc. GoTrue scans these into non-nullable Go
-- strings, so any affected user got a 500 "Database error querying schema" on
-- every login attempt. Backfill the existing rows now, and expose a
-- SECURITY DEFINER function the create-staff-account Edge Function calls
-- right after creating each new user, since we cannot ALTER the auth.users
-- column defaults directly (that table is owned by Supabase's internal role).
-- ============================================================================

UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token = COALESCE(recovery_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR recovery_token IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

CREATE OR REPLACE FUNCTION public.fix_auth_user_tokens(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users SET
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    recovery_token = COALESCE(recovery_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_auth_user_tokens(uuid) TO service_role;
