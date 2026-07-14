import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Copy, 
  Save, 
  Edit2, 
  CalendarRange,
  BookOpen,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import { toast } from "../stores/toastStore";
import { useSlidePanel, ErrorState, ConfirmDialog } from "../components/ui";
import { WeeklyPlanForm } from "../components/forms/WeeklyPlanForm";
import { useAuthStore } from "../stores/authStore";
import { useClassesList } from "../hooks/useClassesList";

// 12 Khung giờ sinh hoạt mặc định theo mẫu của Trường Mầm non Doraemon
const DEFAULT_ROWS = [
  {
    id: "don_tre",
    time: "6h45 - 8h20",
    name: "Đón trẻ & Vui chơi",
    isWeeklyCommon: true,
    commonContent: "- Chào hỏi lễ phép, vui vẻ\n- Tự mang và cất đồ dùng cá nhân đúng nơi quy định\n- Chơi chung với bạn trong nhóm",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "the_duc_sang",
    time: "6h45 - 8h20",
    name: "Tập thể dục sáng",
    isWeeklyCommon: true,
    commonContent: "- Tập đội hình, đội ngũ\n- Tập các động tác phát triển các nhóm cơ: Hô hấp, tay, vai, bụng - lườn, chân.",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "an_sang",
    time: "6h45 - 8h20",
    name: "Ăn sáng",
    isWeeklyCommon: true,
    commonContent: "- Nhận biết bữa ăn trong ngày\n- Nhận biết món ăn\n- Thực hiện hành vi văn hóa khi ăn: mời cô và các bạn, ăn gọn gàng, ăn hết khẩu phần trong thời gian quy định\n- Kỹ năng cầm bát, thìa tự xúc ăn\n- Tự rửa tay bằng xà phòng, lau mặt, súc miệng (đúng quy trình và sạch)\n- Tự lấy nước uống đúng cốc của mình",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "hoc_1",
    time: "8h30 - 9h00",
    name: "Hoạt động học 1",
    isWeeklyCommon: false,
    commonContent: "",
    dailyContent: {
      mon: "Tiếng Anh GVNN\nReview animals",
      tue: "Khoa học vui\nThí nghiệm: San hô sắc màu",
      wed: "Võ thuật\nKaratedo",
      thu: "PTTC\nVĐCB: Bật liên tục qua chướng ngại vật.\nTCVĐ: Nhảy lò cò",
      fri: "Toán\nVật nào chứa nhiều hơn?",
      sat: "CLB Âm nhạc"
    }
  },
  {
    id: "hoc_2",
    time: "9h05 - 9h35",
    name: "Hoạt động học 2",
    isWeeklyCommon: false,
    commonContent: "",
    dailyContent: {
      mon: "Vận động nước",
      tue: "Thư viện của bé\nTruyện \"Tòa nhà 100 tầng dưới đại dương\"",
      wed: "Âm nhạc\nTập hát bài hát: Chú Ếch con",
      thu: "Tiếng Anh\nReview letter U,V",
      fri: "Tiếng Anh GVNN\nAnimal sounds",
      sat: "CLB Tiếng anh"
    }
  },
  {
    id: "bua_phu_sang",
    time: "9h40 - 9h50",
    name: "Bữa phụ sáng",
    isWeeklyCommon: true,
    commonContent: "Bữa phụ sáng (sữa / hoa quả / bánh)",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "hoc_3",
    time: "9h55 - 10h25",
    name: "Hoạt động học 3",
    isWeeklyCommon: false,
    commonContent: "",
    dailyContent: {
      mon: "Tạo hình\nTạo hình: Chú rùa biển",
      tue: "Dance\nNhảy: Bài ca mùa hạ",
      wed: "Tiếng Anh GVNN\nPresentation skill: My favorite animal",
      thu: "Chơi nhà bóng",
      fri: "HĐNT\nĐạp xe",
      sat: "HĐNT\nTrò chơi: Thi ai nhanh"
    }
  },
  {
    id: "an_trua",
    time: "10h30 - 11h15",
    name: "Ăn trưa",
    isWeeklyCommon: true,
    commonContent: "- Nhận biết bữa ăn trong ngày, Nhận biết món ăn\n- Thực hiện hành vi văn hóa khi ăn: mời cô và các bạn, ăn gọn gàng, ăn hết khẩu phần trong thời gian quy định\n- Kỹ năng cầm bát, thìa tự xúc ăn, tự lấy nước uống đúng cốc của mình\n- Tự rửa tay bằng xà phòng, lau mặt, súc miệng (đúng quy trình và sạch)",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "ngu_trua",
    time: "11h20 - 14h00",
    name: "Ngủ trưa",
    isWeeklyCommon: true,
    commonContent: "- Nghe nhạc thiền\n- Không trêu đùa bạn, không đi lên đệm khi về chỗ ngủ\n- Cất đệm và chăn gối sau giờ ngủ",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "van_dong_chieu",
    time: "14h00 - 14h30",
    name: "Vận động - Bữa phụ chiều - Vệ sinh cá nhân",
    isWeeklyCommon: true,
    commonContent: "- Tập các động tác chống mệt mỏi và phát triển các nhóm cơ: Hô hấp, Tay, vai, bụng - lườn, chân\n- Nhận biết bữa ăn trong ngày; Nhận biết món ăn\n- Thực hiện hành vi văn hóa khi ăn: mời cô và các bạn, ăn gọn gàng, ăn hết khẩu phần trong thời gian quy định\n- Kỹ năng cầm cốc, thìa\n- Tự rửa tay bằng xà phòng, lau mặt, súc miệng (đúng quy trình và sạch)",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "hoc_chieu_1",
    time: "14h35 - 15h05",
    name: "Hoạt động chiều 1",
    isWeeklyCommon: false,
    commonContent: "",
    dailyContent: {
      mon: "Cảm thụ âm nhạc\nGiới thiệu về đàn Xylophone, chơi bản nhạc Ode to joy",
      tue: "Tiếng Anh\nReview animals",
      wed: "Học tại TTHT\nHoạt động Steam: Làm chú Ếch từ giấy màu và bóng bay",
      thu: "Toán tư duy\nTư duy quan sát",
      fri: "Bé làm MC\nBé biết gì về đại dương xanh",
      sat: "NTNN\nÔn tập chữ cái"
    }
  },
  {
    id: "hoc_chieu_2",
    time: "15h10 - 15h40",
    name: "Hoạt động chiều 2",
    isWeeklyCommon: false,
    commonContent: "",
    dailyContent: {
      mon: "NTNN\nTrò chơi với chữ cái",
      tue: "Mỹ thuật sáng tạo\nTạo hình con bạch tuộc từ giấy màu",
      wed: "NTNN\nThơ: Rong và cá",
      thu: "HĐG\nGóc phân vai: Bé làm đầu bếp\nGóc học tập: Khám phá giáo cụ học tập",
      fri: "TC - KN xã hội\nBé bảo vệ Biển xanh",
      sat: "Sinh hoạt cuối tuần"
    }
  },
  {
    id: "an_chieu",
    time: "15h45 - 16h30",
    name: "Ăn chiều, vệ sinh sau ăn",
    isWeeklyCommon: true,
    commonContent: "- Nhận biết bữa ăn trong ngày\n- Nhận biết món ăn\n- Thực hiện hành vi văn hóa khi ăn: mời cô và các bạn, ăn gọn gàng, ăn hết khẩu phần trong thời gian quy định\n- Kỹ năng cầm cốc, thìa; tự lấy nước uống đúng cốc của mình\n- Tự rửa tay bằng xà phòng, lau mặt, súc miệng (đúng quy trình và sạch)",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  },
  {
    id: "tra_tre",
    time: "16h30 - 17h00",
    name: "Trò chuyện - Nêu gương - Trả trẻ",
    isWeeklyCommon: true,
    commonContent: "- Sắp xếp đồ dùng đồ chơi ngăn nắp;\n- Cô sửa soạn trang phục, chải tóc gọn gàng cho trẻ\n- Trò chuyện, nêu gương, hát/đọc thơ/kể chuyện trong khi chờ trả trẻ\n- Chào hỏi lễ phép khi bố mẹ đến đón/chào cô, chào các bạn khi ra về",
    dailyContent: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" }
  }
];

