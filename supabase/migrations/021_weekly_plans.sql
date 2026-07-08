-- 021_weekly_plans.sql ----------------------------------------------------
-- Tạo bảng lưu trữ Kế hoạch tuần (Lesson plans / Weekly activity plans)

CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL, -- Ngày Thứ Hai của tuần học
  theme           TEXT NOT NULL,  -- Chủ đề tuần (ví dụ: "Thế giới đại dương")
  content         JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lưu danh sách hoạt động dạng JSON
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approver_name   TEXT, -- Tên người duyệt để in ở chữ ký (ví dụ: "Hiệu trưởng Nguyễn Thị Thu")
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo Index tăng tốc tìm kiếm
CREATE INDEX IF NOT EXISTS idx_weekly_plans_school ON public.weekly_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_class  ON public.weekly_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week   ON public.weekly_plans(week_start_date);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

-- Tạo trigger tự động cập nhật updated_at
CREATE TRIGGER trg_weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Định nghĩa các chính sách bảo mật (RLS Policies)
-- 1. Quyền SELECT (Xem): Cho tất cả người dùng đã xác thực (Admin, Giáo viên, Nhân viên, Phụ huynh)
CREATE POLICY "weekly_plans_select_authenticated"
  ON public.weekly_plans FOR SELECT
  TO authenticated
  USING (true);

-- 2. Quyền ALL (Toàn quyền): Cho người dùng có vai trò là Admin
CREATE POLICY "weekly_plans_all_admin"
  ON public.weekly_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 3. Quyền INSERT (Thêm mới): Cho Giáo viên và Nhân viên
CREATE POLICY "weekly_plans_insert_teacher"
  ON public.weekly_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'teacher' OR users.role = 'staff')
    )
  );

-- 4. Quyền UPDATE (Cập nhật): Cho Giáo viên và Nhân viên
CREATE POLICY "weekly_plans_update_teacher"
  ON public.weekly_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'teacher' OR users.role = 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'teacher' OR users.role = 'staff')
    )
  );

-- 5. Quyền DELETE (Xóa): Cho Giáo viên và Nhân viên
CREATE POLICY "weekly_plans_delete_teacher"
  ON public.weekly_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND (users.role = 'teacher' OR users.role = 'staff')
    )
  );
