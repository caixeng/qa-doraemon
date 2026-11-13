import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomSheet } from './MobileBottomSheet';
import { 
  ClipboardCheck, 
  UserPlus, 
  CreditCard, 
  HeartPulse, 
  BellPlus,
  Sparkles,
  Plus
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSlidePanel } from '../ui';
import { StudentForm } from '../forms/StudentForm';
import { FeeForm } from '../forms/FeeForm';
import { HealthRecordForm } from '../forms/HealthRecordForm';
import { NotificationForm } from '../forms/NotificationForm';
import { useClassesList } from '../../hooks/useClassesList';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface MobileQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileQuickActionModal: React.FC<MobileQuickActionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const userRole = useAuthStore((state) => state.user?.role);
  const { openPanel } = useSlidePanel();
  const { classesList } = useClassesList();

  // Fetch student list for health form
  const { data: studentsResponse } = useQuery({
    queryKey: ['students-quick-action'],
    queryFn: () => api.getAll<any>('students', { page: 1, pageSize: 200 }),
    enabled: isOpen,
  });

  const studentsList = studentsResponse?.data?.data || [];

  const actions = [
    {
      title: 'Điểm danh lớp',
      desc: 'Cập nhật có mặt, nghỉ học, báo cơm học sinh',
      icon: ClipboardCheck,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      roles: ['admin', 'teacher'],
      action: () => {
        onClose();
        navigate('/attendance');
      },
    },
    {
      title: 'Thêm học sinh mới',
      desc: 'Mở form nhập hồ sơ học sinh mới ngay',
      icon: UserPlus,
      color: 'from-sky-500 to-blue-600',
      textColor: 'text-sky-700 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900',
      roles: ['admin'],
      action: () => {
        onClose();
        navigate('/students');
        openPanel({
          title: 'Thêm học sinh mới',
          icon: <UserPlus size={14} />,
          width: 768,
          component: <StudentForm classesList={classesList} />
        });
      },
    },
    {
      title: 'Tạo phiếu thu / Học phí',
      desc: 'Mở form lập hóa đơn tiền học, tiền ăn',
      icon: CreditCard,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      roles: ['admin'],
      action: () => {
        onClose();
        navigate('/finance');
        openPanel({
          title: 'Tạo phiếu thu / Học phí mới',
          icon: <CreditCard size={14} />,
          width: 600,
          component: <FeeForm />
        });
      },
    },
    {
      title: 'Cập nhật Sức khỏe',
      desc: 'Mở form ghi nhận cân nặng, chiều cao, khám',
      icon: HeartPulse,
      color: 'from-rose-500 to-pink-600',
      textColor: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      roles: ['admin', 'teacher'],
      action: () => {
        onClose();
        navigate('/health');
        openPanel({
          title: 'Thêm hồ sơ sức khỏe mới',
          icon: <HeartPulse size={14} />,
          width: 600,
          component: <HealthRecordForm studentsList={studentsList} />
        });
      },
    },
    {
      title: 'Gửi Thông báo mới',
      desc: 'Mở form soạn và phát thông báo toàn trường',
      icon: BellPlus,
      color: 'from-purple-500 to-indigo-600',
      textColor: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
      roles: ['admin', 'teacher'],
      action: () => {
        onClose();
        navigate('/notifications');
        openPanel({
          title: 'Tạo thông báo mới',
          icon: <BellPlus size={14} />,
          width: 600,
          component: <NotificationForm classesList={classesList} />
        });
      },
    },
  ];

  const visibleActions = actions.filter(
    (act) => !act.roles || (userRole && act.roles.includes(userRole as any))
  );

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-on-surface">Thao tác nhanh Doraemon</span>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 pb-2">
        {visibleActions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={act.action}
              className={`flex items-center gap-3.5 p-3.5 rounded-2xl border ${act.bgColor} active:scale-98 transition-all text-left shadow-xs cursor-pointer hover:shadow-md`}
            >
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white shadow-md shrink-0`}
              >
                <Icon className="w-5.5 h-5.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm ${act.textColor}`}>{act.title}</h4>
                <p className="text-xs text-on-surface-variant truncate mt-0.5">{act.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </MobileBottomSheet>
  );
};
