# Kế hoạch tối ưu & hoàn thiện — Doraemon Kindergarten Management (v2)

> Ngày đánh giá: 2026-07-04 | Thay thế bản kế hoạch 2026-06-25 (các hạng mục GĐ1–GĐ4 cũ đã hoàn thành gần hết)

---

## 1. Hiện trạng tổng thể

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Build production | ✅ OK (9.6s) | Chunk `index` 742KB (222KB gzip) — hơi lớn |
| Test | ✅ 28 tests / 4 files pass | Coverage còn mỏng |
| Type check (`npm run lint`) | ✅ Đã fix | Lỗi `require` trong `ClassForm.test.tsx:28` đã sửa (2026-07-04) |
| CI (GitHub Actions) | ✅ Xanh trở lại | |
| Kiểu `any` | ⚠️ 244 chỗ | Tăng so với 188 lúc lập plan cũ |
| Supabase security advisors | ⚠️ 35 cảnh báo | Chi tiết mục 2 |
| Supabase performance advisors | ⚠️ 68 cảnh báo | Chi tiết mục 4 |
| Edge Functions | ⚠️ Chỉ `create-staff-account` deployed | **`zalo-send` chưa deploy** dù frontend đã gọi |
| Schema drift | ⚠️ Có | Hàm `create_parent_account_by_phone` + nhóm hàm `*_unaccent` tồn tại trên DB nhưng không có trong `supabase/migrations/` |
| Repo GitHub | ✅ Đã chuyển Private (2026-07-04) | Trước đó public, chứa dữ liệu thật trẻ em |
| Git history | ✅ Đã purge (2026-07-04) | Dùng `git filter-repo` xóa 3 file Excel + 1 ảnh + `_Delete/` khỏi toàn bộ lịch sử, force-push cần thực hiện tiếp |

---

## 2. Phát hiện bảo mật (ưu tiên cao nhất)

### 2.1 🔴 RPC `create_parent_account_by_phone` — anon gọi được, không kiểm tra vai trò
- SECURITY DEFINER, `anon` + `authenticated` đều EXECUTE được, **không kiểm tra caller là admin**.
- Tạo tài khoản bằng cách **INSERT thẳng vào `auth.users`** với mật khẩu cứng `'123456'` — chính pattern này đã gây bug 500 NULL-token trước đây (migration 017 phải vá).
- Chỉ tồn tại trên DB, không có trong migrations → không review được qua git.
- **Chưa xử lý** — cần làm ở GĐ2.

### 2.2 ✅ Dữ liệu thật của trẻ em trong git — ĐÃ XỬ LÝ (2026-07-04)
- Repo `caixeng/qa-doraemon` đã chuyển từ **public → private**.
- Đã dùng `git filter-repo` xóa vĩnh viễn khỏi toàn bộ lịch sử: `DRM- DANH SÁCH HỌC SINH...xlsx`, `DSGVNV DORAEMON.xlsx`, `rpDSHocSinhCaTruong (72).xlsx`, ảnh `368411483_...jpg`, và thư mục `_Delete/`.
- **Còn lại**: force-push nhánh đã rewrite lên `origin/main` để hoàn tất (chưa làm — xem GĐ1.4b).
- Lưu ý: dữ liệu có thể đã bị crawl/cache trong thời gian repo còn public — rewrite chỉ ngăn rò rỉ tiếp diễn, không "thu hồi" được bản đã lộ.

### 2.3 🟡 Chính sách mật khẩu yếu
- Mật khẩu mặc định `123456` cho toàn bộ GV/NV và phụ huynh, không bắt đổi lần đầu.
- Leaked-password protection (HaveIBeenPwned) đang **tắt** trong Supabase Auth.

### 2.4 🟡 Vệ sinh hàm DB (advisor WARN x33)
- 11 hàm SECURITY DEFINER `anon`/`authenticated` execute được (revoke, chỉ giữ `service_role` nơi cần).
- 11 hàm chưa `SET search_path` cố định.
- Extension `unaccent` nằm trong schema `public`.

### 2.5 🟢 Ghi nhận thêm
- `.env.local` chứa `SUPABASE_ACCESS_TOKEN` + DB password — đã gitignore đúng, không commit, không trong history.
- Zalo token đã chuyển qua Edge Function proxy ở phía frontend — nhưng xem 3.1 (function chưa deploy).

---

## 3. Tính năng chưa chạy thật

### 3.1 Zalo ZNS — frontend gọi function không tồn tại
`src/lib/zalo.ts` gọi `functions/v1/zalo-send`, code function có ở `supabase/functions/zalo-send/` nhưng **chưa deploy** → mọi nút "Gửi Zalo" (nhắc học phí, thông báo, điểm danh) đang fail lúc runtime.

### 3.2 Tự động gửi khi điểm danh / học phí quá hạn
Vẫn chưa có luồng auto-send (chỉ gửi thủ công từ UI).

---

## 4. Nợ hiệu năng database (advisor)

