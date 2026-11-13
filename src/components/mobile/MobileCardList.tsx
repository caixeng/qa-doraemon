import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MobileCardItem {
  id: string | number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  fields?: { label: string; value: React.ReactNode }[];
  accentColor?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}

interface MobileCardListProps {
  items: MobileCardItem[];
  emptyMessage?: string;
  className?: string;
}

export const MobileCardList: React.FC<MobileCardListProps> = ({
  items,
  emptyMessage = 'Không có dữ liệu hiển thị',
  className,
}) => {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-2xl border border-outline-variant/60">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 md:hidden", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={cn(
            "p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-xs transition-all active:scale-[0.99] relative overflow-hidden",
            item.onClick && "cursor-pointer hover:border-primary/50"
          )}
        >
          {/* Accent bar color on left border if defined */}
          {item.accentColor && (
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: item.accentColor }}
            />
          )}

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {item.avatar && <div className="shrink-0">{item.avatar}</div>}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-on-surface leading-snug truncate">
                  {item.title}
                </h4>
                {item.subtitle && (
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
            {item.badge && <div className="shrink-0">{item.badge}</div>}
          </div>

          {/* Key-Value Fields Grid */}
          {item.fields && item.fields.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline-variant/40 text-xs">
              {item.fields.map((f, i) => (
                <div key={i} className="min-w-0">
                  <span className="text-[11px] text-on-surface-variant block truncate">{f.label}</span>
                  <span className="font-semibold text-on-surface truncate block mt-0.5">{f.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer / Actions */}
          {item.actions && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-outline-variant/40">
              {item.actions}
            </div>
          )}

          {/* Arrow Indicator if clickable and no custom actions */}
          {item.onClick && !item.actions && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">
              <ChevronRight className="w-4.5 h-4.5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
