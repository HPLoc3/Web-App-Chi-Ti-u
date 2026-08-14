import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultSystemCategories = [
  // Chi tiêu (EXPENSE)
  { name: 'Ăn uống', type: 'EXPENSE', icon: 'Utensils', color: '#EF4444', isSystem: true },
  { name: 'Di chuyển', type: 'EXPENSE', icon: 'Car', color: '#F59E0B', isSystem: true },
  { name: 'Mua sắm', type: 'EXPENSE', icon: 'ShoppingBag', color: '#8B5CF6', isSystem: true },
  { name: 'Hóa đơn & Dịch vụ', type: 'EXPENSE', icon: 'Receipt', color: '#06B6D4', isSystem: true },
  { name: 'Giải trí', type: 'EXPENSE', icon: 'Gamepad2', color: '#EC4899', isSystem: true },
  { name: 'Sức khỏe', type: 'EXPENSE', icon: 'HeartPulse', color: '#10B981', isSystem: true },
  { name: 'Giáo dục', type: 'EXPENSE', icon: 'GraduationCap', color: '#3B82F6', isSystem: true },
  { name: 'Khác', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#64748B', isSystem: true },

  // Thu nhập (INCOME)
  { name: 'Lương', type: 'INCOME', icon: 'Wallet', color: '#10B981', isSystem: true },
  { name: 'Thưởng', type: 'INCOME', icon: 'Gift', color: '#3B82F6', isSystem: true },
  { name: 'Đầu tư', type: 'INCOME', icon: 'TrendingUp', color: '#8B5CF6', isSystem: true },
  { name: 'Thu nhập phụ', type: 'INCOME', icon: 'Coins', color: '#F59E0B', isSystem: true },
];

async function main() {
  console.log('🚀 Bắt đầu seed danh mục hệ thống mặc định (System Categories)...');

  for (const cat of defaultSystemCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        type: cat.type,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
          userId: null, // System category
        },
      });
      console.log(`✅ Đã tạo danh mục hệ thống: ${cat.name} (${cat.type})`);
    } else {
      console.log(`ℹ️ Danh mục hệ thống đã tồn tại: ${cat.name} (${cat.type})`);
    }
  }

  console.log('🎉 Khởi tạo dữ liệu seed thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
