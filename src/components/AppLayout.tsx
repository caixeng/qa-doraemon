import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { SlidePanelContainer } from './ui';
import { cn } from '../lib/utils';


/**
 * Main application layout with sidebar, topbar, and content area.
 * Used as a wrapper for all authenticated routes.
 */
export function AppLayout() {
  const { sidebarCollapsed, mobileMoreOpen, setMobileMoreOpen, toggleSidebar } =
    useUIStore();
  const { user } = useAuthStore();

  return (
    <div className="flex bg-background min-h-screen font-inter text-on-surface">
      {/* Sidebar (desktop only) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        user={
          user
            ? {
                name: user.full_name,
                role: user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giáo viên' : 'Nhân viên',
                avatar: user.avatar_url,
              }
            : undefined
        }
      />

      {/* Topbar */}
      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        user={
          user
            ? {
                name: user.full_name,
                role: user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giáo viên' : 'Nhân viên',
                avatar: user.avatar_url || undefined,
              }
            : undefined
        }
        onLogout={useAuthStore.getState().logout}
      />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 pt-14 md:pt-[96px] min-h-screen px-3 md:px-8 pb-32 md:pb-8 overflow-y-auto transition-all duration-300 [-webkit-overflow-scrolling:touch]",
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[280px]"
        )}
      >
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar (replaces sidebar on small screens) */}
      <MobileBottomNav />
      <MobileMoreSheet isOpen={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} />

      {/* SlidePanel Container */}
      <SlidePanelContainer isSidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
