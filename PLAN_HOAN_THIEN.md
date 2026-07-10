# Kế hoạch tối ưu & hoàn thiện — Doraemon Kindergarten Management (v3)

> Ngày đánh giá: 2026-07-10 | Thay thế bản v2 (2026-07-04). Nguồn: tsc/test/build local, Supabase Management API (advisors, auth config, functions, schema), soát mã nguồn.

---

## 1. Hiện trạng tổng thể

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Build production | ✅ OK (10.1s) | Chunk `index` 744KB (222KB gzip) — chưa tách vendor |
| Test | ✅ 28 tests / 4 files pass | Coverage vẫn mỏng, chưa thêm test mới từ v2 |
| Type check (`npm run lint`) | ✅ Pass | |
| Git | ✅ Sạch | Đã force-push history rewrite, `.gitignore` có `*.csv/*.xlsx`, `implementation_plan.md` đã xóa |
| Kiểu `any` | ⚠️ 274 chỗ | Tăng so với 244 (v2) — code mới (WeeklyPlans, TeacherAttendance) tiếp tục dùng `any` |
| Supabase security advisors | ⚠️ 43 WARN | Tăng so với 35 (v2) — chi tiết mục 2 |
| Supabase performance advisors | ⚠️ 89 (49 WARN + 40 INFO) | Tăng so với 68 — migration 020–022 thêm policy/index mới |
| Edge Functions | 🔴 Chỉ `create-staff-account` | **`zalo-send` vẫn chưa deploy** — Finance/NotificationForm gọi sẽ fail |
| Leaked-password protection | 🔴 Vẫn TẮT | `password_hibp_enabled=false`, min length = 6 |
| Migration history drift | 🔴 Mới phát hiện | DB chỉ ghi nhận 001–019; bảng của 020–022 (`teacher_attendance`, `weekly_plans`, `priority_note`) tồn tại nhưng **không có trong `schema_migrations`** → `supabase db push` sẽ chạy lại và fail |

### Việc đã hoàn thành từ v2
- ✅ 1.1 Fix tsc CI — xong
- ✅ 1.3 Migration 019: khóa 4 nhóm RPC (dashboard_stats, create_parent_account_by_phone, fix_auth_user_tokens, RLS helpers + unaccent) — **nhưng còn 9 hàm anon gọi được** (mục 2.1)
- ✅ 1.4a/b/c Xử lý sự cố dữ liệu trẻ em: repo private, purge history, force-push, gitignore
- ✅ Tính năng mới: điểm danh giáo viên (020), kế hoạch tuần (021), ghi chú ưu tiên học sinh (022)

---

## 2. Phát hiện bảo mật (43 WARN — ưu tiên cao nhất)

### 2.1 🔴 Còn 9 hàm SECURITY DEFINER anon gọi được
Migration 019 chỉ khóa các hàm rà được lúc đó. Còn lại `anon` vẫn EXECUTE được:
`audit_trigger_fn`, `finance_monthly_summary`, `generate_receipt`, `get_audit_log`, `is_staff`, `mark_overdue_fees`, `report_attendance`, `report_finance`, `report_students_summary`.
→ `report_finance`/`generate_receipt`/`get_audit_log` **lộ dữ liệu tài chính + audit cho người chưa đăng nhập**. Cần migration 023 REVOKE anon + thêm guard `is_staff()`/`is_admin()` bên trong các hàm report/receipt/audit.

### 2.2 🔴 Bucket `student-photos` và `avatars` public, cho phép liệt kê
Advisor `public_bucket_allows_listing`: ảnh trẻ em nằm trong bucket public, client bất kỳ có thể list object. Với tính nhạy cảm dữ liệu trẻ em (đã có tiền lệ sự cố public repo):
→ chuyển `student-photos` sang **private + signed URL** (TTL ngắn), policy SELECT giới hạn staff/guardian liên quan; `avatars` có thể giữ public nhưng bỏ policy list.

### 2.3 🟡 Mật khẩu: HIBP tắt, min length 6, mặc định `123456`, không bắt đổi
- Bật leaked-password protection + nâng `password_min_length` ≥ 8 (thao tác Dashboard, 5 phút).
- `create_parent_account_by_phone` (admin-only rồi nhưng) vẫn INSERT thẳng `auth.users` với mật khẩu cứng `123456` — pattern từng gây bug NULL-token (migration 017 phải vá).
- Chưa có flow `must_change_password` (grep = 0 kết quả).

