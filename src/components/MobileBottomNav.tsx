import { NavLink } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { getMobileTabItems } from "../config/navigation";

/**
 * Fixed bottom tab bar shown on mobile in place of the desktop sidebar.
 * Shows up to 4 curated destinations (falling back to the next available
 * item per role if a preferred route isn't accessible) plus a "Quản lý"
 * button that opens the full menu as a bottom sheet.
 */
export function MobileBottomNav() {
  const userRole = useAuthStore((state) => state.user?.role);
  const setMobileMoreOpen = useUIStore((state) => state.setMobileMoreOpen);

  const tabs = getMobileTabItems(userRole);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-container border-t border-outline-variant flex items-stretch h-16 pb-[env(safe-area-inset-bottom)]"
      aria-label="Điều hướng chính"
    >
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                isActive ? "text-primary" : "text-on-surface-variant"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-semibold truncate max-w-full px-1">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={() => setMobileMoreOpen(true)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-on-surface-variant cursor-pointer"
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] font-semibold">Quản lý</span>
      </button>
    </nav>
  );
}
