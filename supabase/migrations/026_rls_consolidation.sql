-- ============================================================================
-- Migration 026: RLS consolidation + initplan fixes
--
-- Advisors flagged 35 multiple_permissive_policies and 14 auth_rls_initplan.
-- Every affected table followed the same pattern: a `*_all_admin` FOR ALL
-- policy stacked on top of per-role policies, so Postgres evaluated 2-4
-- policies per row per query. This migration rewrites them so each
-- (table, action) pair has exactly ONE permissive policy, with all
-- auth.uid()/is_admin()/is_staff()/get_user_role() calls wrapped in scalar
-- subselects so they are evaluated once per statement instead of per row.
--
-- Semantics are preserved 1:1 except one deliberate fix:
--   student_evaluations had NO DELETE policy while the frontend deletes rows
--   (EvaluationDetailPanel) — deletes were silently blocked by RLS. A DELETE
--   policy (admin or the evaluator) is added.
-- ============================================================================

-- ── academic_years ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS academic_years_all_admin ON public.academic_years;
-- keep: academic_years_select_authenticated (USING true)
CREATE POLICY academic_years_insert_admin ON public.academic_years
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY academic_years_update_admin ON public.academic_years
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY academic_years_delete_admin ON public.academic_years
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── attendance ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS attendance_all_admin ON public.attendance;
DROP POLICY IF EXISTS attendance_all_teacher ON public.attendance;
DROP POLICY IF EXISTS attendance_select_guardian ON public.attendance;
DROP POLICY IF EXISTS attendance_select_staff ON public.attendance;
CREATE POLICY attendance_select ON public.attendance
  FOR SELECT TO authenticated USING (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR class_id IN (SELECT get_teacher_class_ids())
    OR student_id IN (SELECT get_guardian_student_ids())
  );
CREATE POLICY attendance_insert ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids())
  );
CREATE POLICY attendance_update ON public.attendance
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids()))
  WITH CHECK ((SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids()));
CREATE POLICY attendance_delete ON public.attendance
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids()));

-- ── class_teachers ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS class_teachers_all_admin ON public.class_teachers;
-- keep: class_teachers_select_authenticated (USING true)
CREATE POLICY class_teachers_insert_admin ON public.class_teachers
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY class_teachers_update_admin ON public.class_teachers
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY class_teachers_delete_admin ON public.class_teachers
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── classes ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS classes_all_admin ON public.classes;
-- keep: classes_select_authenticated (USING true)
CREATE POLICY classes_insert_admin ON public.classes
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY classes_update_admin ON public.classes
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY classes_delete_admin ON public.classes
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── enrollments ──────────────────────────────────────────────────────────────
-- Old policies had no role restriction (applied to every role incl. anon) and
-- re-ran an EXISTS per row. Scoped to authenticated; is_active checks kept.
DROP POLICY IF EXISTS "Admin full access on enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Staff read access on enrollments" ON public.enrollments;
CREATE POLICY enrollments_select ON public.enrollments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role IN ('admin'::user_role, 'teacher'::user_role, 'staff'::user_role)
        AND users.is_active = true
    )
  );
CREATE POLICY enrollments_insert_admin ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::user_role AND users.is_active = true
    )
  );
CREATE POLICY enrollments_update_admin ON public.enrollments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::user_role AND users.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::user_role AND users.is_active = true
    )
  );
CREATE POLICY enrollments_delete_admin ON public.enrollments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'::user_role AND users.is_active = true
    )
  );

-- ── guardians ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS guardians_all_admin ON public.guardians;
DROP POLICY IF EXISTS guardians_select_own ON public.guardians;
DROP POLICY IF EXISTS guardians_select_staff ON public.guardians;
DROP POLICY IF EXISTS guardians_select_teacher ON public.guardians;
DROP POLICY IF EXISTS guardians_update_own ON public.guardians;
CREATE POLICY guardians_select ON public.guardians
  FOR SELECT TO authenticated USING (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR user_id = (SELECT auth.uid())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  );
CREATE POLICY guardians_insert_admin ON public.guardians
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY guardians_update ON public.guardians
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()) OR user_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT is_admin()) OR user_id = (SELECT auth.uid()));
CREATE POLICY guardians_delete_admin ON public.guardians
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── health_records ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS health_records_all_admin ON public.health_records;
DROP POLICY IF EXISTS health_records_all_teacher ON public.health_records;
DROP POLICY IF EXISTS health_records_insert_staff ON public.health_records;
DROP POLICY IF EXISTS health_records_select_guardian ON public.health_records;
DROP POLICY IF EXISTS health_records_select_staff ON public.health_records;
CREATE POLICY health_records_select ON public.health_records
  FOR SELECT TO authenticated USING (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
    OR student_id IN (SELECT get_guardian_student_ids())
  );
CREATE POLICY health_records_insert ON public.health_records
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  );
CREATE POLICY health_records_update ON public.health_records
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_admin())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  )
  WITH CHECK (
    (SELECT is_admin())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  );
CREATE POLICY health_records_delete ON public.health_records
  FOR DELETE TO authenticated USING (
    (SELECT is_admin())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  );

-- ── meal_plans ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS meal_plans_all_admin ON public.meal_plans;
DROP POLICY IF EXISTS meal_plans_insert_staff ON public.meal_plans;
DROP POLICY IF EXISTS meal_plans_insert_teacher ON public.meal_plans;
DROP POLICY IF EXISTS meal_plans_update_teacher ON public.meal_plans;
-- keep: meal_plans_select_authenticated (USING true)
CREATE POLICY meal_plans_insert ON public.meal_plans
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT get_user_role()) IN ('admin'::user_role, 'staff'::user_role, 'teacher'::user_role)
  );
