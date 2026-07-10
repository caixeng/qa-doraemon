import type { FeeStatus } from '../types/database';

/**
 * Các hàm thuần cho nghiệp vụ học phí. Logic trạng thái phản chiếu trigger
 * `check_fee_overdue` phía database (migration 012) để UI hiển thị nhất quán
 * với giá trị DB sẽ tự chốt khi lưu.
 */

export interface FeeAmounts {
  base_amount: number;
  meal_amount: number;
  extra_amount: number;
  discount: number;
}

/** Tổng phiếu thu = cơ bản + tiền ăn + khoản khác − miễn giảm (không âm). */
export function computeFeeTotal(amounts: FeeAmounts): number {
  const total =
    Number(amounts.base_amount || 0) +
    Number(amounts.meal_amount || 0) +
    Number(amounts.extra_amount || 0) -
    Number(amounts.discount || 0);
  return Math.max(total, 0);
}

/** Số tiền còn thiếu (không âm — đóng dư không tạo "nợ âm"). */
export function feeRemaining(totalAmount: number, paidAmount: number): number {
  return Math.max(Number(totalAmount || 0) - Number(paidAmount || 0), 0);
}

/**
 * Trạng thái phiếu thu theo cùng thứ tự ưu tiên với trigger DB:
 * đóng đủ → paid; quá hạn chưa đủ → overdue; đóng một phần → partial;
 * còn lại → pending.
 */
export function resolveFeeStatus(params: {
  totalAmount: number;
  paidAmount: number;
  dueDate: string | Date | null;
  today?: Date;
}): FeeStatus {
  const { totalAmount, paidAmount, dueDate } = params;
  const today = params.today ?? new Date();

  if (Number(paidAmount) >= Number(totalAmount)) return 'paid';

  if (dueDate) {
    const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
    const todayYmd = today.toISOString().slice(0, 10);
    const dueYmd = due.toISOString().slice(0, 10);
    if (dueYmd < todayYmd) return 'overdue';
  }

  return Number(paidAmount) > 0 ? 'partial' : 'pending';
}