### 2.4 🟡 Vệ sinh còn lại
- 10 hàm chưa `SET search_path` (`mark_overdue_fees`, `check_fee_overdue`, `generate_receipt`, `audit_trigger_fn`, `finance_monthly_summary`, `is_staff`, `get_audit_log`, `report_*`).
- Policy `audit_log_insert_authenticated` là `WITH CHECK (true)` — authenticated bất kỳ ghi được audit log giả. Nên giới hạn `user_id = auth.uid()`.
- Extension `unaccent` vẫn ở schema `public`.
- 19 hàm SECURITY DEFINER authenticated gọi được — đa số hợp lệ (RLS helper), chỉ cần rà nhóm report/receipt có guard nội bộ chưa.

---

## 3. Database — drift & hiệu năng

### 3.1 🔴 Sửa migration history (trước khi làm bất kỳ migration mới nào)
020–022 được apply tay (SQL editor) nên không có trong `supabase_migrations.schema_migrations`. Cần `supabase migration repair --status applied 020 021 022` (hoặc INSERT trực tiếp 3 version) để đồng bộ, nếu không mọi lệnh `db push` sau này sẽ hỏng.

### 3.2 Nợ hiệu năng (advisor)
| Loại | Số lượng | Xử lý |
|---|---|---|
| `multiple_permissive_policies` | 35 WARN | Gộp policy trùng action/role — nhiều nhất ở bảng mới `teacher_attendance`, `weekly_plans` |
| `auth_rls_initplan` | 14 WARN | Bọc `auth.uid()` trong `(select ...)` |
| `unindexed_foreign_keys` | 13 INFO | Thêm index FK |
| `unused_index` | 27 INFO | Chờ traffic thật 2–4 tuần rồi drop |

---

## 4. Frontend / chất lượng code

**Điểm mạnh giữ nguyên**: lazy-load 17 route, design tokens kiểu M3 + dark mode, phân quyền route theo role, TanStack Query (43 file), bộ UI component riêng đầy đủ (Toast, ConfirmDialog — không còn `window.confirm`, Skeleton, EmptyState/ErrorState), mobile bottom nav.

**Nợ:**
- **274 `any`** — top: `Attendance` (23), `Health`/`GuardianPortal`/`Evaluations` (14 mỗi file), `Teachers` (11), `TeacherForm`/`NotificationForm` (10). Code mới vẫn thêm `any` → cần chốt quy ước dùng type từ `types/database.ts` khi viết mới.
- **File quá lớn** (>600 dòng): `WeeklyPlans.tsx` **854** (mới, lớn nhất repo), `Finance.tsx` 746, `ClassRollCallTab.tsx` 700, `useStudents.ts` 699, `Attendance.tsx` 665, `Nutrition.tsx` 617, `Students.tsx` 612.
- **Bundle**: index 744KB — chưa có `manualChunks` tách react/supabase/motion; `xlsx` (425KB) và recharts đã tách chunk riêng ✅.
- **Test**: vẫn chỉ 4 file cũ (formatters, receipt, classUtils, ClassForm). Logic tiền (tính phí, overdue), useStudents, WeeklyPlans chưa có test.
- **UX/A11y**: chỉ 54 thuộc tính `aria-*` toàn app; font load từ Google CDN (chậm + phụ thuộc mạng — nên self-host); các nút "Gửi Zalo" đang hiển thị nhưng chắc chắn fail (function chưa deploy) — UX xấu.
- Root repo còn file giáo án (`1. THƯ CHỦ ĐỀ NOBITA.pdf`, `5T - Thế giới đại dương.docx`) untracked — chuyển ra ngoài repo hoặc vào thư mục ignore.

---

## 5. Kế hoạch thực hiện

