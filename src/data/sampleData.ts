import { AppState, Expense, Goal } from '../types';

function getDateAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function generateSampleState(): AppState {
  const todayStr = getDateAgo(0);
  const monthStr = todayStr.slice(0, 7);

  const expenses: Expense[] = [
    { id: 'sample-1', amount: 45000, categoryId: 'an_uong', note: 'Phở bò ăn sáng', date: getDateAgo(0) },
    { id: 'sample-2', amount: 35000, categoryId: 'an_uong', note: 'Cà phê sữa đá làm việc', date: getDateAgo(0) },
    { id: 'sample-3', amount: 60000, categoryId: 'di_chuyen', note: 'Đổ xăng xe máy', date: getDateAgo(0) },
    
    { id: 'sample-4', amount: 185000, categoryId: 'an_uong', note: 'Đi chợ mua thực phẩm tươi', date: getDateAgo(1) },
    { id: 'sample-5', amount: 150000, categoryId: 'giao_duc', note: 'Mua sách kỹ năng phát triển bản thân', date: getDateAgo(1) },
    
    { id: 'sample-6', amount: 55000, categoryId: 'an_uong', note: 'Ăn trưa cơm văn phòng', date: getDateAgo(2) },
    { id: 'sample-7', amount: 100000, categoryId: 'hoa_don', note: 'Nạp cước di động Viettel', date: getDateAgo(2) },
    
    { id: 'sample-8', amount: 340000, categoryId: 'mua_sam', note: 'Đi siêu thị WinMart đồ dùng', date: getDateAgo(3) },
    { id: 'sample-9', amount: 45000, categoryId: 'giai_tri', note: 'Trà sữa cùng đồng nghiệp', date: getDateAgo(3) },
    
    { id: 'sample-10', amount: 620000, categoryId: 'hoa_don', note: 'Tiền điện sinh hoạt tháng này', date: getDateAgo(5) },
    { id: 'sample-11', amount: 280000, categoryId: 'an_uong', note: 'Ăn tối lẩu cùng bạn bè', date: getDateAgo(5) },
    
    { id: 'sample-12', amount: 350000, categoryId: 'suc_khoe', note: 'Khám răng định kỳ & mua thuốc', date: getDateAgo(7) },
    { id: 'sample-13', amount: 85000, categoryId: 'di_chuyen', note: 'Taxi Grab đi họp khách hàng', date: getDateAgo(7) },
    
    { id: 'sample-14', amount: 140000, categoryId: 'hoa_don', note: 'Tiền nước sinh hoạt', date: getDateAgo(9) },
    { id: 'sample-15', amount: 290000, categoryId: 'mua_sam', note: 'Mua áo thun mới', date: getDateAgo(9) },
    
    { id: 'sample-16', amount: 500000, categoryId: 'giao_duc', note: 'Đăng ký khóa học online', date: getDateAgo(12) },
    { id: 'sample-17', amount: 130000, categoryId: 'giai_tri', note: 'Xem phim rạp CGV', date: getDateAgo(12) },
    
    { id: 'sample-18', amount: 220000, categoryId: 'an_uong', note: 'Đi chợ mua đồ ăn tuần mới', date: getDateAgo(15) },
    { id: 'sample-19', amount: 180000, categoryId: 'di_chuyen', note: 'Bảo dưỡng thay dầu xe máy', date: getDateAgo(15) },
    
    { id: 'sample-20', amount: 175000, categoryId: 'mua_sam', note: 'Mua vật dụng gia đình', date: getDateAgo(18) },
    { id: 'sample-21', amount: 40000, categoryId: 'an_uong', note: 'Ăn sáng hủ tiếu Nam Vang', date: getDateAgo(18) },
    
    { id: 'sample-22', amount: 250000, categoryId: 'hoa_don', note: 'Tiền cước mạng Internet', date: getDateAgo(20) },
  ];

  const goals: Goal[] = [
    { id: 'goal-1', name: 'Quỹ dự phòng khẩn cấp', target: 15000000, current: 5500000, createdAt: getDateAgo(30) },
    { id: 'goal-2', name: 'Mua máy tính làm việc mới', target: 22000000, current: 9000000, createdAt: getDateAgo(20) },
    { id: 'goal-3', name: 'Du lịch gia đình cuối năm', target: 10000000, current: 3000000, createdAt: getDateAgo(10) }
  ];

  return {
    expenses,
    goals,
    income: 18000000,
    budgetTemplate: '50_30_20',
    categoryLimits: {
      'an_uong': 4500000,
      'di_chuyen': 1200000,
      'mua_sam': 2500000,
      'giai_tri': 1500000,
      'hoa_don': 4000000,
      'suc_khoe': 1000000
    },
    recurringExpenses: [
      { id: 'rec-1', amount: 3500000, categoryId: 'hoa_don', dayOfMonth: 5, note: 'Tiền phòng trọ cố định' },
      { id: 'rec-2', amount: 250000, categoryId: 'hoa_don', dayOfMonth: 10, note: 'Tiền mạng Internet hằng tháng' }
    ],
    generatedRecurringMonths: [monthStr],
    isSampleData: true
  };
}

export const EMPTY_STATE: AppState = {
  expenses: [],
  goals: [],
  income: 0,
  budgetTemplate: 'none',
  categoryLimits: {},
  recurringExpenses: [],
  generatedRecurringMonths: [],
  isSampleData: false
};
