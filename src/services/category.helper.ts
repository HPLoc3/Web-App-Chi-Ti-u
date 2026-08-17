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

// In-memory set of known System Category IDs for O(1) instantaneous lookup
const SYSTEM_CATEGORY_ID_SET = new Set(SYSTEM_CATEGORIES.map((c) => c.id));
const SYSTEM_CATEGORY_NAME_MAP = new Map(SYSTEM_CATEGORIES.map((c) => [c.name.toLowerCase(), c.id]));

// Fast LRU/Map cache for resolved categories to prevent database queries in high-throughput endpoints
const categoryResolutionCache = new Map<string, { id: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
 * Tìm hoặc lấy category ID hợp lệ cho người dùng với cơ chế caching O(1)
 */
export async function resolveCategoryId(
  categoryIdOrName: string | undefined,
  userId: string,
  type: 'EXPENSE' | 'INCOME' = 'EXPENSE'
): Promise<string> {
  if (!categoryIdOrName) {
    return 'khac';
  }

  const trimmed = categoryIdOrName.trim();

  // 1. Fast path: System ID match O(1)
  if (SYSTEM_CATEGORY_ID_SET.has(trimmed)) {
    return trimmed;
  }

  // 2. Fast path: System Name match O(1)
  const systemIdFromName = SYSTEM_CATEGORY_NAME_MAP.get(trimmed.toLowerCase());
  if (systemIdFromName) {
    return systemIdFromName;
  }

  // 3. Cache check
  const cacheKey = `${userId}:${trimmed.toLowerCase()}:${type}`;
  const cached = categoryResolutionCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.id;
  }

  // 4. Kiểm tra theo ID chính xác (System Category ID hoặc UUID)
  const byId = await prisma.category.findFirst({
    where: {
      id: trimmed,
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true },
  });
  if (byId) {
    categoryResolutionCache.set(cacheKey, { id: byId.id, cachedAt: Date.now() });
    return byId.id;
  }

  // 5. Tìm theo tên
  const byName = await prisma.category.findFirst({
    where: {
      name: { equals: trimmed, mode: 'insensitive' },
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true },
  });
  if (byName) {
    categoryResolutionCache.set(cacheKey, { id: byName.id, cachedAt: Date.now() });
    return byName.id;
  }

  // 6. Fallback: Nếu không tìm thấy, trả về category 'khac'
  categoryResolutionCache.set(cacheKey, { id: 'khac', cachedAt: Date.now() });
  return 'khac';
}

