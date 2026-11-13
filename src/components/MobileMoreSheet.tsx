import { NavLink, useNavigate } from "react-router-dom";
import { MobileBottomSheet } from "./mobile/MobileBottomSheet";
import { 
  LogOut, 
  Sun, 
  Moon, 
  Check, 
  Palette, 
  ShieldCheck, 
  UserCheck 
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { getMobileMoreItems } from "../config/navigation";
import { useTheme, PRIMARY_COLORS } from "../context/ThemeContext";
import { Avatar } from "./ui/Avatar";
import { cn } from "../lib/utils";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ isOpen, onClose }: MobileMoreSheetProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();

  const userRole = user?.role;
  const items = getMobileMoreItems(userRole);

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên mầm non',
    staff: 'Nhân viên nhà trường',
    parent: 'Phụ huynh học sinh',
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Danh mục & Cài đặt hệ thống"
    >
      <div className="space-y-5 pb-4">
        {/* User Info Header Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60">
          <Avatar
            src={user?.avatar_url}
            name={user?.full_name || 'User'}
            className="w-12 h-12 rounded-2xl shadow-xs ring-2 ring-primary/20 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-on-surface truncate">
              {user?.full_name || 'Người dùng'}
            </h4>
            <p className="text-xs text-on-surface-variant truncate">
              {user?.email || '—'}
            </p>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/10 text-primary">
              <ShieldCheck className="w-3 h-3" />
              <span>{roleLabels[userRole || ''] || 'Thành viên'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Items Grid */}
        <div className="space-y-2">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant px-1">
            Menu chức năng
          </h5>
          <div className="grid grid-cols-2 gap-2.5">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 p-3 rounded-2xl border transition-all text-xs font-bold active:scale-98",
                      isActive
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-surface border-outline-variant/60 text-on-surface hover:bg-surface-container-high"
                    )
                  }
                >
                  <div className="w-8.5 h-8.5 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Quick App Customization */}
        <div className="space-y-3 pt-3 border-t border-outline-variant/40">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant px-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>Giao diện & Chủ đề</span>
          </h5>

          {/* Theme Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/60">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer",
                theme === 'light'
                  ? "bg-surface text-primary shadow-xs border border-outline-variant/40"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Sáng</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer",
                theme === 'dark'
                  ? "bg-surface text-primary shadow-xs border border-outline-variant/40"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Tối</span>
            </button>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-surface-container-low border border-outline-variant/60">
            {PRIMARY_COLORS.map(({ id, name, hex }) => {
              const active = primaryColor === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrimaryColor(id)}
                  title={name}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer",
                    active && "scale-110 ring-2 ring-offset-2 ring-offset-surface ring-primary"
                  )}
                  style={{ backgroundColor: hex }}
                >
                  {active && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs active:scale-98 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất tài khoản
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
}
