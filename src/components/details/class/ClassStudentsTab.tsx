import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Users } from 'lucide-react';
import { api } from '../../../lib/api';
import { Button, Modal, Select } from '../../ui';
import { toast } from '../../../stores/toastStore';
import { cn } from '../../../lib/utils';
import { useSlidePanel } from '../../../context/SlidePanelContext';
import type { StudentRow } from '../../../types';

interface StudentTransferPanelContentProps {
  student: StudentRow;
  className: string;
  classesList: any[];
  classId: string;
  getGradeLabel: (grade: string) => string;
  refetchStudents: () => void;
  closePanel: () => void;
}

const StudentTransferPanelContent: React.FC<StudentTransferPanelContentProps> = ({
  student,
  className,
  classesList,
  classId,
  getGradeLabel,
  refetchStudents,
  closePanel,
}) => {
  const queryClient = useQueryClient();
  const [targetClassId, setTargetClassId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId) return;
    setIsTransferring(true);
    try {
      const res = await api.update('students', student.id, {
        class_id: targetClassId,
        updated_at: new Date().toISOString(),
      });
      if (res.error) throw new Error(res.error);

      toast.success(`Chuyển lớp thành công cho học sinh ${student.full_name}!`);
      refetchStudents();
      queryClient.invalidateQueries({ queryKey: ['classes-list'] });
      closePanel();
    } catch (err) {
      toast.error('Lỗi khi chuyển lớp học', err instanceof Error ? err.message : 'Lỗi hệ thống');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 select-none flex flex-col h-full justify-between">
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-primary-container/10 border border-primary/20 space-y-2">
          <p className="text-sm font-semibold text-on-surface">
            Học sinh: <span className="font-bold text-primary">{student.full_name}</span>
          </p>
          <p className="text-xs text-on-surface-variant">
            Lớp hiện tại: <span className="font-semibold text-on-surface">{className}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-on-surface tracking-[0.01em]">Chọn lớp chuyển đến</label>
          <select
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            className="w-full h-11 rounded-xl border border-outline-variant hover:border-outline bg-surface-container-lowest font-inter text-sm px-3 text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer font-semibold text-on-surface-variant"
            required
          >
            <option value="">-- Chọn lớp học mới --</option>
            {classesList
              .filter((c) => c.id !== classId)
              .map((c) => {
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40">
        <Button
          type="button"
          variant="outline"
          onClick={closePanel}
          className="rounded-xl cursor-pointer"
          disabled={isTransferring}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={!targetClassId || isTransferring}
          className="rounded-xl cursor-pointer"
        >
          {isTransferring ? 'Đang thực hiện...' : 'Xác nhận chuyển'}
        </Button>
      </div>
    </form>
  );
};

interface BulkStudentTransferPanelContentProps {
  selectedStudentIds: Set<string>;
  className: string;
  classesList: any[];
  classId: string;
  getGradeLabel: (grade: string) => string;
  refetchStudents: () => void;
  setSelectedStudentIds: (ids: Set<string>) => void;
  closePanel: () => void;
}

const BulkStudentTransferPanelContent: React.FC<BulkStudentTransferPanelContentProps> = ({
  selectedStudentIds,
  className,
  classesList,
  classId,
  getGradeLabel,
  refetchStudents,
  setSelectedStudentIds,
  closePanel,
}) => {
  const queryClient = useQueryClient();
  const [targetClassId, setTargetClassId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.size === 0 || !targetClassId) return;
    setIsTransferring(true);
    try {
      const promises = Array.from(selectedStudentIds).map((studentId) =>
        api.update('students', studentId, {
          class_id: targetClassId,
          updated_at: new Date().toISOString(),
        })
      );
      await Promise.all(promises);

      toast.success(`Đã chuyển lớp thành công cho ${selectedStudentIds.size} học sinh!`);
      setSelectedStudentIds(new Set());
      refetchStudents();
      queryClient.invalidateQueries({ queryKey: ['classes-list'] });
      closePanel();
    } catch (err) {
      toast.error('Lỗi khi chuyển lớp hàng loạt', err instanceof Error ? err.message : 'Lỗi hệ thống');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 select-none flex flex-col h-full justify-between">
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-primary-container/10 border border-primary/20 space-y-2">
          <p className="text-sm font-semibold text-on-surface">
            Số học sinh được chọn: <span className="font-bold text-primary">{selectedStudentIds.size} học sinh</span>
          </p>
          <p className="text-xs text-on-surface-variant">
            Lớp hiện tại: <span className="font-semibold text-on-surface">{className}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-on-surface tracking-[0.01em]">Chọn lớp chuyển đến</label>
          <select
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            className="w-full h-11 rounded-xl border border-outline-variant hover:border-outline bg-surface-container-lowest font-inter text-sm px-3 text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer font-semibold text-on-surface-variant"
            required
          >
            <option value="">-- Chọn lớp học mới --</option>
            {classesList
              .filter((c) => c.id !== classId)
              .map((c) => {
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/40">
        <Button
          type="button"
          variant="outline"
          onClick={closePanel}
          className="rounded-xl cursor-pointer"
          disabled={isTransferring}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={!targetClassId || isTransferring}
          className="rounded-xl cursor-pointer"
        >
          {isTransferring ? 'Đang thực hiện...' : 'Xác nhận chuyển'}
        </Button>
      </div>
    </form>
  );
};

interface ClassStudentsTabProps {
  classId: string;
  className: string;
  students: StudentRow[];
  isLoadingStudents: boolean;
  classesList: { id: string; name: string; grade_level: string }[];
  selectedStudentIds: Set<string>;
  setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  refetchStudents: () => void;
  getGradeLabel: (grade: string) => string;
}

export const ClassStudentsTab: React.FC<ClassStudentsTabProps> = ({
  classId,
  className,
  students,
  isLoadingStudents,
  classesList,
  selectedStudentIds,
  setSelectedStudentIds,
  refetchStudents,
  getGradeLabel,
}) => {
  const queryClient = useQueryClient();

  const { openPanel, closePanel } = useSlidePanel();

  const handleTransferClick = (student: StudentRow) => {
    openPanel({
      title: 'Chuyển lớp học sinh',
      icon: <ArrowRightLeft size={14} />,
      width: 480,
      component: (
        <StudentTransferPanelContent 
          student={student}
          className={className}
          classesList={classesList}
          classId={classId}
          getGradeLabel={getGradeLabel}
          refetchStudents={refetchStudents}
          closePanel={closePanel}
        />
      )
    });
  };

  return (
    <div className="space-y-4 animate-fade-in bg-white p-5 rounded-2xl border border-outline-variant/40 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-[13px] font-extrabold text-primary uppercase tracking-wider">
          Danh sách học sinh hoạt động
        </h4>
        {selectedStudentIds.size > 0 && (
          <button
            type="button"
            onClick={() => {
              openPanel({
                title: 'Chuyển lớp hàng loạt',
                icon: <ArrowRightLeft size={14} />,
                width: 480,
                component: (
                  <BulkStudentTransferPanelContent 
                    selectedStudentIds={selectedStudentIds}
                    className={className}
                    classesList={classesList}
                    classId={classId}
                    getGradeLabel={getGradeLabel}
                    refetchStudents={refetchStudents}
                    setSelectedStudentIds={setSelectedStudentIds}
                    closePanel={closePanel}
                  />
                )
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary hover:bg-primary/90 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer select-none shrink-0 whitespace-nowrap"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Chuyển lớp hàng loạt ({selectedStudentIds.size})
          </button>
        )}
      </div>

      {isLoadingStudents ? (
        <div className="space-y-2 py-4 animate-pulse">
          <div className="h-10 bg-surface-container rounded-xl" />
          <div className="h-10 bg-surface-container rounded-xl" />
          <div className="h-10 bg-surface-container rounded-xl" />
        </div>
      ) : students.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-outline-variant rounded-2xl text-on-surface-variant space-y-2">
          <Users className="w-8 h-8 mx-auto text-on-surface-variant/40" />
          <p className="text-[13px] font-bold">Lớp chưa có học sinh</p>
          <p className="text-[12px] text-on-surface-variant/80 px-4">
            Hãy xếp lớp cho trẻ từ mục chờ xếp lớp ngoài trang quản lý chính.
          </p>
        </div>
      ) : (
        <div className="border border-outline-variant/30 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/30 select-none text-[12px] text-on-surface-variant uppercase tracking-wider font-extrabold">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.size === students.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudentIds(new Set(students.map((s) => s.id)));
                      } else {
                        setSelectedStudentIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-outline accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-xs">Mã HS</th>
                <th className="px-4 py-3 font-semibold text-xs">Họ và tên</th>
                <th className="px-4 py-3 font-semibold text-xs">Giới tính</th>
                <th className="px-4 py-3 font-semibold text-xs">Ngày sinh</th>
                <th className="px-4 py-3 font-semibold text-xs text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-medium text-[13.5px]">
              {students.map((student) => {
                const isChecked = selectedStudentIds.has(student.id);
                return (
                  <tr key={student.id} className="hover:bg-surface-container-lowest/50 transition-all">
                    <td className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = new Set(selectedStudentIds);
                          if (next.has(student.id)) {
                            next.delete(student.id);
                          } else {
                            next.add(student.id);
                          }
                          setSelectedStudentIds(next);
                        }}
                        className="w-4 h-4 rounded border-outline accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface font-semibold">
                      {student.student_code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      {student.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-semibold',
                          student.gender === 'male'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-pink-50 text-pink-700 border border-pink-100'
                        )}
                      >
                        {student.gender === 'male' ? 'Nam' : 'Nữ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {student.date_of_birth
                        ? new Date(student.date_of_birth).toLocaleDateString('vi-VN')
                        : '---'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleTransferClick(student)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary rounded-xl text-xs font-semibold border border-outline-variant/40 transition-all cursor-pointer select-none"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Chuyển lớp
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
