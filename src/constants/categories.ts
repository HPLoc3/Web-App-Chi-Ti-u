import { Category } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'an_uong',
    name: 'Ăn uống',
    iconName: 'Utensils',
    color: '#B45309', // amber-700
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    keywords: [
      'ăn', 'uống', 'cafe', 'cà phê', 'phở', 'cơm', 'bún', 'bánh', 'mì', 'sáng', 
      'trưa', 'tối', 'nhậu', 'lẩu', 'trà sữa', 'snack', 'kem', 'nước', 'tiệc', 
      'buffet', 'chợ', 'siêu thị', 'thịt', 'rau', 'bán lẻ', 'nhà hàng', 'ăn vặt',
      'khoai', 'trà', 'sữa', 'bò', 'gà', 'heo', 'cá'
    ]
  },
  {
    id: 'di_chuyen',
    name: 'Di chuyển',
    iconName: 'Car',
    color: '#0369A1', // sky-700
    textColor: 'text-sky-700',
    bgColor: 'bg-sky-50',
    keywords: [
      'xăng', 'xe', 'bus', 'buýt', 'taxi', 'grab', 'gojek', 'be', 'máy bay', 
      'tàu', 'vé', 'sửa xe', 'bảo hiểm xe', 'gửi xe', 'nhớt', 'vận chuyển', 'di chuyển',
      'đổ xăng', 'rửa xe', 'lốp', 'phí cầu đường', 'phí đỗ xe'
    ]
  },
  {
    id: 'mua_sam',
    name: 'Mua sắm',
    iconName: 'ShoppingBag',
    color: '#BE185D', // pink-700
    textColor: 'text-pink-700',
    bgColor: 'bg-pink-50',
    keywords: [
      'áo', 'quần', 'giày', 'dép', 'mũ', 'nón', 'kính', 'son', 'phấn', 'mỹ phẩm', 
      'đồ dùng', 'nội thất', 'máy tính', 'điện thoại', 'ipad', 'tai nghe', 'đồng hồ', 
      'túi xách', 'mua', 'sắm', 'shopee', 'lazada', 'tiki', 'quà', 'tặng', 'đồ chơi',
      'máy ảnh', 'sách', 'vải', 'trang sức', 'ví'
    ]
  },
  {
    id: 'giai_tri',
    name: 'Giải trí',
    iconName: 'Gamepad2',
    color: '#6D28D9', // violet-700
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-50',
    keywords: [
      'phim', 'rạp', 'game', 'net', 'ps5', 'du lịch', 'hát', 'karaoke', 'bar', 
      'pub', 'nhạc', 'concert', 'chơi', 'dã ngoại', 'camping', 'triển lãm', 'sự kiện',
      'vé xem phim', 'nạp game', 'billiards', 'bi-a', 'bóng đá'
    ]
  },
  {
    id: 'hoa_don',
    name: 'Hóa đơn',
    iconName: 'Receipt',
    color: '#C2410C', // orange-700
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    keywords: [
      'điện', 'nước', 'internet', 'wifi', 'cáp', 'điện thoại', 'cước', 'phí', 
      'chung cư', 'rác', 'netflix', 'spotify', 'youtube', 'icloud', 'thuê nhà', 
      'trả góp', 'mạng', '4g', 'thuê', 'bảo hiểm', 'ngân hàng', 'lãi', 'học phí'
    ]
  },
  {
    id: 'suc_khoe',
    name: 'Sức khỏe',
    iconName: 'HeartPulse',
    color: '#B91C1C', // red-700
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    keywords: [
      'thuốc', 'bệnh', 'khám', 'nha khoa', 'răng', 'bác sĩ', 'bệnh viện', 'gym', 
      'yoga', 'thể thao', 'vitamin', 'thực phẩm chức năng', 'thuốc tây', 'nhỏ mắt',
      'khẩu trang', 'chữa bệnh', 'bảo hiểm y tế'
    ]
  },
  {
    id: 'giao_duc',
    name: 'Giáo dục',
    iconName: 'GraduationCap',
    color: '#0F766E', // teal-700
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-50',
    keywords: [
      'học', 'sách', 'vở', 'bút', 'khóa học', 'học phí', 'thi', 'chứng chỉ', 
      'tài liệu', 'giáo trình', 'học thêm', 'tiếng anh', 'toeic', 'ielts', 'văn phòng phẩm'
    ]
  },
  {
    id: 'khac',
    name: 'Khác',
    iconName: 'HelpCircle',
    color: '#4B5563', // gray-700
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    keywords: []
  }
];
