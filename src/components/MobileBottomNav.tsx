import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { getMobileTabItems } from "../config/navigation";
import { useSlidePanelSafe } from "../context/SlidePanelContext";

/** Vạch nhỏ trang trí phía trên mục đang chọn (theo chuẩn qlda-ddcn-ht) */
const ActiveMark: React.FC<{ show: boolean }> = ({ show }) => (
  <span
    aria-hidden="true"
    className={cn(
      "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-primary transition-opacity duration-200",
      show ? "opacity-100" : "opacity-0"
    )}
  />
);

/**
 * Enhanced fixed bottom tab bar for mobile.
 * Features 4 main navigation tabs + elevated Floating Action Button (FAB) (+) in center
 * and a "Quản lý" tab opening the MobileMoreSheet.
 */
export function MobileBottomNav() {
  const userRole = useAuthStore((state) => state.user?.role);
  const setMobileMoreOpen = useUIStore((state) => state.setMobileMoreOpen);
  const setMobileQuickActionOpen = useUIStore((state) => state.setMobileQuickActionOpen);
  const slidePanel = useSlidePanelSafe();

  const tabs = getMobileTabItems(userRole);
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 3);

  const handleTabClick = () => {
    slidePanel?.closeAllPanels();
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant/60 flex justify-between items-center h-16 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom)+0.25rem)]"
      style={{
        transform: "translateZ(0)",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        willChange: "transform",
      }}
      aria-label="Điều hướng di động"
    >
      {/* Left Navigation Tabs */}
      {leftTabs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={handleTabClick}
            className={({ isActive }) =>
              cn(
                "relative flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-all active:scale-95",
                isActive ? "text-primary font-bold" : "text-on-surface-variant font-medium hover:text-on-surface"
              )
            }
          >
            {({ isActive }) => (
              <>
                <ActiveMark show={isActive} />
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10.5px] truncate max-w-full px-1">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      {/* Center Elevated Floating Action Button (FAB) */}
      <div className="flex-1 flex justify-center items-center h-full relative -top-3">
        <button
          type="button"
          onClick={() => {
            slidePanel?.closeAllPanels();
            setMobileQuickActionOpen(true);
          }}
          aria-label="Thao tác nhanh"
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-primary/80 text-on-primary flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-surface active:scale-90 transition-transform cursor-pointer"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </div>

      {/* Right Navigation Tabs */}
      {rightTabs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={handleTabClick}
            className={({ isActive }) =>
              cn(
                "relative flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-all active:scale-95",
                isActive ? "text-primary font-bold" : "text-on-surface-variant font-medium hover:text-on-surface"
              )
            }
          >
            {({ isActive }) => (
              <>
                <ActiveMark show={isActive} />
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10.5px] truncate max-w-full px-1">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      {/* "Quản lý" Sheet Trigger */}
      <button
        type="button"
        onClick={() => {
          slidePanel?.closeAllPanels();
          setMobileMoreOpen(true);
        }}
        className="relative flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-on-surface-variant hover:text-on-surface font-medium active:scale-95 cursor-pointer"
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10.5px] truncate max-w-full px-1">Menu</span>
      </button>
    </nav>
  );
}
