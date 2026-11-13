export interface MobileRouteMeta {
  /** Tiêu đề hiển thị trên thanh header điện thoại */
  title: string;
  /** Là màn hình gốc của thanh điều hướng đáy (không hiện nút back) */
  isTabRoot: boolean;
  /** Có hiện nút quay lại hay không */
  showBack: boolean;
  /** Nơi quay về khi vào trực tiếp từ liên kết ngoài */
  parentPath: string;
}

/** Các màn hình chính cố định trên thanh điều hướng đáy */
const TAB_ROOTS = new Set(['/', '/students', '/attendance', '/notifications']);

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Trường Mầm Non Doraemon',
  '/students': 'Quản Lý Học Sinh',
  '/teachers': 'Quản Lý Giáo Viên',
  '/classes': 'Danh Sách Lớp Học',
  '/attendance': 'Điểm Danh Học Sinh',
  '/teacher-attendance': 'Điểm Danh Giáo Viên',
  '/finance': 'Tài Chính & Học Phí',
  '/nutrition': 'Dinh Dưỡng & Thực Đơn',
  '/weekly-plans': 'Kế Hoạch Tuần',
  '/health': 'Sức Khỏe & Y Tế',
  '/evaluations': 'Đánh Giá Phát Triển',
  '/reports': 'Báo Cáo & Thống Kê',
  '/audit-log': 'Nhật Ký Hoạt Động',
  '/notifications': 'Thông Báo',
  '/settings': 'Cài Đặt Hệ Thống',
  '/guardian': 'Cổng Phụ Huynh',
};

/**
 * Xác định tiêu đề, trạng thái nút quay lại và đường dẫn cha từ pathname hiện tại
 */
export function getMobileRouteMeta(pathname: string): MobileRouteMeta {
  const segments = pathname.split('/').filter(Boolean);
  const rootPath = segments.length ? `/${segments[0]}` : '/';
  const isChild = segments.length > 1;
  const isTabRoot = !isChild && TAB_ROOTS.has(rootPath);

  const title = ROUTE_TITLES[rootPath] ?? (isChild ? 'Chi Tiết' : 'Doraemon');

  return {
    title,
    isTabRoot,
    showBack: !isTabRoot && pathname !== '/',
    parentPath: isChild ? rootPath : '/',
  };
}
