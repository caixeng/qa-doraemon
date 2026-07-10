import { describe, it, expect } from 'vitest';
import { computeFeeTotal, feeRemaining, resolveFeeStatus } from './fees';
import { getVietnameseSortKeys } from './vietnameseName';

describe('computeFeeTotal', () => {
  it('cộng đủ 3 khoản và trừ miễn giảm', () => {
    expect(
      computeFeeTotal({
        base_amount: 3_500_000,
        meal_amount: 800_000,
        extra_amount: 200_000,
        discount: 500_000,
      })
    ).toBe(4_000_000);
  });

  it('không âm khi miễn giảm lớn hơn tổng', () => {
    expect(
      computeFeeTotal({
        base_amount: 100_000,
        meal_amount: 0,
        extra_amount: 0,
        discount: 999_999,
      })
    ).toBe(0);
  });

  it('chịu được giá trị null/undefined từ form', () => {
    expect(
      computeFeeTotal({
        base_amount: undefined as unknown as number,
        meal_amount: null as unknown as number,
        extra_amount: 300_000,
        discount: 0,
      })
    ).toBe(300_000);
  });
});

describe('feeRemaining', () => {
  it('trả về phần còn thiếu', () => {
    expect(feeRemaining(4_000_000, 1_500_000)).toBe(2_500_000);
  });

  it('không âm khi đóng dư', () => {
    expect(feeRemaining(1_000_000, 1_200_000)).toBe(0);
  });
});

describe('resolveFeeStatus', () => {
  const today = new Date('2026-07-10T00:00:00Z');

  it('paid khi đóng đủ, kể cả quá hạn', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 100, dueDate: '2026-01-01', today })
    ).toBe('paid');
  });

  it('overdue khi quá hạn và chưa đủ', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 50, dueDate: '2026-07-09', today })
    ).toBe('overdue');
  });

  it('chưa quá hạn: partial nếu đóng một phần', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 50, dueDate: '2026-07-15', today })
    ).toBe('partial');
  });

  it('chưa quá hạn: pending nếu chưa đóng đồng nào', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 0, dueDate: '2026-07-15', today })
    ).toBe('pending');
  });

  it('đúng ngày hạn thì chưa tính quá hạn (giống trigger DB: due_date < CURRENT_DATE)', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 0, dueDate: '2026-07-10', today })
    ).toBe('pending');
  });

  it('không có hạn: không bao giờ overdue', () => {
    expect(
      resolveFeeStatus({ totalAmount: 100, paidAmount: 10, dueDate: null, today })
    ).toBe('partial');
  });
});

describe('getVietnameseSortKeys', () => {
  it('tách tên và họ đệm', () => {
    expect(getVietnameseSortKeys('Nguyễn Văn An')).toEqual({
      firstName: 'An',
      middleAndLastName: 'Nguyễn Văn',
    });
  });

  it('bỏ chú thích trong ngoặc cuối tên', () => {
    expect(getVietnameseSortKeys('Nguyễn Văn An (bé Bin)').firstName).toBe('An');
  });

  it('tên một từ', () => {
    expect(getVietnameseSortKeys('An')).toEqual({ firstName: 'An', middleAndLastName: '' });
  });

  it('chuỗi rỗng/khoảng trắng', () => {
    expect(getVietnameseSortKeys('  ')).toEqual({ firstName: '', middleAndLastName: '' });
  });
});
