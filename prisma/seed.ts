import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// Danh mục thu/chi mặc định hệ thống
const defaultCategories = [
  { name: 'Ăn uống', type: TransactionType.EXPENSE, icon: 'Utensils', color: '#EF4444' },
  { name: 'Di chuyển', type: TransactionType.EXPENSE, icon: 'Car', color: '#F59E0B' },
  { name: 'Mua sắm', type: TransactionType.EXPENSE, icon: 'ShoppingBag', color: '#8B5CF6' },
  { name: 'Lương', type: TransactionType.INCOME, icon: 'Wallet', color: '#10B981' },
  { name: 'Thưởng', type: TransactionType.INCOME, icon: 'Gift', color: '#3B82F6' },
];

async function main() {
  console.log('🚀 Bắt đầu seed danh mục thu/chi mặc định...');

  for (const cat of defaultCategories) {
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
          userId: null, // Danh mục mặc định hệ thống
        },
      });
      console.log(`✅ Đã tạo danh mục mặc định: ${cat.name} (${cat.type})`);
    } else {
      console.log(`ℹ️ Danh mục đã tồn tại: ${cat.name}`);
    }
  }

  console.log('🎉 Khởi tạo dữ liệu mẫu thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi thực thi seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
