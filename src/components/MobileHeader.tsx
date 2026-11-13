import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Moon, Sun, Search } from "lucide-react";
import { getMobileRouteMeta } from "../config/mobileRouteMeta";
import { Avatar } from "./ui/Avatar";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from "../context/ThemeContext";
import { useUIStore } from "../stores/uiStore";

interface MobileHeaderProps {
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenSearch,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const setMobileMoreOpen = useUIStore((state) => state.setMobileMoreOpen);

  const isHome = pathname === "/";
  const meta = getMobileRouteMeta(pathname);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(meta.parentPath);
    }
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 transition-colors duration-200 pt-[env(safe-area-inset-top)]">
      <div className="h-14 flex items-center justify-between px-3">
        {/* Bên trái: Trang chủ = Logo trường; Trang con = Nút quay lại + Tiêu đề */}
        {isHome ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.jpg"
              alt="Doraemon Kindergarten Logo"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 shrink-0 shadow-2xs"
            />
            <div className="min-w-0">
              <h1 className="text-[15px] font-extrabold text-primary truncate leading-tight">
                Mầm Non Doraemon
              </h1>
              <p className="text-[10px] text-on-surface-variant font-medium truncate">
                Hệ thống quản lý mầm non
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            {meta.showBack && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Quay lại"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-on-surface" />
              </button>
            )}
            <h1 className={`truncate text-[15px] font-extrabold text-on-surface leading-tight ${meta.showBack ? "" : "pl-1"}`}>
              {meta.title}
            </h1>
          </div>
        )}

        {/* Bên phải: Nút Đổi giao diện, Thông báo, Avatar mở menu */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Nút tìm kiếm nếu được cấp */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Tìm kiếm"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Đổi Theme nhanh */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Đổi giao diện sáng/tối"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-on-surface-variant" />
            )}
          </button>

          {/* Nút Thông báo */}
          <button
            type="button"
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else {
                navigate("/notifications");
              }
            }}
            aria-label="Xem thông báo"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
            )}
          </button>

          {/* Avatar người dùng -> bấm để mở More Sheet */}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            aria-label="Mở menu quản lý & hồ sơ"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:scale-95 cursor-pointer focus:outline-none"
          >
            <Avatar
              src={user?.avatar_url || undefined}
              name={user?.full_name || "Doraemon"}
              className="w-8 h-8 rounded-full ring-2 ring-primary/20 shrink-0"
            />
          </button>
        </div>
      </div>
    </header>
  );
};
