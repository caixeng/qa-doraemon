import React, { useRef, useId } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DatePickerProps {
  mode?: 'single' | 'range' | 'month';
  value: Date | null | { start: Date | null; end: Date | null } | string;
  onChange: (value: any) => void;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  mode = 'single',
  value,
  onChange,
  label,
  error,
  helperText,
  disabled = false,
  className,
  minDate,
  maxDate,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const defaultId = useId();
  const inputId = `${defaultId}-input`;
  const startInputId = `${defaultId}-start`;
  const endInputId = `${defaultId}-end`;
  const errorId = `${defaultId}-error`;
  const helperId = `${defaultId}-helper`;
  const groupLabelId = `${defaultId}-group-label`;

  const handleIconClick = () => {
    if (disabled) return;
    if (mode === 'range') {
      startRef.current?.showPicker();
    } else {
      inputRef.current?.showPicker();
    }
  };

  const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val ? new Date(val) : null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // "YYYY-MM"
    onChange(val || null);
  };

  const handleRangeChange = (type: 'start' | 'end', val: string) => {
    const currentRange = (value as { start: Date | null; end: Date | null }) || { start: null, end: null };
    const dateVal = val ? new Date(val) : null;
    
    if (type === 'start') {
      onChange({ ...currentRange, start: dateVal });
    } else {
      onChange({ ...currentRange, end: dateVal });
    }
  };

  // Convert Date object to YYYY-MM-DD string for native inputs
  const formatDateString = (date: any): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const formatMonthString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val; // Already "YYYY-MM"
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex flex-col gap-1.5 select-none", className)}>
      {label && (
        mode === 'range' ? (
          <span id={groupLabelId} className="text-[13px] font-semibold text-on-surface tracking-[0.01em]">
            {label}
          </span>
        ) : (
          <label htmlFor={inputId} className="text-[13px] font-semibold text-on-surface tracking-[0.01em]">
            {label}
          </label>
        )
      )}

      {mode === 'range' ? (
        <div 
          className="flex items-center gap-2" 
          role="group" 
          aria-labelledby={label ? groupLabelId : undefined}
        >
          {/* Start Date */}
          <div className="relative flex-1">
            <input
              type="date"
              id={startInputId}
              ref={startRef}
              disabled={disabled}
              min={minDate}
              max={maxDate}
              value={formatDateString((value as any)?.start)}
              onChange={(e) => handleRangeChange('start', e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : (helperText ? helperId : undefined)}
              aria-label="Ngày bắt đầu"
              className={cn(
                "w-full rounded-xl border bg-surface-container-lowest font-inter text-[11px] sm:text-[12.5px] font-semibold h-8.5 sm:h-9 px-1.5 sm:px-2.5 pl-7 sm:pl-8.5 text-on-surface",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                error ? "border-error" : "border-outline-variant hover:border-outline",
                disabled && "opacity-50 cursor-not-allowed bg-surface-container"
              )}
            />
            <span 
              onClick={handleIconClick}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>

          <span className="text-xs text-on-surface-variant font-medium">đến</span>

          {/* End Date */}
          <div className="relative flex-1">
            <input
              type="date"
              id={endInputId}
              ref={endRef}
              disabled={disabled}
              min={minDate ? minDate : ((value as any)?.start ? formatDateString((value as any).start) : undefined)}
              max={maxDate}
              value={formatDateString((value as any)?.end)}
              onChange={(e) => handleRangeChange('end', e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : (helperText ? helperId : undefined)}
              aria-label="Ngày kết thúc"
              className={cn(
                "w-full rounded-xl border bg-surface-container-lowest font-inter text-[11px] sm:text-[12.5px] font-semibold h-8.5 sm:h-9 px-1.5 sm:px-2.5 pl-7 sm:pl-8.5 text-on-surface",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                error ? "border-error" : "border-outline-variant hover:border-outline",
                disabled && "opacity-50 cursor-not-allowed bg-surface-container"
              )}
            />
            <span 
              onClick={() => !disabled && endRef.current?.showPicker()}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      ) : mode === 'month' ? (
        <div className="relative">
          <input
            type="month"
            id={inputId}
            ref={inputRef}
            disabled={disabled}
            min={minDate}
            max={maxDate}
            value={formatMonthString(value)}
            onChange={handleMonthChange}
            onClick={() => !disabled && inputRef.current?.showPicker()}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : (helperText ? helperId : undefined)}
            className={cn(
              "peer absolute inset-0 w-full h-full opacity-0",
              disabled ? "cursor-not-allowed" : "cursor-pointer"
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "w-full rounded-xl border bg-surface-container-lowest font-inter text-[11px] sm:text-[12.5px] font-semibold h-8.5 sm:h-9 px-1.5 sm:px-2.5 pl-7 sm:pl-8.5 text-on-surface",
              "flex items-center pointer-events-none",
              "peer-focus:border-primary peer-focus:ring-2 peer-focus:ring-primary/20 transition-all",
              error ? "border-error" : "border-outline-variant",
              disabled && "opacity-50 bg-surface-container"
            )}
          >
            {formatMonthString(value)
              ? `Tháng ${formatMonthString(value).split('-')[1]}/${formatMonthString(value).split('-')[0]}`
              : 'Chọn tháng'}
          </div>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            <Calendar className="w-3.5 h-3.5" />
          </span>
        </div>
      ) : (
        <div className="relative">
          <input
            type="date"
            id={inputId}
            ref={inputRef}
            disabled={disabled}
            min={minDate}
            max={maxDate}
            value={formatDateString(value)}
            onChange={handleSingleChange}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : (helperText ? helperId : undefined)}
            className={cn(
              "w-full rounded-xl border bg-surface-container-lowest font-inter text-[11px] sm:text-[12.5px] font-semibold h-8.5 sm:h-9 px-1.5 sm:px-2.5 pl-7 sm:pl-8.5 text-on-surface",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
              error ? "border-error" : "border-outline-variant hover:border-outline",
              disabled && "opacity-50 cursor-not-allowed bg-surface-container"
            )}
          />
          <span
            onClick={handleIconClick}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {error && (
        <p id={errorId} className="text-[12px] text-error font-medium" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="text-[12px] text-on-surface-variant">
          {helperText}
        </p>
      )}
    </div>
  );
};
