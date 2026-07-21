import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bell,
  ChevronRight,
  LogOut,
  Settings,
  User,
  X,
  Sun,
  Moon,
  Calendar,
  Check,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Avatar } from "./ui/Avatar";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { useTheme, PRIMARY_COLORS } from "../context/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { subscribeToTable } from "../lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

/* ── Types ─────────────────────────────────────────── */

export interface TopbarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  user?: { name: string; role: string; avatar?: string };
  onLogout?: () => void;
}

/* ── Route title map ───────────────────────────────── */

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/students": "Học Sinh",
  "/teachers": "Giáo Viên",
  "/classes": "Lớp Học",
  "/attendance": "Điểm Danh",
  "/finance": "Tài Chính",
  "/nutrition": "Dinh Dưỡng",
  "/weekly-plans": "Kế Hoạch Tuần",
  "/health": "Sức Khỏe",
  "/evaluations": "Đánh Giá Phát Triển",
  "/notifications": "Thông Báo",
  "/settings": "Cài Đặt",
};

/* ── Helpers ───────────────────────────────────────── */

const timeAgo = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
  } catch {
    return "Vừa xong";
  }
};

/* ── useDebounce hook ──────────────────────────────── */

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/* ── Topbar Component ──────────────────────────────── */

export function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
  user,
  onLogout,
}: TopbarProps) {
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { theme, setTheme, primaryColor, setPrimaryColor, zoom, setZoom } = useTheme();
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId);
  const setSelectedAcademicYearId = useAppStore((state) => state.setSelectedAcademicYearId);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // Fetch topbar notifications
  const { data: notificationsResponse } = useQuery({
    queryKey: ['topbar-notifications', currentUser?.school_id],
    queryFn: () => {
      if (!currentUser?.school_id) return { data: { data: [], count: 0 }, error: null, count: 0 };
      return api.getAll<any>(
        'notifications',
        { page: 1, pageSize: 10, sortBy: 'sent_at', sortOrder: 'desc' },
        { filters: { school_id: currentUser.school_id } }
      );
    },
    enabled: !!currentUser?.school_id
  });
  
  const notificationsList = notificationsResponse?.data?.data || [];
  
  // Realtime subscription
  useEffect(() => {
    if (!currentUser?.school_id) return;

    const channel = subscribeToTable('notifications', () => {
      queryClient.invalidateQueries({ queryKey: ['topbar-notifications', currentUser.school_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser?.school_id, queryClient]);

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await api.update('notifications', id, { is_read: true, updated_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ['topbar-notifications', currentUser?.school_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch academic years
  const { data: yearsResponse } = useQuery({
    queryKey: ['academic-years-topbar'],
    queryFn: () => api.getAll<any>('academic_years', { page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'desc' }),
  });
  const yearsList = yearsResponse?.data?.data || [];

  // Auto select active year if not selected yet
  useEffect(() => {
    if (!selectedAcademicYearId && yearsList.length > 0) {
      const currentYear = yearsList.find((y: any) => y.is_current) || yearsList[0];
      if (currentYear) {
        setSelectedAcademicYearId(currentYear.id);
      }
    }
  }, [yearsList, selectedAcademicYearId, setSelectedAcademicYearId]);

  // Fetch users for online status display
  const { data: onlineUsersResponse } = useQuery({
    queryKey: ['online-users', currentUser?.school_id],
    queryFn: () => {
      if (!currentUser?.school_id) return { data: { data: [], count: 0 } };
      return api.getAll<any>(
        'users',
        { page: 1, pageSize: 30 },
        { filters: { school_id: currentUser.school_id, is_active: true } }
      );
    },
    enabled: !!currentUser?.school_id
  });
  
  const onlineUsersList = onlineUsersResponse?.data?.data || [];
  const otherOnlineUsers = onlineUsersList
    .filter((u: any) => u.id !== currentUser?.id)
    .slice(0, 4); // Show max 4 users

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchValue, 300);

  // Page title from route
  const pageTitle = routeTitles[location.pathname] || "Trang chủ";
  const breadcrumbParts = location.pathname.split("/").filter(Boolean);

  // Close dropdowns on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
      setShowNotifications(false);
    }
    if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
      setShowUserMenu(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Close on route change
  useEffect(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const unreadCount = notificationsList.filter((n: any) => !n.is_read).length;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex items-center justify-between gap-4",
        "h-14 md:h-[72px] px-4 md:px-6 lg:px-8",
        "bg-surface-container-lowest md:bg-surface-container-lowest/80 border-b border-outline-variant md:backdrop-blur-md",
        // Offset for sidebar
        "left-0 md:left-16",
        !sidebarCollapsed && "md:left-[280px]"
      )}
      style={{
        transition: "left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)",
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        willChange: "transform",
      }}
    >
      {/* ── Left section ────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Breadcrumb */}
        <div className="hidden sm:flex items-center min-w-0">
          <div className="flex items-center gap-1 text-[12px] text-on-surface-variant whitespace-nowrap overflow-hidden">
            <span className="hover:text-on-surface transition-colors cursor-pointer">
              Trang chủ
            </span>
            {breadcrumbParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <span
                  className={cn(
                    i === breadcrumbParts.length - 1
                      ? "text-on-surface font-medium"
                      : "hover:text-on-surface transition-colors cursor-pointer"
                  )}
                >
                  {routeTitles[`/${breadcrumbParts.slice(0, i + 1).join("/")}`] || part}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Mobile page title */}
        <h2 className="sm:hidden text-[14px] font-bold font-playfair text-on-surface truncate">
          {pageTitle}
        </h2>

        {/* Academic Year Selector — Moved to left section for better layout hierarchy */}
        <div className="relative flex items-center justify-center w-8 h-8 md:w-auto md:justify-start md:gap-1.5 md:px-3 md:py-1.5 md:h-10 bg-surface-container border border-outline-variant/60 rounded-full select-none shrink-0 ml-2">
          <Calendar className="w-4 h-4 text-primary shrink-0 pointer-events-none" />
          <span className="hidden md:inline text-xs font-bold text-on-surface truncate max-w-[140px] pointer-events-none">
            {yearsList.find((y: any) => y.id === selectedAcademicYearId)?.name || 'Chọn năm học'}
          </span>
          <select
            value={selectedAcademicYearId || ""}
            onChange={(e) => setSelectedAcademicYearId(e.target.value || null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Chọn năm học"
          >
            {selectedAcademicYearId === null && (
              <option value="" disabled className="text-on-surface-variant bg-surface-container-low font-medium">Chọn năm học</option>
            )}
            {yearsList.map((y: any) => (
              <option key={y.id} value={y.id} className="text-on-surface bg-surface-container-lowest font-semibold">
                {y.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Right section ───────────────── */}
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        {/* Online Users Avatar Stack */}
        {otherOnlineUsers.length > 0 && (
          <div className="flex items-center gap-1.5 md:gap-2 mr-1 md:mr-3 border-r border-outline-variant/40 pr-3 md:pr-4 h-10 select-none">
            <div className="flex -space-x-2 md:-space-x-3 overflow-hidden">
              {otherOnlineUsers.map((u: any) => (
                <div 
                  key={u.id} 
                  className="relative group transition-transform duration-200 hover:-translate-y-0.5 hover:z-10"
                  title={`${u.full_name} - Đang hoạt động`}
                >
                  <Avatar
                    src={u.avatar_url}
                    name={u.full_name || "U"}
                    size="sm"
                    status="online"
                    className="ring-2 ring-surface-container-lowest"
                  />
                </div>
              ))}
            </div>
            <span className="hidden sm:inline text-[11px] font-bold text-on-surface-variant/80 pl-1 md:pl-2">
              +{otherOnlineUsers.length} online
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
          aria-label="Đổi giao diện"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 md:w-5 md:h-5" />
          ) : (
            <Moon className="w-4 h-4 md:w-5 md:h-5" />
          )}
        </button>

        {/* ── Notifications ─────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className={cn(
              "relative w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center",
              "text-on-surface-variant transition-all",
              showNotifications
                ? "bg-primary-container text-on-primary-container"
                : "hover:bg-surface-container-high hover:text-on-surface"
            )}
            aria-label="Thông báo"
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-surface rounded-2xl shadow-xl border border-outline-variant/60 overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/40">
                  <h3 className="text-[14px] font-bold text-on-surface">
                    Thông báo
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[12px] font-semibold text-primary bg-primary-container px-2 py-0.5 rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notificationsList.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant/70 italic text-xs font-semibold">
                      📭 Hộp thư trống
                    </div>
                  ) : (
                    notificationsList.map((notif: any) => (
                      <button
                        key={notif.id}
                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-surface-container/60 transition-colors border-b border-outline-variant/20 last:border-0 cursor-pointer",
                          !notif.is_read && "bg-primary-container/20"
                        )}
                      >
                        <div className="flex gap-3">
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          )}
                          <div className={cn("min-w-0", notif.is_read && "ml-5")}>
                            <p className="text-[13px] font-semibold text-on-surface truncate">
                              {notif.title}
                            </p>
                            <p className="text-[12px] text-on-surface-variant mt-0.5 line-clamp-2">
                              {notif.content}
                            </p>
                            <p className="text-[12px] text-on-surface-variant/70 mt-1">
                              {timeAgo(notif.sent_at || notif.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-outline-variant/40">
                  <button
                    onClick={() => navigate("/notifications")}
                    className="w-full text-center text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors py-1 cursor-pointer"
                  >
                    Xem tất cả thông báo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── User menu ─────────────────── */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className={cn(
              "flex items-center gap-2 p-1 pr-1 md:pr-3 rounded-full transition-all",
              showUserMenu
                ? "bg-surface-container-high"
                : "hover:bg-surface-container"
            )}
            aria-label="Menu người dùng"
          >
            <Avatar
              src={user?.avatar}
              name={user?.name || "U"}
              size="sm"
              className="ring-2 ring-primary/30"
            />
            {user && (
              <span className="hidden md:block text-[13px] font-semibold text-on-surface max-w-[100px] truncate">
                {user.name}
              </span>
            )}
          </button>

          {/* User dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-2xl shadow-xl border border-outline-variant/60 overflow-hidden z-50"
              >
                {/* User info header */}
                {user && (
                  <div className="px-4 py-3 border-b border-outline-variant/40">
                    <p className="text-[14px] font-semibold text-on-surface truncate">
                      {user.name}
                    </p>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {user.role}
                    </p>
                  </div>
                )}

                <div className="py-1.5">
                  {[
                    { icon: User, label: "Hồ sơ", action: () => navigate('/settings?tab=profile') },
                    { icon: Settings, label: "Cài đặt", action: () => navigate('/settings') },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-on-surface-variant" />
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="border-t border-outline-variant/40 py-3 px-4 space-y-3.5">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Cài đặt cá nhân</div>
                  
                  {/* Theme selection */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-on-surface-variant">Giao diện nền</div>
                    <div className="flex items-center gap-1 rounded-lg bg-surface-variant p-0.5">
                      {[
                        { value: 'light' as const, icon: Sun, label: 'Sáng' },
                        { value: 'dark' as const, icon: Moon, label: 'Tối' },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          onClick={() => setTheme(value)}
                          className={cn(
                            'flex-1 flex cursor-pointer items-center justify-center rounded-md py-1.5 transition-all text-xs font-semibold gap-1',
                            theme === value
                              ? 'border border-outline-variant bg-surface shadow-sm text-on-surface'
                              : 'text-on-surface-variant hover:text-on-surface',
                          )}
                        >
                          <Icon size={13} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Color selection */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-on-surface-variant">Màu sắc chủ đạo</div>
                    <div className="grid grid-cols-9 gap-1.5 justify-items-center rounded-lg bg-surface-variant p-2">
                      {PRIMARY_COLORS.map(({ id, name, hex }) => {
                        const active = primaryColor === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setPrimaryColor(id)}
                            title={name}
                            className={cn(
                              'grid h-5 w-5 place-items-center rounded-full transition-transform hover:scale-110 cursor-pointer',
                              active && 'scale-110',
                            )}
                            style={{
                              background: hex,
                              ...(active
                                ? { boxShadow: `0 0 0 2px var(--color-surface, #fff), 0 0 0 3.5px ${hex}` }
                                : {}),
                            }}
                          >
                            {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      Đang chọn:{' '}
                      <span className="font-bold text-on-surface">
                        {PRIMARY_COLORS.find((c) => c.id === primaryColor)?.name}
                      </span>
                    </p>
                  </div>

                  {/* Tỷ lệ hiển thị Zoom */}
                  <div className="space-y-1.5 pt-1.5 border-t border-outline-variant/30">
                    <div className="flex justify-between items-center text-[11px] font-semibold text-on-surface-variant">
                      <span>Tỷ lệ hiển thị</span>
                      <span className="font-bold text-primary">{zoom}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoom(Math.max(80, zoom - 10))}
                        disabled={zoom <= 80}
                        title="Thu nhỏ"
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-outline-variant bg-surface-variant hover:bg-surface-container-high text-on-surface-variant transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <input
                        type="range"
                        min="80"
                        max="120"
                        step="10"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-lg bg-surface-variant appearance-none cursor-pointer accent-primary focus:outline-none"
                        style={{
                          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((zoom - 80) / 40) * 100}%, var(--color-surface-container-high) ${((zoom - 80) / 40) * 100}%, var(--color-surface-container-high) 100%)`
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setZoom(Math.min(120, zoom + 10))}
                        disabled={zoom >= 120}
                        title="Phóng to"
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-outline-variant bg-surface-variant hover:bg-surface-container-high text-on-surface-variant transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ZoomIn size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-outline-variant/40 py-1.5">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-error hover:bg-error-container/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
