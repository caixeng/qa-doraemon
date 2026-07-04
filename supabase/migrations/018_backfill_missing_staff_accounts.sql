-- ============================================================================
-- Migration 018: Backfill missing login accounts for existing staff/teachers
--
-- Some public.users rows (created before the create-staff-account Edge
-- Function existed, e.g. via Excel bulk import) never got a matching
-- auth.users row, so those staff could never log in at all. Create the
-- missing Auth accounts directly, reusing the existing profile id so
-- foreign keys (class_teachers, etc.) keep working. Username = phone
-- number, default password = '123456', same convention as
-- create-staff-account/index.ts.
-- ============================================================================

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  recovery_token,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES
  ('00000000-0000-0000-0000-000000000000', '894051c4-682b-4e5b-8f28-338ef09bdf38', 'authenticated', 'authenticated',
   '0866175709@doraemon.edu.vn', extensions.crypt('123456', extensions.gen_salt('bf')), NOW(), NULL, NULL,
   '{"provider":"email","providers":["email"]}', '{"full_name":"Hồ Thị Lê Na"}', NOW(), NOW(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33994e92-7dd9-41d4-9fbe-e1e8ffee48b3', 'authenticated', 'authenticated',
   '0911416268@doraemon.edu.vn', extensions.crypt('123456', extensions.gen_salt('bf')), NOW(), NULL, NULL,
   '{"provider":"email","providers":["email"]}', '{"full_name":"Hoàng Thị Thùy Linh"}', NOW(), NOW(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'dc91baed-6072-4886-93d5-e305ba3eba26', 'authenticated', 'authenticated',
   '0979211364@doraemon.edu.vn', extensions.crypt('123456', extensions.gen_salt('bf')), NOW(), NULL, NULL,
   '{"provider":"email","providers":["email"]}', '{"full_name":"Nguyễn Thị Huyền"}', NOW(), NOW(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '90c8e8a7-24c6-493c-89d5-5224f8fd327c', 'authenticated', 'authenticated',
   '0913232331@doraemon.edu.vn', extensions.crypt('123456', extensions.gen_salt('bf')), NOW(), NULL, NULL,
   '{"provider":"email","providers":["email"]}', '{"full_name":"Nguyễn Thị Thanh Thái"}', NOW(), NOW(), '', '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Two of the ids above already had an auth.users row, but under a stale
-- "<old-phone>_2@doraemon.edu.vn" email (their phone number in public.users
-- had since been edited/reassigned without the auth email following along).
-- The ON CONFLICT above silently skipped them, so fix those emails directly.
-- ----------------------------------------------------------------------------
UPDATE auth.users SET email = '0866175709@doraemon.edu.vn', encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')), updated_at = NOW()
  WHERE id = '894051c4-682b-4e5b-8f28-338ef09bdf38';
UPDATE auth.users SET email = '0979211364@doraemon.edu.vn', encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')), updated_at = NOW()
  WHERE id = 'dc91baed-6072-4886-93d5-e305ba3eba26';

-- A third profile ("Hoàng Thị Thùy Linh", phone 0343955941) had the same
-- stale-suffix problem, but the plain email was already taken by an orphaned
-- auth.users row with no matching public.users profile (id 83f06e94...,
-- confirmed unreferenced by class_teachers/notifications) — remove the
-- orphan, then reclaim the plain email for the real profile.
DELETE FROM auth.users WHERE id = '83f06e94-9458-46f1-b3be-6b5449c5edea';
UPDATE auth.users SET email = '0343955941@doraemon.edu.vn', encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')), updated_at = NOW()
  WHERE id = '90be2dad-1f53-4ebf-adb9-2fea3df4d7c7';
