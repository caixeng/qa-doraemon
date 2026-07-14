import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  ClipboardList,
  Edit2,
  MessageSquare,
  LayoutGrid,
  Table as TableIcon,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import { DatePicker, Skeleton, EmptyState, ErrorState, Button, Modal, Table, MobileFilterToggle, type TableColumn } from "../components/ui";
import { toast } from "../stores/toastStore";
import { useAuthStore } from "../stores/authStore";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useClassesList } from "../hooks/useClassesList";
import type { AttendanceRow, AttendanceInsert, StudentRow, ClassRow, AttendanceStatus } from "../types/database";

interface ClassOverview extends ClassRow {
  class_teachers?: { is_homeroom: boolean; users: { full_name: string } | null }[];
  students?: { id: string }[];
}

export function Attendance() {
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((state) => state.user?.school_id) || '00000000-0000-0000-0000-000000000001';
  const currentUserId = useAuthStore((state) => state.user?.id) || null;

  // Local Filter state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  
  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('attendance_view_mode') as 'grid' | 'table') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('attendance_view_mode', viewMode);
  }, [viewMode]);
  
  

  // 1. Fetch classes list for selection
  const { classesList, isLoading: isLoadingClasses, selectedAcademicYearId } = useClassesList();

  // Query lấy thông tin chi tiết các lớp cho Dashboard BGH (sĩ số, GVCN)
  const { data: classesOverviewResponse, isLoading: isLoadingClassesOverview } = useQuery({
    queryKey: ['classes-attendance-overview', selectedAcademicYearId],
    queryFn: () => api.getAll<ClassOverview>(
      'classes',
      { page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
      { filters: { academic_year_id: selectedAcademicYearId } },
      '*, class_teachers(is_homeroom, users(full_name)), students(id)'
    ),
    enabled: !!selectedAcademicYearId && !selectedClassId
  });
  const classesOverview = classesOverviewResponse?.data?.data || [];

  // 2. Fetch active students in the selected class
  const { data: studentsResponse, isLoading: isLoadingStudents, isError: isErrorStudents, refetch: refetchStudents } = useQuery({
    queryKey: ['students-attendance', selectedClassId],
    queryFn: () => api.getAll<StudentRow>('students', { page: 1, pageSize: 200, sortBy: 'full_name', sortOrder: 'asc' }, { filters: { class_id: selectedClassId, status: 'active' } }),
    enabled: !!selectedClassId,
  });
  const studentsList = studentsResponse?.data?.data || [];

  // 3. Fetch attendance records for this class on this date
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const { data: attendanceResponse, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance-records', selectedClassId, formattedDate],
    queryFn: () => api.getAll<AttendanceRow>('attendance', { page: 1, pageSize: 200 }, { filters: { class_id: selectedClassId, date: formattedDate } }),
    enabled: !!selectedClassId && !!formattedDate,
  });
  const attendanceRecords = attendanceResponse?.data?.data || [];

  // Fetch tất cả điểm danh toàn trường trong ngày để hiển thị thống kê Dashboard BGH
  const { data: allAttendanceResponse, isLoading: isLoadingAllAttendance } = useQuery({
    queryKey: ['all-attendance-records', formattedDate],
    queryFn: () => api.getAll<AttendanceRow>('attendance', { page: 1, pageSize: 2000 }, { filters: { date: formattedDate } }),
    enabled: !selectedClassId && !!formattedDate,
  });
  const allAttendanceRecords = allAttendanceResponse?.data?.data || [];

  // Build a map of existing attendance records for fast lookup
  const attendanceMap = new Map<string, AttendanceRow>();
  attendanceRecords.forEach((record: AttendanceRow) => {
    attendanceMap.set(record.student_id, record);
  });

  // 4. Mutation to upsert attendance record
  const saveAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status, note, checkInTime, recordId }: { 
      studentId: string; 
      status: 'present' | 'absent' | 'late' | 'sick' | 'excused';
      note?: string | null;
      checkInTime?: string | null;
      recordId?: string | null;
    }) => {
      const payload = {
        student_id: studentId,
        class_id: selectedClassId,
        date: formattedDate,
        status,
        check_in_time: checkInTime !== undefined ? checkInTime : (status === 'present' || status === 'late' ? '08:00:00' : null),
        note: note !== undefined ? note : null,
        recorded_by: currentUserId,
        updated_at: new Date().toISOString(),
      } satisfies AttendanceInsert;

      if (recordId) {
        return api.update('attendance', recordId, payload);
      } else {
        return api.create('attendance', payload);
      }
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Lỗi khi lưu điểm danh', res.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['attendance-records', selectedClassId, formattedDate] });
      }
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi lưu điểm danh', error.message || 'Lỗi hệ thống');
    }
  });

  // 5. Bulk Mark Attendance mutation
  const bulkMarkMutation = useMutation({
    mutationFn: async (status: 'present' | 'absent') => {
      const promises = studentsList.map((student) => {
        const existingRecord = attendanceMap.get(student.id);
        const payload = {
          student_id: student.id,
          class_id: selectedClassId,
          date: formattedDate,
          status,
          check_in_time: status === 'present' ? '08:00:00' : null,
          recorded_by: currentUserId,
          updated_at: new Date().toISOString(),
        } satisfies AttendanceInsert;

        if (existingRecord) {
          return api.update('attendance', existingRecord.id, payload);
        } else {
          return api.create('attendance', payload);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Điểm danh hàng loạt thành công!');
      queryClient.invalidateQueries({ queryKey: ['attendance-records', selectedClassId, formattedDate] });
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi điểm danh hàng loạt', error.message || 'Lỗi hệ thống');
    }
  });

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'sick' | 'excused') => {
    const existingRecord = attendanceMap.get(studentId);
    saveAttendanceMutation.mutate({
      studentId,
      status,
      note: existingRecord?.note || null,
      checkInTime: existingRecord?.check_in_time || null,
      recordId: existingRecord?.id
    });
  };

  

  // Helper for Initials
  const getInitials = (name: string) => {
    if (!name) return "HS";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Statistics calculation
  const isDashboardMode = !selectedClassId;
  
  let totalStudents = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let sickCount = 0;
  let excusedCount = 0;

  if (isDashboardMode) {
    // Sĩ số toàn trường
    classesOverview.forEach((c: ClassOverview) => {
      totalStudents += c.students?.length || 0;
    });
    // Điểm danh toàn trường
    allAttendanceRecords.forEach((rec: AttendanceRow) => {
      if (rec.status === 'present') presentCount++;
      else if (rec.status === 'absent') absentCount++;
      else if (rec.status === 'late') lateCount++;
      else if (rec.status === 'sick') sickCount++;
      else if (rec.status === 'excused') excusedCount++;
    });
  } else {
    // Sĩ số lớp được chọn
    totalStudents = studentsList.length;
    studentsList.forEach((s) => {
      const rec = attendanceMap.get(s.id);
      if (rec) {
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'absent') absentCount++;
        else if (rec.status === 'late') lateCount++;
        else if (rec.status === 'sick') sickCount++;
        else if (rec.status === 'excused') excusedCount++;
      }
    });
  }

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-emerald-600 text-white font-extrabold tracking-wide shadow-2xs select-none">Có mặt</span>;
      case 'absent':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-rose-600 text-white font-extrabold tracking-wide shadow-2xs select-none">Vắng</span>;
      case 'late':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-amber-500 text-white font-extrabold tracking-wide shadow-2xs select-none">Đi trễ</span>;
      case 'sick':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-purple-600 text-white font-extrabold tracking-wide shadow-2xs select-none">Nghỉ bệnh</span>;
      case 'excused':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-purple-600 text-white font-extrabold tracking-wide shadow-2xs select-none">Có phép</span>;
      default:
        return null;
    }
  };

  const unmarkedCount = totalStudents - (presentCount + absentCount + lateCount + sickCount + excusedCount);

  // Define Table Columns
  const tableColumns: TableColumn<StudentRow>[] = [
    {
      key: "stt",
      header: "STT",
      align: "center",
      width: "64px",
      render: (_row: StudentRow, index: number) => (
        <span className="font-semibold text-on-surface-variant/70">
          {index + 1}
        </span>
      )
    },
    {
      key: "student",
      header: "Học sinh",
      render: (row: StudentRow) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/45 shrink-0 bg-primary/5 flex items-center justify-center">
            {row.profile_image_url ? (
              <img src={row.profile_image_url} alt={row.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[12px] font-bold text-primary font-playfair">
                {getInitials(row.full_name)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-[14.5px] font-bold font-playfair text-on-surface truncate leading-tight" title={row.full_name}>
              {row.full_name}
            </h4>
            <p className="text-[12px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mt-0.5 select-all">
              {row.student_code}
            </p>
          </div>
        </div>
      )
    },
    {
      key: "attendance",
      header: "Trạng thái",
      align: "center",
      render: (row: StudentRow) => {
        const attendanceRecord = attendanceMap.get(row.id);
        const status = attendanceRecord?.status;
        return status ? (
          getAttendanceBadge(status)
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] bg-slate-100 dark:bg-slate-800 text-slate-500 border border-outline-variant/30 font-semibold select-none">Chưa điểm danh</span>
        );
      }
    },
    {
      key: "note",
      header: "Ghi chú sức khỏe / Lý do",
      render: (row: StudentRow) => {
        const attendanceRecord = attendanceMap.get(row.id);
        const note = attendanceRecord?.note;
        return note ? (
          <div className="flex items-start gap-1.5 text-xs text-on-surface-variant max-w-[280px]" title={note}>
            <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="line-clamp-2 select-text">{note}</span>
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant/40 italic select-none">---</span>
        );
      }
    }
  ];

  const isLoading = isDashboardMode
    ? isLoadingClasses || isLoadingClassesOverview || isLoadingAllAttendance
    : isLoadingClasses || isLoadingStudents || isLoadingAttendance;

  return (
    <div className="animate-in fade-in duration-300 max-w-[1400px] mx-auto pb-12">
      {/* Back button & Header section */}
      {!isDashboardMode && (
        <button
          onClick={() => setSelectedClassId("")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-all cursor-pointer mb-4 bg-primary/5 hover:bg-primary/10 px-3.5 py-2 rounded-xl border border-primary/15"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách lớp
        </button>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[20px] md:text-[24px] font-bold italic font-playfair text-on-surface leading-tight tracking-[-0.02em]">
            {isDashboardMode ? "Điểm danh hàng ngày" : `Điểm danh lớp ${classesList.find(c => c.id === selectedClassId)?.name || ''}`}
          </h2>
          <p className="hidden md:block text-[14px] md:text-[16px] text-on-surface-variant mt-1 font-inter">
            {isDashboardMode 
              ? "Theo dõi chuyên cần, đi trễ, nghỉ phép và ghi nhận sức khỏe học sinh."
              : `Xem chi tiết kết quả điểm danh của lớp ${classesList.find(c => c.id === selectedClassId)?.name || ''} trong ngày.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* View mode toggle - only shown in class details */}
          {!isDashboardMode && (
            <div className="flex items-center bg-surface-container border border-outline-variant/60 rounded-xl p-0.5 select-none shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'grid'
                    ? "bg-surface text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Xem dạng lưới"
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'table'
                    ? "bg-surface text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
                title="Xem dạng bảng"
              >
                <TableIcon className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Date selection panel */}
      <div className="md:bg-surface-container-lowest md:p-3.5 md:rounded-2xl md:border md:border-outline-variant/30 md:shadow-sm flex flex-wrap md:flex-nowrap gap-2.5 md:gap-3.5 items-center mb-5">
        <div className="flex-1 min-w-0 md:flex-none md:w-64">
          <DatePicker
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            maxDate={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>

        {selectedClassId && (
          <MobileFilterToggle>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full md:w-64 h-10 rounded-xl border border-outline-variant hover:border-outline bg-surface-container-lowest font-inter text-sm px-3 text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer font-semibold text-on-surface-variant"
            >
              {classesList.map((c: ClassRow) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {classesList.length === 0 && (
                <option value="">Không có lớp học nào</option>
              )}
            </select>
          </MobileFilterToggle>
        )}

        <div className="hidden md:block text-on-surface-variant/80 text-[13px] font-semibold md:ml-auto">
          Ngày hiển thị: <strong className="text-primary font-bold">{format(selectedDate, 'eeee, dd/MM/yyyy', { locale: vi })}</strong>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:overflow-visible mb-4 md:mb-8">
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-slate-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Tổng sĩ số</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-slate-900 dark:text-slate-50 md:mt-1 leading-none">{totalStudents}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-emerald-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Có mặt</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-emerald-600 dark:text-emerald-400 md:mt-1 leading-none">{presentCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-rose-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 whitespace-nowrap">Vắng mặt</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-rose-600 dark:text-rose-450 md:mt-1 leading-none">{absentCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-amber-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 whitespace-nowrap">Đi trễ</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-amber-600 dark:text-amber-450 md:mt-1 leading-none">{lateCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-purple-500 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 whitespace-nowrap">Có phép / Bệnh</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-purple-600 dark:text-purple-450 md:mt-1 leading-none">{excusedCount + sickCount}</span>
        </div>
        <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-1 md:items-stretch md:px-4 md:py-4 md:bg-surface md:rounded-2xl md:border md:border-outline-variant/65 md:border-l-4 md:border-l-slate-400 md:shadow-2xs md:flex-col md:justify-between md:min-h-[92px]">
          <span className="text-[12px] md:text-[12px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Chưa điểm danh</span>
          <span className="text-[15px] md:text-[28px] font-black font-playfair text-slate-600 dark:text-slate-400 md:mt-1 leading-none">{unmarkedCount}</span>
        </div>
      </div>

      {/* Main Student List Area or Classes Dashboard Overview */}
      {isDashboardMode ? (
        isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-outline-variant/30 rounded-2xl p-5 shadow-2xs h-48 animate-pulse flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-surface-variant/40 rounded w-1/3" />
                  <div className="h-3 bg-surface-variant/30 rounded w-1/2" />
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-10 bg-surface-variant/20 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : classesOverview.length === 0 ? (
          <EmptyState
            title="Không có lớp học nào"
            description="Không tìm thấy lớp học nào hoạt động trong năm học được chọn."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classesOverview.map((cls: ClassOverview) => {
              const classRecs = allAttendanceRecords.filter((r: AttendanceRow) => r.class_id === cls.id);
              const total = cls.students?.length || 0;
              const present = classRecs.filter((r: AttendanceRow) => r.status === 'present').length;
              const absent = classRecs.filter((r: AttendanceRow) => ['absent', 'sick', 'excused'].includes(r.status)).length;
              const late = classRecs.filter((r: AttendanceRow) => r.status === 'late').length;

              // Badge status
              let badgeBg = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
              let badgeText = "Chưa điểm danh";
              if (classRecs.length > 0) {
                if (classRecs.length >= total && total > 0) {
                  badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30";
                  badgeText = "Đã hoàn thành";
                } else {
                  badgeBg = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30";
                  badgeText = `Đang điểm danh (${classRecs.length}/${total})`;
                }
              }

              const homeroomTeacher = cls.class_teachers?.find((ct) => ct.is_homeroom)?.users?.full_name || 'Chưa phân công';
              const progressPct = total > 0 ? Math.round((classRecs.length / total) * 100) : 0;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className="bg-white dark:bg-slate-900 border border-outline-variant/35 rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 group relative overflow-hidden shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[17px] font-black text-on-surface dark:text-white font-playfair group-hover:text-primary transition-colors">
                          Lớp {cls.name}
                        </h3>
                        <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">
                          GVCN: <span className="font-semibold text-on-surface dark:text-slate-200">{homeroomTeacher}</span>
                        </p>
                      </div>
                      
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold border uppercase tracking-wider", badgeBg)}>
                        {badgeText}
                      </span>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-4 select-none">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl text-center border border-outline-variant/10">
                        <p className="text-[12px] text-slate-500 font-bold uppercase tracking-wider">Sĩ số</p>
                        <p className="text-sm font-black text-on-surface dark:text-white mt-0.5">{total}</p>
                      </div>
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-center border border-emerald-100/10">
                        <p className="text-[12px] text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-wider">Có mặt</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{present}</p>
                      </div>
                      <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-xl text-center border border-rose-100/10">
                        <p className="text-[12px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider">Vắng</p>
                        <p className="text-sm font-black text-rose-600 dark:text-rose-450 mt-0.5">{absent}</p>
                      </div>
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl text-center border border-amber-100/10">
                        <p className="text-[12px] text-amber-600 dark:text-amber-450 font-bold uppercase tracking-wider">Trễ</p>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-450 mt-0.5">{late}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[12px] font-bold text-on-surface-variant mb-1">
                      <span>Tiến độ điểm danh</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300", 
                          progressPct === 100 ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-[28px] border border-outline-variant/30 p-5 shadow-sm animate-pulse flex flex-col justify-between h-48">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-surface-variant/40 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-variant/40 rounded w-2/3" />
                    <div className="h-3 bg-surface-variant/40 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-10 bg-surface-variant/20 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden p-6 animate-pulse space-y-4">
            <div className="h-8 bg-surface-variant/40 rounded w-1/4 mb-6" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-outline-variant/20">
                <div className="w-6 h-4 bg-surface-variant/30 rounded" />
                <div className="w-10 h-10 bg-surface-variant/40 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-variant/40 rounded w-1/3" />
                  <div className="h-3 bg-surface-variant/30 rounded w-1/4" />
                </div>
                <div className="w-64 h-8 bg-surface-variant/20 rounded-xl" />
                <div className="w-32 h-6 bg-surface-variant/30 rounded" />
                <div className="w-8 h-8 bg-surface-variant/35 rounded-xl" />
              </div>
            ))}
          </div>
        )
      ) : isErrorStudents ? (
        <ErrorState onRetry={refetchStudents} />
      ) : studentsList.length === 0 ? (
        <EmptyState
          title="Không có học sinh"
          description="Lớp học này hiện tại chưa có học sinh hoạt động nào hoặc chưa được phân lớp."
          icon={<Users className="w-12 h-12" />}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {studentsList.map((student) => {
            const attendanceRecord = attendanceMap.get(student.id);
            const status = attendanceRecord?.status;
            const note = attendanceRecord?.note;

            return (
              <div 
                key={student.id} 
                className={cn(
                  "bg-surface-container-lowest rounded-[28px] border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group",
                  status === 'present' && "border-green-200/60 bg-green-50/5 dark:bg-green-950/2 dark:border-green-900/20",
                  status === 'absent' && "border-rose-200/60 bg-rose-50/5 dark:bg-rose-950/2 dark:border-rose-900/20",
                  status === 'late' && "border-amber-200/60 bg-amber-50/5 dark:bg-amber-950/2 dark:border-amber-900/20",
                  (status === 'sick' || status === 'excused') && "border-purple-200/60 bg-purple-50/5 dark:bg-purple-950/2 dark:border-purple-900/20",
                  !status && "border-outline-variant/30"
                )}
              >
                <div>
                  {/* Top: Avatar, Name and Status color Indicator */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/45 shrink-0 bg-primary/5 flex items-center justify-center">
                      {student.profile_image_url ? (
                        <img src={student.profile_image_url} alt={student.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[13px] font-bold text-primary font-playfair">
                          {getInitials(student.full_name)}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-[16px] font-bold font-playfair text-on-surface line-clamp-1 leading-tight" title={student.full_name}>
                        {student.full_name}
                      </h4>
                      <p className="text-[12px] font-semibold text-on-surface-variant/70 uppercase tracking-widest mt-1 select-all">
                        {student.student_code}
                      </p>
                    </div>

                    {/* Status Badge */}
                    {status ? (
                      getAttendanceBadge(status)
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] bg-slate-100 dark:bg-slate-800 text-slate-500 border border-outline-variant/30 font-semibold select-none">Chưa điểm danh</span>
                    )}
                  </div>

                  {/* Note section */}
                  {note && (
                    <div className="mt-3 bg-surface-container-low/40 border border-outline-variant/20 rounded-xl p-2.5 flex gap-2 items-start text-xs text-on-surface-variant">
                      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="line-clamp-2 select-text">{note}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table
          className="rounded-2xl border border-outline-variant/30 shadow-sm bg-surface-container-lowest"
          columns={tableColumns}
          data={studentsList}
          rowKey={(row) => row.id}
        />
      )}

  
    </div>
  );
}
