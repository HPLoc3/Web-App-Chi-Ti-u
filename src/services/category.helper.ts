import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const SYSTEM_CATEGORIES = [
  { id: 'an_uong', name: 'Ăn uống', type: 'EXPENSE', icon: 'Utensils', color: '#B45309' },
  { id: 'di_chuyen', name: 'Di chuyển', type: 'EXPENSE', icon: 'Car', color: '#0369A1' },
  { id: 'mua_sam', name: 'Mua sắm', type: 'EXPENSE', icon: 'ShoppingBag', color: '#BE185D' },
  { id: 'giai_tri', name: 'Giải trí', type: 'EXPENSE', icon: 'Gamepad2', color: '#6D28D9' },
  { id: 'hoa_don', name: 'Hóa đơn', type: 'EXPENSE', icon: 'Receipt', color: '#C2410C' },
  { id: 'suc_khoe', name: 'Sức khỏe', type: 'EXPENSE', icon: 'HeartPulse', color: '#B91C1C' },
  { id: 'giao_duc', name: 'Giáo dục', type: 'EXPENSE', icon: 'GraduationCap', color: '#0F766E' },
  { id: 'khac', name: 'Khác', type: 'EXPENSE', icon: 'HelpCircle', color: '#4B5563' },
  { id: 'luong', name: 'Lương & Thưởng', type: 'INCOME', icon: 'Wallet', color: '#16A34A' },
  { id: 'dau_tu', name: 'Đầu tư & Lãi', type: 'INCOME', icon: 'TrendingUp', color: '#2563EB' },
  { id: 'thu_nhap_khac', name: 'Thu nhập khác', type: 'INCOME', icon: 'PlusCircle', color: '#059669' },
];

/**
 * Đảm bảo các System Categories luôn tồn tại trong PostgreSQL
 */
export async function ensureSystemCategoriesExist() {
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
      },
      create: {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
        userId: null,
      },
    });
  }
}

/**
 * Tìm hoặc lấy category ID hợp lệ cho người dùng
 */
export async function resolveCategoryId(categoryIdOrName: string | undefined, userId: string, type: 'EXPENSE' | 'INCOME' = 'EXPENSE'): Promise<string> {
  if (!categoryIdOrName) {
    return 'khac';
  }

  // 1. Kiểm tra theo ID chính xác (System Category ID hoặc UUID)
  const byId = await prisma.category.findFirst({
    where: {
      id: categoryIdOrName,
      OR: [{ userId: null }, { userId }],
    },
  });
  if (byId) return byId.id;

  // 2. Tìm theo tên
  const byName = await prisma.category.findFirst({
    where: {
      name: { equals: categoryIdOrName, mode: 'insensitive' },
      OR: [{ userId: null }, { userId }],
    },
  });
  if (byName) return byName.id;

  // 3. Fallback: Nếu không tìm thấy, trả về category 'khac'
  const fallback = await prisma.category.findFirst({
    where: {
      OR: [{ id: 'khac' }, { name: 'Khác' }],
    },
  });

  if (fallback) return fallback.id;

  // 4. Khởi tạo category nếu CSDL trống
  await ensureSystemCategoriesExist();
  return 'khac';
}