interface CreatePlanFormProps {
  classesList: any[];
  onClose: () => void;
  onCreate: (classId: string, weekMonday: Date, theme: string, approver: string) => void;
  classId?: string;
}

function CreatePlanForm({ classesList, onClose, onCreate, classId }: CreatePlanFormProps) {
  const [selectedClass, setSelectedClass] = useState(classId || classesList[0]?.id || "");
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [theme, setTheme] = useState("Thế giới đại dương");
  const [approver, setApprover] = useState("Hiệu Trưởng Nguyễn Thị Thu");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !weekDate) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    onCreate(selectedClass, new Date(weekDate), theme, approver);
  };

  return (
    <div className="p-6 bg-surface">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!classId && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 font-inter">Lớp học</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-semibold cursor-pointer"
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>Lớp {c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 font-inter">Chọn tuần (Chọn ngày bất kỳ trong tuần)</label>
          <input
            type="date"
            value={weekDate}
            onChange={(e) => setWeekDate(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 font-inter">Chủ đề tuần</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
            placeholder="Ví dụ: Thế giới đại dương"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 font-inter">Người duyệt</label>
          <input
            type="text"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
            placeholder="Ví dụ: Hiệu Trưởng Nguyễn Thị Thu"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-outline-variant/30 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-container text-sm font-semibold text-on-surface rounded-xl border border-outline-variant/30 hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1.5"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:bg-primary/95 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            Tạo Khung Kế Hoạch
          </button>
        </div>
      </form>
    </div>
  );
}

export function WeeklyPlans({ classId }: { classId?: string }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isPrivileged = user?.role === 'admin' || user?.role === 'teacher';
  const { openPanel, closePanel } = useSlidePanel();

  // States
  const [newPlanDraft, setNewPlanDraft] = useState<any>(null);

  const handleCreateNewPlan = () => {
    if (classesList.length === 0 && !classId) return;
    openPanel({
      title: 'Tạo kế hoạch tuần mới',
      icon: <Plus size={14} />,
      width: 480,
      component: (
        <CreatePlanForm 
          classesList={classesList}
          classId={classId}
          onClose={closePanel}
          onCreate={(targetClassId, weekMonday, newTheme, approver) => {
            const weekMondayStr = weekMonday.toISOString().split('T')[0];
            setNewPlanDraft({
              classId: targetClassId,
              weekMondayStr,
              theme: newTheme,
              approverName: approver
            });
            setSelectedClassId(targetClassId);
            setCurrentDate(weekMonday);
            setTheme(newTheme);
            setApproverName(approver);
            setRows(DEFAULT_ROWS);
            closePanel();
            toast.success("Đã tạo khung kế hoạch tuần mới. Bấm vào các ô trong bảng dưới đây để nhập nội dung và bấm 'Lưu Kế Hoạch'!");
          }}
        />
      )
    });
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>(classId || "");
  const [theme, setTheme] = useState<string>("Thế giới đại dương");
  const [approverName, setApproverName] = useState<string>("");
  const [rows, setRows] = useState<any[]>(DEFAULT_ROWS);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [showCloneConfirm, setShowCloneConfirm] = useState(false);

  useEffect(() => {
    if (classId) {
      setSelectedClassId(classId);
    }
  }, [classId]);

  // 1. Fetch classes
  const { classesList, isLoading: loadingClasses } = useClassesList();

  useEffect(() => {
    if (classesList.length > 0 && !selectedClassId) {
      setSelectedClassId(classesList[0].id);
    }
  }, [classesList, selectedClassId]);

  // Helper: Get Monday of the week
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const monday = getMonday(new Date(currentDate));
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const startOfWeekStr = weekDates[0].toISOString().split('T')[0];

  // 2. Fetch weekly plan for selected class & week
  const { data: planQueryResponse, isLoading: loadingPlan, refetch } = useQuery({
    queryKey: ['weekly-plan', startOfWeekStr, selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      return api.getAll<any>(
        'weekly_plans',
        { page: 1, pageSize: 1 },
        {
          filters: {
            class_id: selectedClassId,
            week_start_date: startOfWeekStr
          }
        }
      );
    },
    enabled: !!selectedClassId
  });

  const activePlan = planQueryResponse?.data?.data?.[0] || null;

  // Sync state with fetched database record
  useEffect(() => {
    if (activePlan) {
      setTheme(activePlan.theme || "");
      setApproverName(activePlan.approver_name || "");
      if (Array.isArray(activePlan.content) && activePlan.content.length > 0) {
        setRows(activePlan.content);
      } else {
        setRows(DEFAULT_ROWS);
      }
      setNewPlanDraft(null); // Clear draft khi đã có dữ liệu lưu trên DB
    } else {
      // Khi chưa có record trên DB:
      // Nếu trùng khớp với thông tin nháp vừa tạo mới, ta dùng thông tin nháp thay vì ghi đè bằng mặc định!
      if (newPlanDraft && newPlanDraft.classId === selectedClassId && newPlanDraft.weekMondayStr === startOfWeekStr) {
        setTheme(newPlanDraft.theme);
        setApproverName(newPlanDraft.approverName);
        setRows(DEFAULT_ROWS);
      } else {
        setTheme("Thế giới đại dương");
        setApproverName("Hiệu Trưởng Nguyễn Thị Thu");
        setRows(DEFAULT_ROWS);
      }
    }
  }, [activePlan, selectedClassId, startOfWeekStr, newPlanDraft]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Edit panel for a specific row & cell
  const handleEditCell = (rowId: string, dayKey: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'common') => {
    if (!isPrivileged) return;
    const targetRow = rows.find(r => r.id === rowId);
    if (!targetRow) return;

    openPanel({
      title: 'Chỉnh sửa hoạt động tuần',
      icon: <Edit2 size={14} />,
      width: 640,
      component: (
        <WeeklyPlanForm 
          rowData={targetRow}
          dayKey={dayKey}
          onClose={closePanel}
          onSave={(updatedRow) => {
            setRows(prev => prev.map(r => r.id === rowId ? updatedRow : r));
            closePanel();
            toast.success("Đã cập nhật hoạt động tạm thời. Đừng quên bấm 'Lưu Kế Hoạch' để hoàn tất!");
          }}
        />
      )
    });
  };

  // Save full weekly plan to database
  const handleSavePlan = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const schoolId = user?.school_id || '00000000-0000-0000-0000-000000000001';
      const payload = {
        school_id: schoolId,
        class_id: selectedClassId,
        week_start_date: startOfWeekStr,
        theme: theme.trim() || 'Kế hoạch tuần',
        content: rows,
        approver_name: approverName.trim(),
        created_by: user?.id || null,
        updated_at: new Date().toISOString()
      };

      if (activePlan?.id) {
        // Update existing record
        const res = await api.update('weekly_plans', activePlan.id, payload);
        if (res.error) throw new Error(res.error);
        toast.success("Cập nhật kế hoạch tuần thành công!");
      } else {
        // Insert new record
        const res = await api.create('weekly_plans', payload);
        if (res.error) throw new Error(res.error);
        toast.success("Tạo mới kế hoạch tuần thành công!");
      }
      refetch();
    } catch (err: any) {
      toast.error("Lỗi khi lưu kế hoạch", err.message || "Lỗi hệ thống");
    } finally {
      setSaving(false);
    }
  };

  // Clone from last week
  const handleCloneLastWeek = async (skipConfirm = false) => {
    if (!selectedClassId) return;
    setCloning(true);
    try {
      const lastMonday = new Date(monday);
      lastMonday.setDate(monday.getDate() - 7);
      const lastStartOfWeekStr = lastMonday.toISOString().split('T')[0];

      // Fetch last week's plan
      const lastWeekRes = await api.getAll<any>(
        'weekly_plans',
        { page: 1, pageSize: 1 },
        {
          filters: {
            class_id: selectedClassId,
            week_start_date: lastStartOfWeekStr
          }
        }
      );

      const lastWeekPlan = lastWeekRes.data?.data?.[0] || null;
      if (!lastWeekPlan) {
        toast.warning("Không có dữ liệu", "Không tìm thấy kế hoạch nào ở tuần trước của lớp này.");
        return;
      }

      // Check if we already have plan this week
      if (activePlan && !skipConfirm) {
        setShowCloneConfirm(true);
        return;
      }

      // Clone content and theme
      setTheme(lastWeekPlan.theme);
      setApproverName(lastWeekPlan.approver_name || "Hiệu Trưởng Nguyễn Thị Thu");
      if (Array.isArray(lastWeekPlan.content)) {
        setRows(lastWeekPlan.content);
      }
      toast.success("Sao chép thành công! Đừng quên bấm 'Lưu Kế Hoạch' để cập nhật vào database.");
    } catch (err: any) {
      toast.error("Lỗi khi sao chép", err.message || "Lỗi hệ thống");
    } finally {
      setCloning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getClassName = () => {
    const c = classesList.find(cls => cls.id === selectedClassId);
    return c ? c.name : "";
  };

  const getGradeLevelName = () => {
    const c = classesList.find(cls => cls.id === selectedClassId);
    if (!c) return "Mẫu giáo lớn";
    switch (c.grade_level) {
      case 'nha_tre': return 'Nhóm trẻ';
      case 'mam': return 'Khối Mầm';
      case 'choi': return 'Khối Chồi';
      case 'la': return 'Khối Lá';
      default: return 'Khối Mẫu giáo lớn';
    }
  };

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      {/* Header Panel - Hidden in Printing */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        {!classId ? (
          <div>
            <h2 className="text-[20px] md:text-[24px] font-bold italic font-playfair text-on-surface leading-tight tracking-[-0.02em]">Kế Hoạch Tuần</h2>
            <p className="hidden md:block text-[13px] md:text-[14px] text-on-surface-variant mt-1 font-inter">
              Xây dựng thời khóa biểu học tập, vui chơi hàng tuần cho lớp học của các cô.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider font-inter">Kế hoạch tuần học tập</h3>
          </div>
        )}

        <div className="flex flex-wrap gap-2 shrink-0">
          {classId && isPrivileged && (
            <button
              onClick={handleCreateNewPlan}
              className="inline-flex items-center justify-center gap-1.5 md:gap-2 bg-primary text-on-primary hover:bg-primary/95 px-3 md:px-4 py-2 rounded-xl text-[13px] font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Kế Hoạch Mới</span>
            </button>
          )}

          {classId && isPrivileged && (
            <button
              onClick={() => handleCloneLastWeek(false)}
              disabled={cloning}
              className="inline-flex items-center justify-center gap-1.5 md:gap-2 bg-white dark:bg-slate-800 hover:bg-surface-container border border-outline-variant/40 px-2.5 md:px-3.5 py-2 rounded-xl text-[13px] font-semibold text-on-surface transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Nhân bản tuần trước"
            >
              <Copy className="w-4 h-4 text-on-surface-variant" />
              <span className="hidden md:inline">{cloning ? 'Đang sao chép...' : 'Nhân Bản Tuần Trước'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 md:gap-2 bg-white dark:bg-slate-800 hover:bg-surface-container border border-outline-variant/40 px-2.5 md:px-3.5 py-2 rounded-xl text-[13px] font-semibold text-on-surface transition-all cursor-pointer whitespace-nowrap"
            title="In kế hoạch"
          >
            <Printer className="w-4 h-4 text-on-surface-variant" />
            <span className="hidden md:inline">In Kế Hoạch</span>
          </button>

          {classId && isPrivileged && (
            <button
              onClick={handleSavePlan}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 md:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-xl text-[13px] font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Kế Hoạch'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Week Navigator, Class Selector & Week Topic - Hidden in Printing */}
      <div className="bg-surface dark:bg-slate-900 border border-outline-variant/40 rounded-2xl p-4 space-y-4 print:hidden shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Week Navigator */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto">
            <button
              onClick={handlePrevWeek}
              className="shrink-0 p-2 hover:bg-surface-container-high/60 dark:hover:bg-slate-800 rounded-xl text-on-surface transition-all cursor-pointer border border-outline-variant/30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="shrink-0 px-3 py-1.5 bg-surface-container dark:bg-slate-800 hover:bg-surface-container-high text-xs font-bold text-on-surface rounded-xl transition-all cursor-pointer"
            >
              Tuần Này
            </button>

            <span className="shrink-0 text-[12px] md:text-sm font-bold text-on-surface px-2 whitespace-nowrap flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-primary" />
              {weekDates[0].toLocaleDateString('vi-VN')} - {weekDates[5].toLocaleDateString('vi-VN')}
            </span>

            <button
              onClick={handleNextWeek}
              className="shrink-0 p-2 hover:bg-surface-container-high/60 dark:hover:bg-slate-800 rounded-xl text-on-surface transition-all cursor-pointer border border-outline-variant/30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Class Select */}
          {!classId && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-on-surface-variant" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-surface-container-low dark:bg-slate-800 text-on-surface py-2 px-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none transition-all text-sm font-semibold cursor-pointer min-w-[200px]"
              >
                {loadingClasses ? (
                  <option>Đang tải lớp học...</option>
                ) : (
                  classesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kế hoạch lớp {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {/* Plan Configs: Week Theme & Approver Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-outline-variant/30 pt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Chủ đề tuần</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-surface-container-low dark:bg-slate-800 text-on-surface py-2.5 px-3.5 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
              placeholder="Nhập tên chủ đề (ví dụ: Thế giới đại dương)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Hiệu trưởng/Người duyệt</label>
            <div className="relative">
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-slate-800 text-on-surface py-2.5 px-3.5 pl-10 rounded-xl border border-outline-variant/40 focus:border-primary text-sm font-medium transition-all"
                placeholder="Ví dụ: Hiệu Trưởng Nguyễn Thị Thu"
              />
              <UserCheck className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Hướng dẫn chỉnh sửa - chỉ hiện khi giáo viên/admin đăng nhập */}
      {isPrivileged && (
        <div className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-sky-850 dark:text-sky-350 print:hidden shadow-2xs leading-relaxed font-inter">
          <span className="flex h-2 w-2 relative shrink-0 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <div>
            <strong>Hướng dẫn lập kế hoạch:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              {classId ? (
                <li>Chọn Tuần học cần làm việc ở bộ lọc phía trên. Nếu tuần đó chưa có dữ liệu, hệ thống tự động tải khung kế hoạch mẫu.</li>
              ) : (
                <li>Chọn Lớp học và Tuần học cần làm việc ở bộ lọc phía trên. Nếu tuần đó chưa có dữ liệu, hệ thống tự động tải khung kế hoạch mẫu.</li>
              )}
              <li>Bấm <strong>trực tiếp vào bất kỳ ô nào</strong> trong bảng dưới đây để mở bảng nhập liệu hoạt động.</li>
              <li>Sau khi hoàn thành chỉnh sửa, hãy bấm nút <strong className="text-emerald-600 dark:text-emerald-400">Lưu Kế Hoạch</strong> ở trên cùng để lưu lại vào cơ sở dữ liệu.</li>
              <li>Bạn cũng có thể bấm <strong className="text-primary">Tạo Kế Hoạch Mới</strong> để chọn nhanh lớp/tuần khác và dựng khung kế hoạch tuần mới.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Print-Only Header Layout (styled exactly like file Word) */}
      <div className="hidden print:block w-full text-slate-900 font-inter mb-4">
        <table className="w-full border-collapse border border-slate-900">
          <tbody>
            <tr>
              <td className="w-1/2 p-3 align-top border-r border-slate-900">
                <div className="font-extrabold text-[12px] uppercase">TRƯỜNG MẦM NON DORAEMON</div>
                <div className="text-[12px] font-semibold mt-1">Khối: {getGradeLevelName()} - Lớp: {getClassName()}</div>
              </td>
              <td className="w-1/2 p-3 align-top text-center">
                <div className="font-black text-[13px] uppercase tracking-wide">KẾ HOẠCH TUẦN: {theme.toUpperCase()}</div>
                <div className="text-[12px] font-medium italic mt-1">Thời gian thực hiện: {weekDates[0].toLocaleDateString('vi-VN')} - {weekDates[5].toLocaleDateString('vi-VN')}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weekly Interactive Grid */}
      {loadingPlan ? (
        <div className="h-96 bg-surface dark:bg-slate-900 border border-outline-variant/20 rounded-3xl animate-pulse shadow-xs" />
      ) : (
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative bg-surface dark:bg-slate-900 border border-outline-variant/40 rounded-[28px] print:border-slate-900 print:rounded-none shadow-xs">
          <table className="w-full text-left text-sm border-collapse min-w-[900px] print:text-[12px] print:text-slate-900">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-outline-variant/60 dark:border-slate-700 print:bg-white print:border-slate-900">
                <th className="px-3 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center w-[8%] sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thời gian</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 2</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 3</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 4</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 5</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 6</th>
                <th className="px-4 py-3 font-extrabold text-on-surface dark:text-slate-200 text-[12px] uppercase tracking-wider text-center border-l border-outline-variant/40 dark:border-slate-700 sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 print:bg-white print:text-slate-900 print:border-l print:border-slate-900 select-none shadow-[0_1px_0_0_rgba(0,0,0,0.05)] print:shadow-none">Thứ 7</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 dark:divide-slate-800/80 print:divide-slate-900">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/20 transition-colors print:hover:bg-transparent">
                  {/* Cột thời gian (cột 1) */}
                  <td className="px-2 py-4 text-center border-r border-outline-variant/30 dark:border-slate-800/60 print:border-slate-900 font-mono text-xs text-on-surface dark:text-slate-350 select-none align-middle font-bold print:text-[12px] print:text-slate-900">
                    <div>{row.time}</div>
                  </td>

                  {/* Cột nội dung (Cột 2 đến 7) */}
                  {row.isWeeklyCommon ? (
                    /* Dòng hoạt động chung - Gộp ô (ColSpan=6) */
                    <td
                      colSpan={6}
                      onClick={() => classId && isPrivileged && handleEditCell(row.id, 'common')}
                      className={cn(
                        "px-4 py-4 text-center align-middle relative group transition-all print:border-slate-900",
                        classId && isPrivileged ? "cursor-pointer hover:bg-primary/5 dark:hover:bg-slate-800/30" : ""
                      )}
                    >
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="text-xs font-black uppercase tracking-wider text-primary dark:text-blue-400 print:text-slate-900 print:text-[12px]">
                          {row.name}
                        </div>
                        <div className="text-xs font-medium text-on-surface-variant dark:text-slate-300 text-left whitespace-pre-line leading-relaxed max-w-3xl mx-auto print:text-slate-800 print:text-[12px]">
                          {row.commonContent}
                        </div>
                      </div>
                      
                      {classId && isPrivileged && (
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                          <span className="p-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20 flex items-center justify-center">
                            <Edit2 className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </td>
                  ) : (
                    /* Dòng hoạt động học/chuyên sâu - Chia nhỏ theo ngày */
                    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => {
                      const text = row.dailyContent?.[day] || "";
                      return (
                        <td
                          key={day}
                          onClick={() => classId && isPrivileged && handleEditCell(row.id, day as any)}
                          className={cn(
                            "px-3 py-3 border-l border-outline-variant/30 dark:border-slate-800/60 print:border-slate-900 align-top relative group min-w-[140px] transition-all",
                            classId && isPrivileged ? "cursor-pointer hover:bg-primary/5 dark:hover:bg-slate-800/30" : ""
                          )}
                        >
                          <div className="flex flex-col justify-between h-full min-h-[75px] text-left">
                            <p className="text-xs font-semibold text-on-surface dark:text-slate-200 whitespace-pre-line leading-relaxed print:text-[12px] print:text-slate-900">
                              {text}
                            </p>

                            {classId && isPrivileged && (
                              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-2 print:hidden">
                                <span className="p-1 bg-primary/10 text-primary rounded-lg border border-primary/20 flex items-center justify-center">
                                  <Edit2 className="w-3 h-3" />
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Print-Only Signature Section (Styled exactly like file Word) */}
      <div className="hidden print:block w-full text-slate-900 font-inter mt-8 select-none">
        <div className="flex justify-around text-center text-xs font-bold">
          <div className="w-1/2 flex flex-col items-center">
            <span className="uppercase text-[12px]">NGƯỜI LẬP</span>
            <span className="text-[12px] font-normal text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</span>
            <div className="h-16"></div> {/* Khoảng trống cho chữ ký */}
            <span className="text-[12px] font-bold mt-2">{user?.full_name || "Lê Thị Chung"}</span>
          </div>
          
          <div className="w-1/2 flex flex-col items-center">
            <span className="uppercase text-[12px]">NGƯỜI DUYỆT</span>
            <span className="text-[12px] font-normal text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</span>
            <div className="h-16"></div>
            <span className="text-[12px] font-bold mt-2">{approverName || "Hiệu Trưởng Nguyễn Thị Thu"}</span>
          </div>
        </div>
      </div>

      {/* Confirm dialogues */}
      <ConfirmDialog
        open={showCloneConfirm}
        title="Sao chép đè kế hoạch tuần?"
        message="Tuần này đã có dữ liệu kế hoạch. Bạn có chắc chắn muốn sao chép đè dữ liệu từ tuần trước sang?"
        confirmText="Sao chép đè"
        cancelText="Hủy"
        variant="warning"
        onConfirm={async () => {
          setShowCloneConfirm(false);
          await handleCloneLastWeek(true);
        }}
        onClose={() => setShowCloneConfirm(false)}
      />
    </div>
  );
}
