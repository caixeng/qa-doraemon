import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { getMobileMoreItems } from "../config/navigation";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Bottom sheet listing every nav destination not already in the mobile
 *  bottom tab bar — opened from the "Quản lý" tab. */
export function MobileMoreSheet({ isOpen, onClose }: MobileMoreSheetProps) {
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.user?.role);
  const items = getMobileMoreItems(userRole);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 bottom-0 bg-surface rounded-t-3xl border-t border-outline-variant/40 shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] max-h-[75vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Quản lý"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-on-surface">Quản lý</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      navigate(item.to);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[12px] font-semibold text-on-surface-variant text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
