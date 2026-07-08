-- Thêm cột ghi chú cho đối tượng ưu tiên (ghi chú các trường hợp cụ thể)
ALTER TABLE students ADD COLUMN IF NOT EXISTS priority_note text;