### GĐ 1 — Vá ngay (≤ 1 ngày)
- [x] **1.1** Migration `023_lock_remaining_rpc.sql`: REVOKE anon trên 9 hàm mục 2.1 + guard nội bộ cho `report_*`, `generate_receipt`, `get_audit_log`, `finance_monthly_summary` + `SET search_path` cho 10 hàm + sửa policy `audit_log_insert_authenticated`
- [x] **1.2** `supabase migration repair` cho 020–022 (làm TRƯỚC 1.1 để push được)
- [x] **1.3** Bật leaked-password protection + min length ≥ 8 (Dashboard)
- [x] **1.4** Deploy `zalo-send` (kèm secrets) — hoặc feature-flag ẩn toàn bộ nút Zalo tới khi deploy
- [x] **1.5** Chuyển bucket `student-photos` sang private + signed URL; bỏ policy list trên `avatars`

### GĐ 2 — Tài khoản & schema (2–3 ngày)
- [x] **2.1** Edge Function `create-parent-account` dùng Admin API thay cho INSERT `auth.users`; mật khẩu ngẫu nhiên gửi qua Zalo/SMS thay vì `123456`
- [x] **2.2** Flow `must_change_password` lần đầu đăng nhập (cột flag + màn hình đổi mật khẩu + chặn route)
- [ ] **2.3** Dump các hàm chỉ có trên DB (`fix_auth_user_tokens`, nhóm `*_unaccent`…) vào migration sync để hết drift
- [x] **2.4** Move `unaccent` sang schema `extensions`

### GĐ 3 — Hiệu năng DB (1–2 ngày)
- [x] **3.1** Fix 14 `auth_rls_initplan`
- [x] **3.2** Gộp 35 `multiple_permissive_policies` (ưu tiên bảng mới teacher_attendance, weekly_plans)
- [x] **3.3** Index 13 FK
- [ ] **3.4** Rà 27 unused index sau khi có traffic thật

### GĐ 4 — Chất lượng code (liên tục, ~1 tuần rải)
- [ ] **4.1** Giảm `any`: Attendance (23) → Health/GuardianPortal/Evaluations (14) → Teachers/Forms; chốt quy ước không thêm `any` mới trong code review
- [ ] **4.2** Tách file >600 dòng: WeeklyPlans (854) và Finance (746) trước
- [ ] **4.3** Test logic tiền (tính học phí, overdue) + useStudents + WeeklyPlans
- [x] **4.4** `manualChunks` tách vendor (react, supabase, motion) — giảm index 744KB
- [ ] **4.5** Self-host font (bỏ Google CDN); pass a11y cơ bản (aria cho Modal/SlidePanel/Table, focus trap)

### GĐ 5 — Nâng cấp giao diện UI/UX (2–3 ngày, dựa trên review trực tiếp app 2026-07-10)

Đánh giá chung: nền UI đã tốt — dark mode hoạt động đúng (đã đo contrast), mobile có bottom nav + skeleton, login chỉn chu, design token nhất quán. Các mục dưới là nâng cấp, không phải sửa lỗi nền tảng:

- [x] **5.1** **Ẩn/disable nút "Gửi Zalo"** (Finance, NotificationForm, FeeDetailPanel) sau feature flag tới khi `zalo-send` deploy — hiện bấm là lỗi runtime, UX xấu nhất app
- [ ] **5.2** **Bảng → card trên mobile** cho Học sinh/Giáo viên: bảng cuộn ngang hiện tại tốn chỗ vì checkbox + STT; card 2 dòng (tên + lớp + SĐT) dễ dùng hơn. Desktop: sửa cột Địa chỉ bị cắt cụt
- [x] **5.3** **Avatar**: mọi học sinh đều hiển thị chữ "A" (lấy chữ cái từ "An" cuối tên) — đổi logic lấy 2 chữ cái đầu họ+tên; về sau hiển thị ảnh học sinh (kèm private bucket + signed URL ở mục 1.5)
- [x] **5.4** **Dashboard stat cards**: mật độ thông tin thấp (dòng "Trạng thái: Chính thức" chiếm chỗ nhưng ít giá trị) — thay bằng delta so tháng trước + click điều hướng tới màn tương ứng
- [x] **5.5** **Đồng nhất locale ngày tháng**: Finance đang dùng `<input type="month">` native hiện "July 2026" tiếng Anh — thay bằng DatePicker nội bộ đã có, format vi-VN toàn app
- [ ] **5.6** **Typography**: Playfair Display italic chỉ giữ cho H1/H2; label nhỏ và số liệu chuyển hết sang Inter (một số card đang serif ở size nhỏ, khó đọc với dấu tiếng Việt); self-host 2 font (gộp với 4.5)
- [x] **5.7** **Sửa breadcrumb topbar** wrap 2 dòng ở màn ≤1024px (hiện "Trang chủ" gãy chữ)
- [x] **5.8** **Micro-UX**: (a) "Tổng số: 0 học sinh" nhấp nháy số 0 khi đang tải — hiện "–" hoặc skeleton; (b) `transition-all` khi đổi theme gây flash chữ tàng hình ~300ms — giới hạn transition vào `background-color/border-color`; (c) empty-state Finance khi tháng chưa có phiếu thu → nút "Tạo phiếu thu tháng này"
- [ ] **5.9** **A11y pass** (gộp 4.5): focus trap Modal/SlidePanel, `aria-label` cho icon button (chuông, search, theme), focus-visible ring, kiểm tra tab-order form

