-- ============================================================================
-- Migration 019: RPC security hardening
--
-- Advisor scan (2026-07-04) found several SECURITY DEFINER functions callable
-- by the `anon` role with no internal auth/role check. Worst case:
-- `dashboard_stats` returns per-student medical_notes and financial data to
-- unauthenticated callers via POST /rest/v1/rpc/dashboard_stats. This
-- migration adds internal auth guards and revokes PUBLIC/anon EXECUTE grants
-- (Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION, which is
-- how these ended up anon-callable even though nobody intended it).
-- ============================================================================

-- 1. dashboard_stats: leaked medical_notes + finance data to anon. Restrict to
--    staff roles (admin/teacher/staff); guardians use GuardianPortal instead.
CREATE OR REPLACE FUNCTION public.dashboard_stats(p_date date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSON;
  v_month INT := EXTRACT(MONTH FROM p_date);
  v_year INT := EXTRACT(YEAR FROM p_date);
  v_today TEXT := to_char(p_date, 'YYYY-MM-DD');
  v_week_start DATE := date_trunc('week', p_date)::DATE; -- Monday
  v_week_end DATE := v_week_start + 4; -- Friday
  v_today_md TEXT := to_char(p_date, 'MM-DD');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'teacher', 'staff')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_students', (
      SELECT COUNT(*) FROM students WHERE status = 'active'
    ),
    'today_present', (
      SELECT COUNT(*) FROM attendance
      WHERE date = p_date AND status IN ('present', 'late')
    ),
    'today_absent', (
      SELECT COUNT(*) FROM attendance
      WHERE date = p_date AND status IN ('absent', 'sick', 'excused')
    ),
    'today_total_marked', (
      SELECT COUNT(*) FROM attendance WHERE date = p_date
    ),
    'month_expected', (
      SELECT COALESCE(SUM(total_amount), 0) FROM tuition_fees
      WHERE month = v_month AND year = v_year
    ),
    'month_paid', (
      SELECT COALESCE(SUM(paid_amount), 0) FROM tuition_fees
      WHERE month = v_month AND year = v_year
    ),
    'overdue_fees', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          tf.id,
          tf.total_amount,
          tf.paid_amount,
          tf.month,
          s.full_name AS student_name,
          c.name AS class_name
        FROM tuition_fees tf
        JOIN students s ON s.id = tf.student_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE tf.status = 'overdue'
        ORDER BY tf.due_date ASC
        LIMIT 5
      ) t
    ),
    'weekly_attendance', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.att_date), '[]'::json)
      FROM (
        SELECT
          a.date AS att_date,
          COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) AS present_count,
          COUNT(*) AS total_count
        FROM attendance a
        WHERE a.date BETWEEN v_week_start AND v_week_end
        GROUP BY a.date
      ) t
    ),
    'birthday_students', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          s.id,
          s.full_name,
          s.date_of_birth,
          c.name AS class_name
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.status = 'active'
          AND to_char(s.date_of_birth, 'MM-DD') = v_today_md
      ) t
    ),
    'medical_alerts', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          s.id,
          s.full_name,
          s.medical_notes,
          c.name AS class_name
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.status = 'active'
          AND s.medical_notes IS NOT NULL
          AND s.medical_notes <> ''
        LIMIT 20
      ) t
    ),
    'unmarked_classes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT c.id, c.name
        FROM classes c
        WHERE c.is_active = TRUE
          AND c.id NOT IN (
            SELECT DISTINCT a.class_id FROM attendance a WHERE a.date = p_date
          )
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dashboard_stats(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_stats(date) TO authenticated;

-- 2. create_parent_account_by_phone: anon could trigger account creation for
--    any guardian_id with a hardcoded default password. Restrict to admins.
CREATE OR REPLACE FUNCTION public.create_parent_account_by_phone(p_guardian_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_phone TEXT;
  v_full_name TEXT;
  v_email TEXT;
  v_user_id UUID;
  v_school_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT g.phone, g.full_name, g.user_id, s.school_id
  INTO v_phone, v_full_name, v_user_id, v_school_id
  FROM public.guardians g
  JOIN public.students s ON g.student_id = s.id
  WHERE g.id = p_guardian_id;

  IF v_phone IS NULL OR v_phone = '' THEN
    RAISE EXCEPTION 'Phụ huynh chưa có số điện thoại. Vui lòng cập nhật số điện thoại trước.';
  END IF;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  v_email := v_phone || '@doraemon.edu.vn';

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.guardians
    SET user_id = v_user_id
    WHERE id = p_guardian_id;

    RETURN v_user_id;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt('123456', extensions.gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_full_name),
    NOW(), NOW(), ''
  );

  INSERT INTO public.users (
    id, school_id, email, full_name, role, phone, is_active
  ) VALUES (
    v_user_id,
    v_school_id,
    v_email,
    v_full_name,
    'parent',
    v_phone,
    TRUE
  );

  UPDATE public.guardians
  SET user_id = v_user_id
  WHERE id = p_guardian_id;

  RETURN v_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_parent_account_by_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parent_account_by_phone(uuid) TO authenticated;

-- 3. fix_auth_user_tokens: intended for service_role only (see migration 017)
--    but Postgres' default PUBLIC grant on CREATE FUNCTION left it anon/authenticated-callable.
REVOKE EXECUTE ON FUNCTION public.fix_auth_user_tokens(uuid) FROM PUBLIC, anon, authenticated;

-- 4. RLS helper functions: only meaningful for the calling authenticated user
--    (keyed off auth.uid()), no legitimate anon use case. Also pin search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_teacher_class_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT class_id FROM public.class_teachers WHERE teacher_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_guardian_student_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT student_id FROM public.guardians WHERE user_id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_teacher_class_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_guardian_student_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guardian_student_ids() TO authenticated;

-- 5. unaccent search-helper functions: no anon use case; pin search_path.
CREATE OR REPLACE FUNCTION public.full_name_unaccent(students)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.unaccent($1.full_name);
$function$;

CREATE OR REPLACE FUNCTION public.full_name_unaccent(users)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.unaccent($1.full_name);
$function$;

CREATE OR REPLACE FUNCTION public.child_full_name_unaccent(enrollments)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.unaccent($1.child_full_name);
$function$;

CREATE OR REPLACE FUNCTION public.guardian_name_unaccent(enrollments)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.unaccent($1.guardian_name);
$function$;

REVOKE EXECUTE ON FUNCTION public.full_name_unaccent(students) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.full_name_unaccent(users) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.child_full_name_unaccent(enrollments) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guardian_name_unaccent(enrollments) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.full_name_unaccent(students) TO authenticated;
GRANT EXECUTE ON FUNCTION public.full_name_unaccent(users) TO authenticated;
GRANT EXECUTE ON FUNCTION public.child_full_name_unaccent(enrollments) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_name_unaccent(enrollments) TO authenticated;

-- 6. Remaining flagged functions: pin search_path only (no anon exposure risk).
ALTER FUNCTION public.generate_enrollment_code() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
