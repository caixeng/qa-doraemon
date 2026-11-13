import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { MobileQuickActionModal } from './mobile/MobileQuickActionModal';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { SlidePanelContainer } from './ui';
import { cn } from '../lib/utils';

/**
 * Main application layout with responsive shell:
 * - Desktop: Sidebar + Topbar
 * - Mobile: MobileHeader + MobileBottomNav + MobileMoreSheet
 */
export function AppLayout() {
  const { 
    sidebarCollapsed, 
    mobileMoreOpen, 
    setMobileMoreOpen, 
    mobileQuickActionOpen,
    setMobileQuickActionOpen,
    toggleSidebar 
  } = useUIStore();
  const { user } = useAuthStore();

  return (
    <div className="flex bg-background h-full w-full font-inter text-on-surface overflow-hidden">
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

      {/* Mobile Header (dedicated for small screens < md) */}
      <MobileHeader />

      {/* Desktop Topbar (screens >= md) */}
      <div className="hidden md:block">
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
      </div>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 pt-14 md:pt-[96px] h-full overflow-y-auto px-3 md:px-8 pb-24 md:pb-8 transition-all duration-300 [-webkit-overflow-scrolling:touch]",
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[280px]"
        )}
      >
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar & bottom sheets */}
      <MobileBottomNav />
      <MobileMoreSheet isOpen={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} />
      <MobileQuickActionModal isOpen={mobileQuickActionOpen} onClose={() => setMobileQuickActionOpen(false)} />

      {/* SlidePanel Container */}
      <SlidePanelContainer isSidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
