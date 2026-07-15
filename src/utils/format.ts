export function formatCurrency(amount: number): string {
  // E.g. 30000 -> 30.000₫
  return `${amount.toLocaleString('vi-VN')}₫`;
}

export function formatDateVietnamese(dateStr: string): string {
  // Input: YYYY-MM-DD
  // Output: "Thứ hai, 15/07" or similar, or just "15/07/2026"
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  // Get day of week
  const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayOfWeek = daysOfWeek[date.getDay()];
  
  return `${dayOfWeek}, ${day}/${month}/${year}`;
}
