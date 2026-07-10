-- ============================================================================
-- Migration 027: Covering indexes for FKs flagged by unindexed_foreign_keys.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON public.attendance (recorded_by);
CREATE INDEX IF NOT EXISTS idx_enrollments_desired_class_id ON public.enrollments (desired_class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_student_id ON public.enrollments (enrolled_student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_reviewed_by ON public.enrollments (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_health_records_recorded_by ON public.health_records (recorded_by);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_by ON public.meal_plans (created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications (created_by);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_academic_year_id ON public.student_evaluations (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_evaluator_id ON public.student_evaluations (evaluator_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_student_id ON public.student_evaluations (student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_recorded_by ON public.teacher_attendance (recorded_by);
CREATE INDEX IF NOT EXISTS idx_tuition_fees_created_by ON public.tuition_fees (created_by);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_created_by ON public.weekly_plans (created_by);