### GĐ 6 — Hoàn thiện tính năng (tùy chọn)
- [ ] **6.1** Auto gửi Zalo khi điểm danh vắng (sau 1.4)
- [x] **6.2** Cron `mark_overdue_fees()` hằng ngày (pg_cron) + auto nhắc học phí
- [ ] **6.3** PWA đúng cách (khi cần offline)
- [ ] **6.4** Dọn file giáo án PDF/docx khỏi root repo

> **Ưu tiên: GĐ1 (1.2 → 1.1 → 1.3 → 1.5 → 1.4) > GĐ2 > GĐ3 > GĐ4 ≈ GĐ5 > GĐ6.** Mục 5.1 có thể làm ngay cùng GĐ1 vì là lỗi hiển thị với người dùng.

---

**Ghi chú thực hiện 2026-07-10 (buổi chiều):**
- GĐ1+GĐ3 xong toàn bộ (migration 023–027): security advisors 43 → 19 (còn lại: 17 informational về SECURITY DEFINER có guard, 1 avatars listing cho authenticated — chủ đích, 1 HIBP cần gói Pro); performance 89 → 40 (chỉ còn INFO unused_index, chờ traffic).
- 1.3: min length 8 đã bật; **HIBP cần nâng gói Pro** — làm khi nâng cấp.
- 1.4: cả `create-staff-account` (v3, mật khẩu ngẫu nhiên) và `zalo-send` đã deploy. Nút Zalo vẫn ẩn sau `VITE_ZALO_ENABLED` vì **chưa nhập Zalo OA token trong Cài đặt** — nhập token xong thì đặt flag true.
- 2.1 đổi hướng: RPC `create_parent_account_by_phone` không có nơi nào gọi → **drop hẳn** (migration 028); tạo tài khoản phụ huynh sau này làm qua Edge Function khi có nhu cầu thật.
- 2.3 (dump hàm drift thành migration sync): chưa làm — còn `fix_auth_user_tokens` và nhóm `*_unaccent` chỉ có trên DB.
- Bug phát hiện & sửa kèm: (a) xóa đánh giá học sinh bị RLS chặn im lặng — thêm policy DELETE (026); (b) route /guardian đòi role `guardian` nhưng DB dùng `parent` → GuardianPortal không thể truy cập — đã đồng bộ; (c) cột `zalo_*` của `schools` không tồn tại trên remote dù migration 007 ghi đã apply — đã chạy lại DDL.
- 4.1: `any` 274 → 250 (Attendance 23→0, useClassesList); tiếp tục theo file: Health/GuardianPortal/Evaluations (14 mỗi file).
- 4.3: 15 test mới (43 tests pass) — `lib/fees.ts` (computeFeeTotal/feeRemaining/resolveFeeStatus khớp trigger DB) + `lib/vietnameseName.ts` (gộp 2 bản trùng lặp).
- 4.4: chunk index 744KB → 349KB (gzip 222 → 108KB).
- 5.6 (typography), 5.2 (card mobile), 5.9 (a11y pass), 4.2 (tách file lớn), 6.1, 6.3, 6.4: **chưa làm**.
- 6.2: pg_cron `mark-overdue-fees-daily` chạy 0h giờ VN mỗi ngày (migration 029).

*Cập nhật lần cuối: 2026-07-10.*
