import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, X, Info } from 'lucide-react';

const formSchema = z.object({
  time: z.string().min(1, 'Vui lòng nhập khung giờ'),
  name: z.string().min(1, 'Vui lòng nhập tên hoạt động'),
  isWeeklyCommon: z.boolean(),
  commonContent: z.string().optional(),
  // Nội dung riêng cho từng thứ
  mon: z.string().optional(),
  tue: z.string().optional(),
  wed: z.string().optional(),
  thu: z.string().optional(),
  fri: z.string().optional(),
  sat: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WeeklyPlanFormProps {
  rowData: {
    id: string;
    time: string;
    name: string;
    isWeeklyCommon: boolean;
    commonContent?: string;
    dailyContent?: {
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
    };
  };
  dayKey?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'common'; // Để biết ô nào được click
  onSave: (updatedRow: any) => void;
  onClose: () => void;
}

export const WeeklyPlanForm: React.FC<WeeklyPlanFormProps> = ({
  rowData,
  dayKey = 'common',
  onSave,
  onClose,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      time: rowData.time,
      name: rowData.name,
      isWeeklyCommon: rowData.isWeeklyCommon,
      commonContent: rowData.commonContent || '',
      mon: rowData.dailyContent?.mon || '',
      tue: rowData.dailyContent?.tue || '',
      wed: rowData.dailyContent?.wed || '',
      thu: rowData.dailyContent?.thu || '',
      fri: rowData.dailyContent?.fri || '',
      sat: rowData.dailyContent?.sat || '',
    },
  });

  const isWeeklyCommon = watch('isWeeklyCommon');

  const onSubmit = (values: FormValues) => {
    const updated = {
      id: rowData.id,
      time: values.time,
      name: values.name,
      isWeeklyCommon: values.isWeeklyCommon,
      commonContent: values.isWeeklyCommon ? values.commonContent : '',
      dailyContent: values.isWeeklyCommon
        ? { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' }
        : {
            mon: values.mon || '',
            tue: values.tue || '',
            wed: values.wed || '',
            thu: values.thu || '',
            fri: values.fri || '',
            sat: values.sat || '',
          },
    };
    onSave(updated);
  };

  const getDayLabel = (key: string) => {
    switch (key) {
      case 'mon': return 'Thứ Hai';
      case 'tue': return 'Thứ Ba';
      case 'wed': return 'Thứ Tư';
      case 'thu': return 'Thứ Năm';
      case 'fri': return 'Thứ Sáu';
      case 'sat': return 'Thứ Bảy';
      default: return 'Cả Tuần';
    }
  };

  return (
    <div className="p-6 bg-surface">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-surface-container-low dark:bg-surface-container p-4 rounded-xl border border-outline-variant/30 flex gap-3 text-xs text-on-surface-variant leading-relaxed">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            Bạn đang chỉnh sửa hoạt động: <strong className="text-on-surface">{rowData.name}</strong> 
            {dayKey !== 'common' && (
              <span> của ngày <strong className="text-primary">{getDayLabel(dayKey)}</strong></span>
            )}
            . Hãy điền nội dung chi tiết dưới đây. Dùng phím <code>Enter</code> để xuống dòng.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Khung giờ</label>
            <input
              type="text"
              {...register('time')}
              className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
              placeholder="Ví dụ: 8h30 - 9h00"
            />
            {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Tên hoạt động</label>
            <input
              type="text"
              {...register('name')}
              className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
              placeholder="Ví dụ: Hoạt động học"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
        </div>

        <div className="border-t border-outline-variant/30 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Kiểu hoạt động</span>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('isWeeklyCommon')}
                className="w-4 h-4 rounded text-primary border-outline-variant/40 focus:ring-primary"
              />
              <span className="text-sm font-semibold text-on-surface select-none">Áp dụng chung cả tuần (Gộp ô)</span>
            </label>
          </div>

          {isWeeklyCommon ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Nội dung hoạt động (Cả tuần)</label>
              <textarea
                {...register('commonContent')}
                rows={8}
                className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
                placeholder="Nhập nội dung chung áp dụng cho tất cả các ngày..."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
                <div key={day} className={dayKey === day ? "ring-2 ring-primary/40 rounded-2xl p-1 bg-primary/5" : ""}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5 px-1 flex items-center justify-between">
                    <span>{getDayLabel(day)}</span>
                    {dayKey === day && <span className="text-[12px] text-primary font-black uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded-md">Đang chọn</span>}
                  </label>
                  <textarea
                    {...register(day as any)}
                    rows={4}
                    className="w-full bg-surface-container-low text-on-surface py-2 px-3 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
                    placeholder={`Nhập hoạt động ${getDayLabel(day).toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-outline-variant/30 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-sm font-semibold text-on-surface rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-sm font-semibold text-on-primary rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Đang lưu...' : 'Xác Nhận'}
          </button>
        </div>
      </form>
    </div>
  );
};