CREATE POLICY meal_plans_update ON public.meal_plans
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()) OR created_by = (SELECT auth.uid()))
  WITH CHECK ((SELECT is_admin()) OR created_by = (SELECT auth.uid()));
CREATE POLICY meal_plans_delete_admin ON public.meal_plans
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── notifications ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_all_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_teacher ON public.notifications;
DROP POLICY IF EXISTS notifications_select_broadcast ON public.notifications;
DROP POLICY IF EXISTS notifications_select_class_teacher ON public.notifications;
DROP POLICY IF EXISTS notifications_select_individual ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated USING (
    (SELECT is_admin())
    OR target = 'all'::notification_target
    OR (target = 'class'::notification_target
        AND target_id IN (SELECT get_teacher_class_ids()))
    OR (target = 'individual'::notification_target
        AND target_id = (SELECT auth.uid()))
  );
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT get_user_role()) IN ('admin'::user_role, 'teacher'::user_role)
  );
CREATE POLICY notifications_update_admin ON public.notifications
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY notifications_delete_admin ON public.notifications
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── schools ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS schools_all_admin ON public.schools;
-- keep: schools_select_authenticated (USING true)
CREATE POLICY schools_insert_admin ON public.schools
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY schools_update_admin ON public.schools
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY schools_delete_admin ON public.schools
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── student_evaluations ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS evaluations_update_teacher ON public.student_evaluations;
CREATE POLICY evaluations_update_teacher ON public.student_evaluations
  FOR UPDATE TO authenticated
  USING (evaluator_id = (SELECT auth.uid()) OR (SELECT is_admin()));
-- NEW: frontend deletes evaluations but no DELETE policy existed (silently
-- blocked). Evaluator or admin may delete.
CREATE POLICY evaluations_delete ON public.student_evaluations
  FOR DELETE TO authenticated
  USING (evaluator_id = (SELECT auth.uid()) OR (SELECT is_admin()));

-- ── students ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS students_all_admin ON public.students;
DROP POLICY IF EXISTS students_select_guardian ON public.students;
DROP POLICY IF EXISTS students_select_staff ON public.students;
DROP POLICY IF EXISTS students_select_teacher ON public.students;
DROP POLICY IF EXISTS students_update_teacher ON public.students;
CREATE POLICY students_select ON public.students
  FOR SELECT TO authenticated USING (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR id IN (SELECT get_guardian_student_ids())
    OR class_id IN (SELECT get_teacher_class_ids())
  );
CREATE POLICY students_insert_admin ON public.students
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY students_update ON public.students
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids()))
  WITH CHECK ((SELECT is_admin()) OR class_id IN (SELECT get_teacher_class_ids()));
CREATE POLICY students_delete_admin ON public.students
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── teacher_attendance ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS teacher_attendance_all_admin ON public.teacher_attendance;
DROP POLICY IF EXISTS teacher_attendance_select_own ON public.teacher_attendance;
CREATE POLICY teacher_attendance_select ON public.teacher_attendance
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()) OR teacher_id = (SELECT auth.uid()));
CREATE POLICY teacher_attendance_insert_admin ON public.teacher_attendance
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY teacher_attendance_update_admin ON public.teacher_attendance
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY teacher_attendance_delete_admin ON public.teacher_attendance
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── tuition_fees ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tuition_fees_all_admin ON public.tuition_fees;
DROP POLICY IF EXISTS tuition_fees_select_guardian ON public.tuition_fees;
DROP POLICY IF EXISTS tuition_fees_select_staff ON public.tuition_fees;
DROP POLICY IF EXISTS tuition_fees_select_teacher ON public.tuition_fees;
CREATE POLICY tuition_fees_select ON public.tuition_fees
  FOR SELECT TO authenticated USING (
    (SELECT is_admin()) OR (SELECT is_staff())
    OR student_id IN (SELECT get_guardian_student_ids())
    OR student_id IN (
      SELECT s.id FROM students s
      WHERE s.class_id IN (SELECT get_teacher_class_ids())
    )
  );
CREATE POLICY tuition_fees_insert_admin ON public.tuition_fees
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY tuition_fees_update_admin ON public.tuition_fees
  FOR UPDATE TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY tuition_fees_delete_admin ON public.tuition_fees
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── users ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS users_all_admin ON public.users;
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()) OR id = (SELECT auth.uid()));
CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated WITH CHECK ((SELECT is_admin()));
CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()) OR id = (SELECT auth.uid()))
  WITH CHECK ((SELECT is_admin()) OR id = (SELECT auth.uid()));
CREATE POLICY users_delete_admin ON public.users
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

-- ── weekly_plans ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS weekly_plans_all_admin ON public.weekly_plans;
DROP POLICY IF EXISTS weekly_plans_insert_teacher ON public.weekly_plans;
DROP POLICY IF EXISTS weekly_plans_update_teacher ON public.weekly_plans;
DROP POLICY IF EXISTS weekly_plans_delete_teacher ON public.weekly_plans;
-- keep: weekly_plans_select_authenticated (USING true)
CREATE POLICY weekly_plans_insert ON public.weekly_plans
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT get_user_role()) IN ('admin'::user_role, 'teacher'::user_role, 'staff'::user_role)
  );
CREATE POLICY weekly_plans_update ON public.weekly_plans
  FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin'::user_role, 'teacher'::user_role, 'staff'::user_role))
  WITH CHECK ((SELECT get_user_role()) IN ('admin'::user_role, 'teacher'::user_role, 'staff'::user_role));
CREATE POLICY weekly_plans_delete ON public.weekly_plans
  FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin'::user_role, 'teacher'::user_role, 'staff'::user_role));
