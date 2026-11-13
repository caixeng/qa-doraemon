import { NavLink, useNavigate } from "react-router-dom";
import { MobileBottomSheet } from "./mobile/MobileBottomSheet";
import { 
  LogOut, 
  Sun, 
  Moon, 
  Check, 
  ShieldCheck,
  LucideIcon
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { mainNavItems, bottomNavItems, type UserRole, type NavItem } from "../config/navigation";
import { useTheme, PRIMARY_COLORS } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { cn } from "../lib/utils";
import { useSlidePanelSafe } from "../context/SlidePanelContext";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function MobileMoreSheet({ isOpen, onClose }: MobileMoreSheetProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const slidePanel = useSlidePanelSafe();

  const userRole = user?.role as UserRole | undefined;

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên mầm non',
    staff: 'Nhân viên',
    parent: 'Phụ huynh học sinh',
  };

  const handleNavigate = () => {
    onClose();
    slidePanel?.closeAllPanels();
  };

  const handleLogout = () => {
    onClose();
    slidePanel?.closeAllPanels();
    logout();
    navigate('/login');
  };

  // Lọc items theo vai trò
  const isAllowed = (item: NavItem) => !item.roles || (userRole && item.roles.includes(userRole));

  // Phân nhóm danh mục mầm non (theo chuẩn phân hệ chuyên nghiệp của qlda-ddcn-ht)
  const groups: NavGroup[] = [
    {
      title: "Học tập & Trẻ em",
      items: [
        mainNavItems.find(i => i.to === '/students')!,
        mainNavItems.find(i => i.to === '/classes')!,
        mainNavItems.find(i => i.to === '/attendance')!,
        mainNavItems.find(i => i.to === '/weekly-plans')!,
        mainNavItems.find(i => i.to === '/evaluations')!,
        mainNavItems.find(i => i.to === '/health')!,
      ].filter(Boolean).filter(isAllowed),
    },
    {
      title: "Nhân sự & Vận hành",
      items: [
        mainNavItems.find(i => i.to === '/teachers')!,
        mainNavItems.find(i => i.to === '/teacher-attendance')!,
        mainNavItems.find(i => i.to === '/nutrition')!,
        mainNavItems.find(i => i.to === '/finance')!,
        mainNavItems.find(i => i.to === '/reports')!,
        mainNavItems.find(i => i.to === '/audit-log')!,
      ].filter(Boolean).filter(isAllowed),
    },
    {
      title: "Hệ thống & Tiện ích",
      items: [
        mainNavItems.find(i => i.to === '/')!,
        bottomNavItems.find(i => i.to === '/notifications')!,
        bottomNavItems.find(i => i.to === '/settings')!,
        mainNavItems.find(i => i.to === '/guardian')!,
      ].filter(Boolean).filter(isAllowed),
    },
  ].filter(g => g.items.length > 0);

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Menu Chức Năng"
    >
      <div className="space-y-5 pb-6">
        {/* Thẻ thông tin cá nhân */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 shadow-2xs">
          <Avatar
            src={user?.avatar_url}
            name={user?.full_name || 'User'}
            className="w-12 h-12 rounded-2xl ring-2 ring-primary/20 shrink-0 shadow-xs"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-on-surface truncate">
              {user?.full_name || 'Người dùng'}
            </h4>
            <p className="text-[11.5px] text-on-surface-variant truncate">
              {user?.email || '—'}
            </p>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary">
              <ShieldCheck className="w-3 h-3" />
              <span>{roleLabels[userRole || ''] || 'Thành viên'}</span>
            </div>
          </div>
        </div>

        {/* Lưới phân hệ 4 cột (chuẩn iOS Launcher / qlda-ddcn-ht) */}
        {groups.map((group) => (
          <section key={group.title} className="space-y-2">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant px-1">
              {group.title}
            </h5>
            <div className="grid grid-cols-4 gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl border transition-all text-center min-h-[4.75rem] active:scale-95",
                        isActive
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-surface border-outline-variant/50 text-on-surface hover:bg-surface-container-high font-medium"
                      )
                    }
                  >
                    <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                    </div>
                    <span className="text-[10.5px] leading-tight line-clamp-2 px-0.5">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}

        {/* Cài đặt nhanh giao diện */}
        <section className="space-y-2 pt-2 border-t border-outline-variant/40">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant px-1">
            Giao diện ứng dụng
          </h5>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer",
                theme === "light"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface text-on-surface border-outline-variant/60 hover:bg-surface-container"
              )}
            >
              <Sun className="w-4 h-4" />
              <span>Giao diện Sáng</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer",
                theme === "dark"
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface text-on-surface border-outline-variant/60 hover:bg-surface-container"
              )}
            >
              <Moon className="w-4 h-4" />
              <span>Giao diện Tối</span>
            </button>
          </div>

          {/* Chọn màu sắc thương hiệu */}
          <div className="flex items-center justify-between pt-2 px-1">
            <span className="text-xs font-semibold text-on-surface-variant">Màu chủ đạo:</span>
            <div className="flex items-center gap-2">
              {PRIMARY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPrimaryColor(c.id)}
                  aria-label={`Chọn màu ${c.name}`}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ backgroundColor: c.hex }}
                >
                  {primaryColor === c.id && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Nút Đăng xuất */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-error/10 text-error hover:bg-error/15 font-bold text-xs transition-colors cursor-pointer active:scale-98 border border-error/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
}
