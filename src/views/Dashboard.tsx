import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Calendar,
  GraduationCap,
  User,
  ArrowRight
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "../components/ui";
import { useSlidePanel } from "../context/SlidePanelContext";
import { StudentDetailPanel } from "../components/details/StudentDetailPanel";

export function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Fetch student totals by status, class distribution and new registrations
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats-v3', todayStr],
    queryFn: async () => {
      // Fetch counts for active, registered, and graduated statuses
      const { count: activeCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: registeredCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'registered');

      const { count: graduatedCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'graduated');

      // Fetch all students with status 'waiting' to separate waiting and future
      const { data: waitingStudents } = await supabase
        .from('students')
        .select('date_of_birth, target_school_year')
        .eq('status', 'waiting');

      let waitingCount = 0;
      let futureCount = 0;

      if (waitingStudents) {
        waitingStudents.forEach((student: any) => {
          if (!student.date_of_birth) {
            waitingCount++;
            return;
          }
          const birthYear = new Date(student.date_of_birth).getFullYear();
          
          const isFutureYear = birthYear === 2025 || student.target_school_year === '2027-2028';
          if (isFutureYear) {
            futureCount++;
          } else if (birthYear === 2023 || birthYear === 2024) {
            waitingCount++;
          } else {
            waitingCount++;
          }
        });
      }

      const counts = {
        active: activeCount ?? 0,
        registered: registeredCount ?? 0,
        waiting: waitingCount,
        future: futureCount,
        graduated: graduatedCount ?? 0
      };

      // Fetch class distribution and gender for active students
      const { data: classStats } = await supabase
        .from('students')
        .select('id, gender, classes!inner(name)')
        .eq('status', 'active');

      const gradeCounts = {
        shizuka: { total: 0, male: 0, female: 0 },
        nobita: { total: 0, male: 0, female: 0 },
        dorami: { total: 0, male: 0, female: 0 },
        doraemon: { total: 0, male: 0, female: 0 }
      };

      if (classStats) {
        classStats.forEach((s: any) => {
          const className = (s.classes?.name || '').toLowerCase();
          const gender = s.gender;
          
          let groupKey: keyof typeof gradeCounts | null = null;
          if (className.includes('shizuka')) groupKey = 'shizuka';
          else if (className.includes('nobita')) groupKey = 'nobita';
          else if (className.includes('dorami')) groupKey = 'dorami';
          else if (className.includes('doraemon')) groupKey = 'doraemon';

          if (groupKey) {
            gradeCounts[groupKey].total++;
            if (gender === 'male') {
              gradeCounts[groupKey].male++;
            } else if (gender === 'female') {
              gradeCounts[groupKey].female++;
            }
          }
        });
      }

      // Fetch top 10 new registrations for waiting/registered students
      const { data: newRegistrations } = await supabase
        .from('students')
        .select('id, full_name, registration_date, priority_status, created_at, guardians(phone, is_primary)')
        .in('status', ['waiting', 'registered'])
        .order('registration_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        counts,
        gradeCounts,
        newRegistrations: newRegistrations ?? []
      };
    }
  });

  const { openPanel } = useSlidePanel();
  const queryClient = useQueryClient();

  // Fetch classes list for student details panel
  const { data: classesListResponse } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });
  const classesList = classesListResponse ?? [];

  const handleOpenDetail = (studentId: string) => {
    openPanel({
      title: 'Hồ sơ chi tiết học sinh',
      icon: <User size={14} />,
      width: 768,
      component: (
        <StudentDetailPanel 
          studentId={studentId} 
          classesList={classesList}
          onDeleteSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats-v3'] });
          }}
        />
      )
    });
  };

  const counts = stats?.counts ?? {
    active: 0,
    registered: 0,
    waiting: 0,
    future: 0,
    graduated: 0
  };

  const totalStudents = counts.active;

  // Calculate grade distribution chart values
  const gradeCounts = stats?.gradeCounts ?? {
    shizuka: { total: 0, male: 0, female: 0 },
    nobita: { total: 0, male: 0, female: 0 },
    dorami: { total: 0, male: 0, female: 0 },
    doraemon: { total: 0, male: 0, female: 0 }
  };

  const maxVal = Math.max(
    gradeCounts.shizuka.total,
    gradeCounts.nobita.total,
    gradeCounts.dorami.total,
    gradeCounts.doraemon.total,
    10
  );
  const yMax = Math.ceil(maxVal / 10) * 10;

  const yIntervals = [
    yMax,
    Math.round(yMax * 0.75),
    Math.round(yMax * 0.5),
    Math.round(yMax * 0.25),
    0
  ];

  const chartBars = [
    { label: "Dorami", value: gradeCounts.dorami.total, percent: yMax > 0 ? Math.round((gradeCounts.dorami.total / yMax) * 100) : 0 },
    { label: "Shizuka", value: gradeCounts.shizuka.total, percent: yMax > 0 ? Math.round((gradeCounts.shizuka.total / yMax) * 100) : 0 },
    { label: "Nobita", value: gradeCounts.nobita.total, percent: yMax > 0 ? Math.round((gradeCounts.nobita.total / yMax) * 100) : 0 },
    { label: "Doraemon", value: gradeCounts.doraemon.total, percent: yMax > 0 ? Math.round((gradeCounts.doraemon.total / yMax) * 100) : 0 }
  ];

  const formatRegDate = (student: any) => {
    const dateStr = student.registration_date || student.created_at;
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const getPrimaryPhone = (guardians: any) => {
    if (!guardians || !Array.isArray(guardians) || guardians.length === 0) return '—';
    const primary = guardians.find((g: any) => g.is_primary);
    return primary?.phone || guardians[0]?.phone || '—';
  };

  if (isLoading) {
    return (
      <div className="animate-in fade-in duration-300 max-w-[1400px] mx-auto pb-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-span-1">
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <Skeleton className="h-96 rounded-[32px]" />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Skeleton className="h-96 rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-[1400px] mx-auto pb-12 pt-2 md:pt-0">
      {/* Dashboard Welcome Header */}
      <div className="flex justify-between items-center gap-2 mt-2 md:mt-0 mb-4 md:mb-8">
        <h2 className="text-[18px] sm:text-[20px] md:text-[24px] font-bold italic font-playfair text-on-surface tracking-[-0.02em] leading-tight">
          Tổng quan hôm nay
        </h2>
        <span className="text-[11px] sm:text-[13px] md:text-[15px] text-on-surface-variant font-medium bg-surface-container/60 px-2.5 py-1 rounded-lg border border-outline-variant/30 whitespace-nowrap">
          {format(today, 'eeee, dd/MM/yyyy', { locale: vi })}
        </span>
      </div>

      {/* KPI Cards Grid — mỗi card bấm được, dẫn tới tab tương ứng ở Học sinh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
        {([
          {
            label: 'Đang học', value: counts.active, unit: 'trẻ', status: 'active',
            statusLabel: 'Chính thức', icon: <Users className="w-4 h-4" />,
            numberClass: 'text-on-surface', iconClass: 'bg-primary/10 text-primary', footerClass: 'text-primary',
          },
          {
            label: 'Đã ghi danh', value: counts.registered, unit: 'trẻ', status: 'registered',
            statusLabel: 'Đã nhập học', icon: <UserCheck className="w-4 h-4" />,
            numberClass: 'text-indigo-600', iconClass: 'bg-indigo-500/10 text-indigo-600', footerClass: 'text-indigo-600',
          },
          {
            label: 'Hồ sơ chờ', value: counts.waiting, unit: 'hồ sơ', status: 'waiting',
            statusLabel: 'Chờ xếp lớp', icon: <Clock className="w-4 h-4" />,
            numberClass: 'text-amber-600', iconClass: 'bg-amber-500/10 text-amber-600', footerClass: 'text-amber-600',
          },
          {
            label: 'Đăng ký năm tới', value: counts.future, unit: 'hồ sơ', status: 'future',
            statusLabel: 'Tuyển sinh mới', icon: <Calendar className="w-4 h-4" />,
            numberClass: 'text-emerald-600', iconClass: 'bg-emerald-500/10 text-emerald-600', footerClass: 'text-emerald-600',
          },
        ]).map((card) => (
          <button
            key={card.status}
            type="button"
            onClick={() => navigate(`/students?status=${card.status}`)}
            aria-label={`${card.label}: ${card.value} ${card.unit} — xem danh sách`}
            className="col-span-1 text-left bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-2.5 md:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[76px] md:min-h-[120px] cursor-pointer group hover:border-primary/40 hover:shadow-md transition-shadow focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex justify-between items-start w-full">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider font-extrabold text-on-surface-variant">{card.label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={cn("text-[16px] md:text-[24px] font-extrabold tracking-tight", card.numberClass)}>{card.value}</span>
                  <span className="text-[12px] text-on-surface-variant font-semibold"> {card.unit}</span>
                </div>
              </div>
              <div className={cn("w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0", card.iconClass)}>
                {card.icon}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[12px] w-full">
              <span className={cn("font-extrabold", card.footerClass)}>{card.statusLabel}</span>
              <span className="text-on-surface-variant font-semibold flex items-center gap-1 group-hover:text-primary transition-colors">
                Xem <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3 md:gap-6">
        {/* Grade Distribution Chart Section */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest border border-outline-variant/35 rounded-2xl md:rounded-[32px] p-3 md:p-6 shadow-sm flex flex-col justify-start gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[14px] md:text-[20px] font-bold italic font-playfair text-on-surface">Phân bổ học sinh theo Lớp</h3>
            <button type="button" className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors cursor-pointer">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Custom Bar Chart View */}
          <div className="h-40 md:h-56 flex items-end justify-between gap-3 md:gap-6 pb-2 border-b border-outline-variant/30 relative select-none pl-10 md:pl-12 pr-4 mt-2">
            {/* Y Axis Labels */}
            <div className="absolute left-0 top-0 bottom-2 flex flex-col justify-between text-[12px] text-on-surface-variant/80 w-8 text-right pr-2 font-bold font-mono select-none">
              {yIntervals.map((val, idx) => (
                <span key={idx}>{val}</span>
              ))}
            </div>
            <div className="absolute left-12 top-0 bottom-2 w-px bg-outline-variant/40 z-0"></div>

            {/* Grid Lines */}
            <div className="absolute left-12 right-4 top-0 bottom-2 flex flex-col justify-between z-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full border-t border-dashed border-outline-variant/50"></div>
              ))}
            </div>
            {/* Bars */}
            {chartBars.map((bar, index) => (
              <div key={index} className="w-1/4 flex flex-col items-center justify-end z-10 group h-full relative">
                <div
                  className={cn(
                    "w-16 rounded-t-xl relative transition-all duration-300 cursor-pointer shadow-xs",
                    bar.value > 0
                      ? "bg-gradient-to-t from-primary to-sky-400 hover:shadow-lg hover:shadow-primary/20 hover:brightness-105"
                      : "bg-transparent border border-dashed border-outline-variant/50 hover:bg-surface-container-low/30"
                  )}
                  style={{ height: `${Math.max(bar.percent, 4)}%` }}
                >
                  {bar.value > 0 && (
                    <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[12px] font-extrabold text-primary font-mono select-none whitespace-nowrap">
                      {bar.value} trẻ
                    </span>
                  )}

                  <div className="absolute bottom-full mb-5 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-100 !text-white dark:!text-slate-900 backdrop-blur-md text-[12px] font-extrabold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-md whitespace-nowrap z-25">
                    Sĩ số: {bar.value} trẻ
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-[12px] text-on-surface-variant pl-12 pr-4 shrink-0 mt-1">
            {chartBars.map((bar, index) => (
              <div key={index} className="w-1/4 flex flex-col items-center">
                <span className="font-extrabold text-on-surface-variant/90 text-[12px]">
                  {bar.label}
                </span>
              </div>
            ))}
          </div>

          {/* Detailed Data Table */}
          <div className="mt-4 border border-outline-variant/30 rounded-2xl overflow-hidden bg-surface-container-low/10">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-container-low/40 border-b border-outline-variant/30 font-extrabold text-on-surface-variant/80 uppercase tracking-wider text-[12px]">
                  <th className="p-3 pl-5">Nhóm lớp</th>
                  <th className="p-3 text-center">Tổng sĩ số</th>
                  <th className="p-3 text-center text-primary">Nam (Bé trai)</th>
                  <th className="p-3 text-center text-pink-650">Nữ (Bé gái)</th>
                  <th className="p-3 text-center">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {[
                  { key: 'dorami', name: 'Dorami' },
                  { key: 'shizuka', name: 'Shizuka' },
                  { key: 'nobita', name: 'Nobita' },
                  { key: 'doraemon', name: 'Doraemon' }
                ].map((item) => {
                  const data = gradeCounts[item.key as keyof typeof gradeCounts] || { total: 0, male: 0, female: 0 };
                  const pct = totalStudents > 0 ? Math.round((data.total / totalStudents) * 100) : 0;
                  return (
                    <tr key={item.key} className="hover:bg-surface-container-low/20 transition-colors font-semibold text-on-surface">
                      <td className="p-3 pl-5 font-bold">{item.name}</td>
                      <td className="p-3 text-center font-mono text-[14px]">{data.total} trẻ</td>
                      <td className="p-3 text-center text-primary font-mono">{data.male}</td>
                      <td className="p-3 text-center text-pink-650 font-mono">{data.female}</td>
                      <td className="p-3 text-center text-on-surface-variant font-mono">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Quick Actions Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">
          {/* New Registrations Column */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-2xl md:rounded-[32px] p-3 md:p-6 shadow-sm flex flex-col h-full justify-between">
            <div>
              <h3 className="text-[14px] md:text-[20px] font-bold italic font-playfair text-on-surface mb-3 md:mb-6">Đăng ký mới gần đây</h3>
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {stats?.newRegistrations.map((student: any) => (
                  <div 
                    key={student.id} 
                    onClick={() => handleOpenDetail(student.id)}
                    className="bg-surface-container/60 hover:bg-surface-container-high/60 rounded-2xl p-4 border border-outline-variant/40 hover:border-primary/40 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[13.5px] font-bold text-on-surface leading-tight font-inter">{student.full_name}</p>
                        <p className="text-[11.5px] text-on-surface-variant mt-1 font-semibold">
                          SĐT: {getPrimaryPhone(student.guardians)}
                        </p>
                        <p className="text-[12px] text-on-surface-variant/70 mt-1 font-mono">
                          Đăng ký: {formatRegDate(student)}
                        </p>
                      </div>
                      {student.priority_status && student.priority_status !== 'none' && (
                        <span className="text-[12px] uppercase tracking-wider font-extrabold bg-amber-550/10 text-amber-700 px-2 py-0.5 rounded-full font-inter">
                          Ưu tiên
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!stats?.newRegistrations || stats.newRegistrations.length === 0) && (
                  <div className="text-center py-12 text-on-surface-variant/70 italic text-xs font-semibold">
                    Chưa có hồ sơ tuyển sinh mới đăng ký.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
