-- ============================================================================
-- Migration 020: Teacher/staff daily attendance (điểm danh giáo viên)
--
-- Adds a dedicated attendance table for teachers/staff, separate from the
-- student `attendance` table. Statuses mirror the school's existing paper
-- process: full/half day worked, hourly worked, and paid/unpaid absence
-- (including a half-day unpaid absence).
-- ============================================================================

CREATE TYPE teacher_attendance_status AS ENUM (
  'full_day',              -- Đi làm cả ngày
  'half_day',               -- Đi làm một buổi
  'excused_absence',        -- Vắng có phép
  'unexcused_absence',      -- Vắng không phép
  'unexcused_absence_half', -- Vắng không phép 1 buổi
  'hour_1',                 -- Đi làm 1h
  'hour_2',                 -- Đi làm 2h
  'hour_3',                 -- Đi làm 3h
  'hour_5',                 -- Đi làm 5h
  'hour_6',                 -- Đi làm 6h
  'hour_7'                  -- Đi làm 7h
);

CREATE TABLE teacher_attendance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       teacher_attendance_status NOT NULL DEFAULT 'full_day',
  note         TEXT,
  recorded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_teacher_attendance_teacher_date UNIQUE (teacher_id, date)
);

CREATE INDEX idx_teacher_attendance_school  ON teacher_attendance(school_id);
CREATE INDEX idx_teacher_attendance_teacher ON teacher_attendance(teacher_id);
CREATE INDEX idx_teacher_attendance_date    ON teacher_attendance(date);
CREATE INDEX idx_teacher_attendance_status  ON teacher_attendance(status);

CREATE TRIGGER trg_teacher_attendance_updated_at
  BEFORE UPDATE ON teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Admin: full read/write (this is a payroll-adjacent record; only admins
-- manage it, mirroring the tuition_fees admin-only write pattern).
CREATE POLICY "teacher_attendance_all_admin"
  ON teacher_attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Teachers/staff can read their own attendance history.
CREATE POLICY "teacher_attendance_select_own"
  ON teacher_attendance FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());
