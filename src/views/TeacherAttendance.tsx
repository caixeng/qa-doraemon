import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Edit2, MessageSquare, Search, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import { DatePicker, Skeleton, EmptyState, ErrorState, Button, Modal, Table, MobileFilterToggle, type TableColumn } from "../components/ui";
import { toast } from "../stores/toastStore";
import { useAuthStore } from "../stores/authStore";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { queryKeys } from "../lib/queryKeys";
import type { TeacherAttendanceStatus } from "../types";

interface TeacherRow {
  id: string;
  full_name: string;
  role: string;
  job_title: string | null;
  work_status: string;
}

interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  status: TeacherAttendanceStatus;
  note: string | null;
}

const STATUS_OPTIONS: { value: TeacherAttendanceStatus; label: string }[] = [
  { value: "full_day", label: "Đi làm cả ngày" },
  { value: "half_day", label: "Đi làm một buổi" },
  { value: "excused_absence", label: "Vắng có phép" },
  { value: "unexcused_absence", label: "Vắng không phép" },
  { value: "unexcused_absence_half", label: "Vắng không phép 1 buổi" },
  { value: "hour_1", label: "Đi làm 1h" },
  { value: "hour_2", label: "Đi làm 2h" },
  { value: "hour_3", label: "Đi làm 3h" },
  { value: "hour_5", label: "Đi làm 5h" },
  { value: "hour_6", label: "Đi làm 6h" },
  { value: "hour_7", label: "Đi làm 7h" },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<TeacherAttendanceStatus, string>;

export function TeacherAttendance() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((state) => state.user?.school_id) || '00000000-0000-0000-0000-000000000001';
  const currentUserId = useAuthStore((state) => state.user?.id) || null;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState("");
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  // Note Modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedTeacherForNote, setSelectedTeacherForNote] = useState<TeacherRow | null>(null);
  const [tempNote, setTempNote] = useState("");

  // 1. Fetch active teachers/staff
  const { data: teachersResponse, isLoading: isLoadingTeachers, isError: isErrorTeachers, refetch: refetchTeachers } = useQuery({
    queryKey: queryKeys.teachers.list({ work_status: 'active' }),
    queryFn: () => api.getAll<TeacherRow>(
      'users',
      { page: 1, pageSize: 500, sortBy: 'full_name', sortOrder: 'asc' },
      { filters: { work_status: 'active' } }
    ),
  });
  const teachersList = teachersResponse?.data?.data || [];

  const filteredTeachers = search.trim()
    ? teachersList.filter((t) => t.full_name.toLowerCase().includes(search.trim().toLowerCase()))
    : teachersList;

  // 2. Fetch attendance records for the selected date
  const { data: attendanceResponse, isLoading: isLoadingAttendance } = useQuery({
    queryKey: queryKeys.teacherAttendance.records(formattedDate),
    queryFn: () => api.getAll<TeacherAttendanceRecord>('teacher_attendance', { page: 1, pageSize: 500 }, { filters: { date: formattedDate } }),
    enabled: !!formattedDate,
  });
  const attendanceRecords = attendanceResponse?.data?.data || [];

  const attendanceMap = new Map<string, TeacherAttendanceRecord>();
  attendanceRecords.forEach((record) => {
    attendanceMap.set(record.teacher_id, record);
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.teacherAttendance.records(formattedDate) });

  // 3. Save a single status/note change
  const saveMutation = useMutation({
    mutationFn: async ({ teacherId, status, note, recordId }: { teacherId: string; status: TeacherAttendanceStatus; note?: string | null; recordId?: string }) => {
      const payload: any = {
        school_id: schoolId,
        teacher_id: teacherId,
        date: formattedDate,
        status,
        recorded_by: currentUserId,
        updated_at: new Date().toISOString(),
      };
      if (note !== undefined) {
        payload.note = note;
      }
      if (recordId) {
        return api.update('teacher_attendance', recordId, payload);
      }
      return api.create('teacher_attendance', payload);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Lỗi khi lưu điểm danh', res.error);
      } else {
        invalidate();
      }
    },
    onError: (error: any) => {
      toast.error('Lỗi khi lưu điểm danh', error.message || 'Lỗi hệ thống');
    }
  });

  // 4. Bulk initialize: mark every teacher without a record as "full_day"
  const initMutation = useMutation({
    mutationFn: async () => {
      const missing = filteredTeachers.filter((t) => !attendanceMap.has(t.id));
      const promises = missing.map((t) => api.create('teacher_attendance', {
        school_id: schoolId,
        teacher_id: t.id,
        date: formattedDate,
        status: 'full_day' as TeacherAttendanceStatus,
        recorded_by: currentUserId,
      }));
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Đã khởi tạo điểm danh cho các giáo viên còn thiếu!');
      invalidate();
    },
    onError: (error: any) => {
      toast.error('Lỗi khi khởi tạo điểm danh', error.message || 'Lỗi hệ thống');
    }
  });

  const handleStatusChange = (teacherId: string, status: TeacherAttendanceStatus) => {
    const existingRecord = attendanceMap.get(teacherId);
    saveMutation.mutate({ teacherId, status, note: existingRecord?.note, recordId: existingRecord?.id });
  };

  const handleSaveNote = () => {
    if (!selectedTeacherForNote) return;
    const existingRecord = attendanceMap.get(selectedTeacherForNote.id);
    const status = existingRecord?.status || 'full_day';

    saveMutation.mutate({
      teacherId: selectedTeacherForNote.id,
      status,
      note: tempNote,
      recordId: existingRecord?.id
    }, {
      onSuccess: () => {
        setIsNoteModalOpen(false);
        setSelectedTeacherForNote(null);
        setTempNote("");
        toast.success('Đã lưu ghi chú!');
      }
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "GV";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const tableColumns: TableColumn<TeacherRow>[] = [
    {
      key: "stt",
      header: "STT",
      align: "center",
      width: "64px",
      render: (_row, index) => (
        <span className="font-semibold text-on-surface-variant/70">{index + 1}</span>
      )
    },
    {
      key: "teacher",
      header: "Họ tên GV",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/45 shrink-0 bg-primary/5 flex items-center justify-center">
            <span className="text-[12px] font-bold text-primary font-playfair">{getInitials(row.full_name)}</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-[14.5px] font-bold font-playfair text-on-surface truncate leading-tight">{row.full_name}</h4>
            {row.job_title && (
              <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mt-0.5">{row.job_title}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: "status",
      header: "Tình trạng",
      render: (row) => {
        const record = attendanceMap.get(row.id);
        return (
          <select
            value={record?.status || ""}
            onChange={(e) => e.target.value && handleStatusChange(row.id, e.target.value as TeacherAttendanceStatus)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-[220px] rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer transition-colors",
              record ? "bg-primary/10 border-primary/30 text-primary" : "bg-white border-outline-variant/40 text-on-surface-variant"
            )}
          >
            <option value="" disabled>Chưa điểm danh</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      }
    },
    {
      key: "note",
      header: "Ghi chú",
      render: (row) => {
        const record = attendanceMap.get(row.id);
        const note = record?.note;
        return note ? (
          <div className="flex items-start gap-1.5 text-xs text-on-surface-variant max-w-[220px]" title={note}>
            <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="line-clamp-2 select-text">{note}</span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant/40 italic select-none">Chưa có ghi chú</span>
        );
      }
    },
    {
      key: "date",
      header: "Ngày làm việc",
      render: () => <span className="text-sm text-on-surface-variant">{format(selectedDate, 'dd/MM/yyyy')}</span>
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (row) => {
        const record = attendanceMap.get(row.id);
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setSelectedTeacherForNote(row);
                setTempNote(record?.note || "");
                setIsNoteModalOpen(true);
              }}
              className="p-2 border border-outline-variant/40 rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              title="Thêm ghi chú"
            >
              <Edit2 className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
          </div>
        );
      }
    }
  ];

  const isLoading = isLoadingTeachers || isLoadingAttendance;

  // Summary stats for the selected date
  const totalTeachers = filteredTeachers.length;
  let fullDayCount = 0;
  let partialCount = 0; // half day + hourly
  let excusedCount = 0;
  let unexcusedCount = 0; // full + half unexcused

  filteredTeachers.forEach((t) => {
    const status = attendanceMap.get(t.id)?.status;
    if (status === 'full_day') fullDayCount++;
    else if (status === 'half_day' || status?.startsWith('hour_')) partialCount++;
    else if (status === 'excused_absence') excusedCount++;
    else if (status === 'unexcused_absence' || status === 'unexcused_absence_half') unexcusedCount++;
  });

  const markedCount = fullDayCount + partialCount + excusedCount + unexcusedCount;
  const unmarkedCount = totalTeachers - markedCount;

  return (
    <div className="animate-in fade-in duration-300 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[20px] md:text-[24px] font-bold italic font-playfair text-on-surface leading-tight tracking-[-0.02em]">
            Điểm danh Giáo viên
          </h2>
          <p className="hidden md:block text-[14px] md:text-[16px] text-on-surface-variant mt-1 font-inter">
            Theo dõi tình trạng làm việc, vắng mặt của giáo viên và nhân viên theo ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => initMutation.mutate()}
            disabled={filteredTeachers.length === 0 || initMutation.isPending}
            className="flex-1 md:flex-none rounded-xl cursor-pointer font-semibold"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Khởi tạo điểm danh
          </Button>
        </div>
      </div>

      <div className="md:bg-surface-container-lowest md:p-3.5 md:rounded-2xl md:border md:border-outline-variant/30 md:shadow-sm flex flex-wrap md:flex-nowrap gap-2.5 md:gap-3.5 items-center mb-5">
        <div className="flex-1 min-w-0 md:flex-none md:w-64">
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
          />
        </div>

        <MobileFilterToggle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên giáo viên..."
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-outline-variant hover:border-outline bg-surface-container-lowest font-inter text-sm text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </MobileFilterToggle>

        <div className="hidden md:block text-on-surface-variant/80 text-[13px] font-semibold md:ml-auto">
          Ngày làm việc: <strong className="text-primary font-bold">{format(selectedDate, 'eeee, dd/MM/yyyy', { locale: vi })}</strong>
          {" · "}Đã điểm danh: <strong className="text-primary font-bold">{markedCount}/{filteredTeachers.length}</strong>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:overflow-visible mb-4 md:mb-8">
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-slate-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Tổng số GV</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-slate-900 dark:text-slate-50 md:mt-1 leading-none">{totalTeachers}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-emerald-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Đi làm cả ngày</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-emerald-600 dark:text-emerald-400 md:mt-1 leading-none">{fullDayCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-amber-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 whitespace-nowrap">Đi làm 1 buổi/giờ</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-amber-600 dark:text-amber-450 md:mt-1 leading-none">{partialCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-purple-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 whitespace-nowrap">Vắng có phép</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-purple-600 dark:text-purple-450 md:mt-1 leading-none">{excusedCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-rose-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 whitespace-nowrap">Vắng không phép</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-rose-600 dark:text-rose-450 md:mt-1 leading-none">{unexcusedCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-slate-400 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[9px] md:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Chưa điểm danh</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-slate-600 dark:text-slate-400 md:mt-1 leading-none">{unmarkedCount}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden p-6 animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : isErrorTeachers ? (
        <ErrorState onRetry={refetchTeachers} />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          title="Không có giáo viên"
          description="Chưa có giáo viên/nhân viên đang hoạt động nào để điểm danh."
          icon={<ClipboardList className="w-12 h-12" />}
        />
      ) : (
        <Table
          className="rounded-2xl border border-outline-variant/30 shadow-sm bg-surface-container-lowest"
          columns={tableColumns}
          data={filteredTeachers}
          rowKey={(row) => row.id}
        />
      )}

      {/* Note Modal */}
      <Modal
        open={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setSelectedTeacherForNote(null);
        }}
        title="Thêm ghi chú điểm danh"
        size="sm"
      >
        <div className="space-y-4 select-none">
          <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold font-playfair text-primary">
              {selectedTeacherForNote && getInitials(selectedTeacherForNote.full_name)}
            </div>
            <div>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Giáo viên</span>
              <h4 className="text-sm font-bold text-on-surface font-inter mt-0.5">{selectedTeacherForNote?.full_name}</h4>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-on-surface tracking-[0.01em]">
              Lý do / Nội dung ghi chú
            </label>
            <textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Nhập lý do vắng, ví dụ: nghỉ ốm, xin phép việc gia đình..."
              className="w-full rounded-xl border border-outline-variant hover:border-outline bg-surface-container-lowest font-inter text-sm p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNoteModalOpen(false);
                setSelectedTeacherForNote(null);
              }}
              className="rounded-xl cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSaveNote}
              className="rounded-xl cursor-pointer"
            >
              Lưu ghi chú
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export { STATUS_LABELS as TEACHER_ATTENDANCE_STATUS_LABELS };
