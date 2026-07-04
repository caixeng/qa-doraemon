import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "../../lib/utils";

interface MobileFilterToggleProps {
  children: ReactNode;
  hasActiveFilters?: boolean;
}

/**
 * Wraps secondary filter controls (selects, date pickers, etc.) that sit
 * next to a search box. On mobile they're collapsed behind a toggle icon;
 * from `md:` up they're always shown, unchanged from the desktop layout.
 */
export function MobileFilterToggle({ children, hasActiveFilters }: MobileFilterToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "md:hidden relative shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer",
          open
            ? "bg-primary text-on-primary border-primary"
            : "border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-high"
        )}
        aria-label="Bộ lọc"
        aria-expanded={open}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {hasActiveFilters && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error" />
        )}
      </button>

      <div
        className={cn(
          "w-full flex-wrap gap-2.5 items-center",
          open ? "flex" : "hidden",
          "md:flex md:w-auto"
        )}
      >
        {children}
      </div>
    </>
  );
}