| Loại | Số lượng | Xử lý |
|---|---|---|
| `multiple_permissive_policies` | 30 (WARN) | Gộp các policy trùng action/role thành 1 policy mỗi bảng |
| `auth_rls_initplan` | 9 (WARN) | Bọc `auth.uid()`/`current_setting()` trong `(select ...)` |
| `unindexed_foreign_keys` | 11 (INFO) | Thêm index cho FK (attendance, enrollments…) |
| `unused_index` | 18 (INFO) | Cân nhắc drop sau khi có traffic thật |

---

## 5. Nợ chất lượng code

- **244 chỗ `any`** — nhiều nhất: `GuardianPortal` (14), `Attendance` (12), `Health`/`Evaluations` (11), `Teachers` (10).
- **File quá lớn** (>600 dòng): `Attendance.tsx` 747, `Finance.tsx` 746, `ClassRollCallTab.tsx` 704, `useStudents.ts` 695, `Students.tsx` 607, `Nutrition.tsx` 602.
- **Test mỏng**: chỉ formatters, receipt, classUtils, ClassForm. Chưa test: useStudents, logic học phí/quá hạn, Attendance.
- **Bundle**: chunk `index` 742KB — cần `manualChunks` tách vendor (react, supabase, motion).
- **Rác trong repo**: 2 file plan chồng nhau (`implementation_plan.md` đã lỗi thời, còn nằm trong tree — cần xóa ở commit thường, không cần rewrite history vì không nhạy cảm).

---

## 6. Kế hoạch thực hiện

### GĐ 1 — Vá ngay (≤ 1 ngày)
- [x] **1.1** Sửa lỗi tsc `require` trong `ClassForm.test.tsx` → dùng `import` — CI xanh trở lại
- [ ] **1.2** Deploy Edge Function `zalo-send` (kèm secrets Zalo token) — hoặc ẩn nút gửi Zalo cho tới khi deploy
- [ ] **1.3** REVOKE EXECUTE của `anon`/`authenticated` trên các hàm SECURITY DEFINER (`create_parent_account_by_phone`, `fix_auth_user_tokens`, …); thêm kiểm tra vai trò admin trong `create_parent_account_by_phone`
- [x] **1.4a** Chuyển repo GitHub sang Private
- [x] **1.4b** Xóa khỏi lịch sử git: 3 file Excel dữ liệu thật, ảnh jpg, `_Delete/` (dùng `git filter-repo`)
- [ ] **1.4c** Force-push nhánh đã rewrite lên `origin/main` để hoàn tất; xóa `implementation_plan.md` lỗi thời (commit thường); thêm `*.xlsx` vào `.gitignore`
- [ ] **1.5** Bật leaked-password protection trong Supabase Auth

### GĐ 2 — Bảo mật tài khoản (2–3 ngày)
- [ ] **2.1** Chuyển tạo tài khoản phụ huynh sang Edge Function dùng Admin API (như `create-staff-account`), bỏ INSERT trực tiếp `auth.users`
- [ ] **2.2** Bắt đổi mật khẩu lần đầu đăng nhập (flag `must_change_password` + màn hình đổi mật khẩu)
- [ ] **2.3** Đồng bộ schema drift: dump các hàm/policy chỉ có trên DB thành migration `019_sync_db_functions.sql`
- [ ] **2.4** `SET search_path` cho 11 hàm; move `unaccent` sang schema `extensions`

### GĐ 3 — Hiệu năng DB (1–2 ngày)
- [ ] **3.1** Migration fix 9 policy `auth_rls_initplan` (bọc `(select auth.uid())`)
- [ ] **3.2** Gộp 30 multiple permissive policies
- [ ] **3.3** Index cho 11 FK chưa có index
- [ ] **3.4** Rà 18 unused index sau 2–4 tuần chạy thật rồi mới drop

### GĐ 4 — Chất lượng code (liên tục, ~1 tuần rải)
- [ ] **4.1** Giảm `any` theo thứ tự: GuardianPortal → Attendance → Health/Evaluations → Teachers (dùng type từ `database.ts`)
- [ ] **4.2** Tách các file >600 dòng thành component/hook con (ưu tiên Attendance, Finance)
- [ ] **4.3** Thêm test cho logic tiền: tính học phí, trạng thái overdue, và hooks useStudents
- [ ] **4.4** `build.rollupOptions.output.manualChunks` tách vendor để giảm chunk index 742KB

### GĐ 5 — Hoàn thiện tính năng (tùy chọn)
- [ ] **5.1** Auto gửi Zalo khi điểm danh vắng (sau khi 1.2 xong) — trigger hoặc gọi từ luồng lưu điểm danh
- [ ] **5.2** Cron `mark_overdue_fees()` chạy hằng ngày (pg_cron hoặc scheduled Edge Function) + auto nhắc học phí
- [ ] **5.3** Bật lại PWA đúng cách (hiện `sw.js` là self-destruct để xóa cache cũ) — chỉ làm khi cần offline

> **Ưu tiên: GĐ1 (còn lại 1.2, 1.3, 1.4c, 1.5) > GĐ2 > GĐ3 > GĐ4 > GĐ5.**

---

*Cập nhật lần cuối: 2026-07-04 — dựa trên: build/test/tsc local, Supabase advisors (35 security / 68 performance), danh sách Edge Functions deployed, soát mã nguồn, và thao tác xử lý sự cố dữ liệu trẻ em bị public trên GitHub.*
