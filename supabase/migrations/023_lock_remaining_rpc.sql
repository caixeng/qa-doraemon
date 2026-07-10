-- ============================================================================
-- Migration 023: Lock remaining RPC surface (follow-up to 019)
--
-- Advisor scan (2026-07-10) still flags 9 SECURITY DEFINER functions callable
-- by `anon`, two of which (`finance_monthly_summary`, `generate_receipt`)
-- have no internal role check at all — unauthenticated callers could read
-- school-wide finance data and receipts (incl. student + guardian PII).
-- `mark_overdue_fees` was anon-callable as a write. Also drops the
-- always-true INSERT policy on audit_log (only the SECURITY DEFINER trigger
-- writes there; it bypasses RLS, so no client policy is needed).
-- ============================================================================

-- 1. finance_monthly_summary: add admin guard + pin search_path.
CREATE OR REPLACE FUNCTION public.finance_monthly_summary(p_academic_year_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json) INTO result
  FROM (
    SELECT
      tf.month,
      SUM(tf.total_amount) AS expected,
      SUM(tf.paid_amount) AS paid,
      COUNT(*) AS total_fees,
      COUNT(*) FILTER (WHERE tf.status = 'paid') AS paid_count,
      COUNT(*) FILTER (WHERE tf.status = 'overdue') AS overdue_count
    FROM tuition_fees tf
    WHERE tf.academic_year_id = p_academic_year_id
    GROUP BY tf.month
  ) t;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finance_monthly_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_monthly_summary(uuid) TO authenticated;

-- 2. generate_receipt: add admin guard + pin search_path.
CREATE OR REPLACE FUNCTION public.generate_receipt(p_fee_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'receipt_number', 'BL-' || to_char(tf.paid_date, 'YYYYMMDD') || '-' || LEFT(tf.id::TEXT, 8),
    'fee_id', tf.id,
    'paid_date', tf.paid_date,
    'month', tf.month,
    'year', tf.year,
    'due_date', tf.due_date,
    'status', tf.status,

    -- Amounts
    'base_amount', tf.base_amount,
    'meal_amount', tf.meal_amount,
    'extra_amount', tf.extra_amount,
    'discount', tf.discount,
    'total_amount', tf.total_amount,
    'paid_amount', tf.paid_amount,
    'remaining', tf.total_amount - tf.paid_amount,
    'note', tf.note,

    -- Student info
    'student', json_build_object(
      'id', s.id,
      'full_name', s.full_name,
      'student_code', s.student_code,
      'date_of_birth', s.date_of_birth,
      'class_name', c.name,
      'grade_level', c.grade_level
    ),

    -- Guardian info (primary)
    'guardian', (
      SELECT json_build_object(
        'full_name', g.full_name,
        'relationship', g.relationship,
        'phone', g.phone
      )
      FROM guardians g
      WHERE g.student_id = s.id
      ORDER BY g.is_primary DESC
      LIMIT 1
    ),

    -- School info
    'school', json_build_object(
      'name', sc.name,
      'address', sc.address,
      'phone', sc.phone,
      'email', sc.email,
      'principal_name', sc.principal_name
    ),

    -- Created by
    'created_by', json_build_object(
      'full_name', u.full_name,
      'email', u.email
    )
  ) INTO result
  FROM tuition_fees tf
  JOIN students s ON s.id = tf.student_id
  LEFT JOIN classes c ON c.id = s.class_id
  JOIN academic_years ay ON ay.id = tf.academic_year_id
  JOIN schools sc ON sc.id = ay.school_id
  LEFT JOIN users u ON u.id = tf.created_by
  WHERE tf.id = p_fee_id;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Tuition fee record not found: %', p_fee_id;
  END IF;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_receipt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_receipt(uuid) TO authenticated;

-- 3. mark_overdue_fees: cron/maintenance only — no client role should call it.
ALTER FUNCTION public.mark_overdue_fees() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_fees() FROM PUBLIC, anon, authenticated;

-- 4. audit_trigger_fn: fired by triggers only, never via RPC.
ALTER FUNCTION public.audit_trigger_fn() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, anon, authenticated;

-- 5. is_staff: same treatment as the other RLS helpers in 019.
ALTER FUNCTION public.is_staff() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- 6. Admin-guarded report/audit functions: guards exist since 015/016, but
--    anon could still reach the guard; revoke + pin search_path.
ALTER FUNCTION public.get_audit_log(text, uuid, integer, integer) SET search_path = public;
ALTER FUNCTION public.report_students_summary(uuid) SET search_path = public;
ALTER FUNCTION public.report_attendance(uuid, integer, uuid) SET search_path = public;
ALTER FUNCTION public.report_finance(uuid, integer, uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_audit_log(text, uuid, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_students_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_attendance(uuid, integer, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_finance(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_log(text, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_students_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_attendance(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_finance(uuid, integer, uuid) TO authenticated;

-- 7. check_fee_overdue: plain trigger fn, just pin search_path.
ALTER FUNCTION public.check_fee_overdue() SET search_path = public;

-- 8. audit_log INSERT policy was WITH CHECK (true) for all authenticated users
--    (anyone logged in could forge audit rows). Only audit_trigger_fn writes
--    to this table and it bypasses RLS as a SECURITY DEFINER owned by the
--    table owner, so the policy is simply dropped.
DROP POLICY IF EXISTS audit_log_insert_authenticated ON public.audit_log;
