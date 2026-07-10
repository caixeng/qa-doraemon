/**
 * Tách tên tiếng Việt thành khóa sắp xếp: tên (từ cuối) và họ+đệm.
 * Bỏ phần chú thích trong ngoặc ở cuối tên, vd "Nguyễn Văn A (bé Bin)".
 * Trước đây hàm này bị lặp ở useStudents.ts và Students.tsx.
 */
export function getVietnameseSortKeys(fullName: string): {
  firstName: string;
  middleAndLastName: string;
} {
  let cleanName = (fullName || '').trim();
  cleanName = cleanName.replace(/\s*[\(\[].*?[\)\]]\s*$/g, '').trim();

  if (!cleanName) return { firstName: '', middleAndLastName: '' };

  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleAndLastName: '' };
  }
  const firstName = parts[parts.length - 1];
  const middleAndLastName = parts.slice(0, parts.length - 1).join(' ');

  return { firstName, middleAndLastName };
}
