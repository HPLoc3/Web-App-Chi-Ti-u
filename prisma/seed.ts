import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  console.log('🚀 [SEED] Bắt đầu khởi tạo dữ liệu Development Database...');

  // 1. Seed System Categories
  console.log('📦 [1/6] Seeding System Categories...');
  const categoryMap = new Map<string, string>();

  for (const cat of defaultSystemCategories) {
    let existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        type: cat.type,
        userId: null,
      },
    });

    if (!existing) {
      existing = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
          userId: null,
        },
      });
      console.log(`  ✅ Tạo mới danh mục: ${cat.name} (${cat.type})`);
    } else {
      console.log(`  ℹ️ Danh mục đã tồn tại: ${cat.name} (${cat.type})`);
    }

    categoryMap.set(`${cat.name}_${cat.type}`, existing.id);
  }

  // 2. Seed Test User (test@example.com / Test@123456)
  console.log('👤 [2/6] Seeding Test User (test@example.com)...');
  const testEmail = 'test@example.com';
  const hashedPassword = await bcrypt.hash('Test@123456', 10);

  let testUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Nguyễn Văn Test (Dev)',
        password: hashedPassword,
        provider: 'local',
      },
    });
    console.log(`  ✅ Đã tạo tài khoản test: ${testEmail}`);
  } else {
    // Update password to ensure it matches Test@123456
    testUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        password: hashedPassword,
        name: 'Nguyễn Văn Test (Dev)',
      },
    });
    console.log(`  ℹ️ Cập nhật tài khoản test: ${testEmail}`);
  }

  // 3. Seed Wallets for Test User
  console.log('💳 [3/6] Seeding Wallets...');
  let cashWallet = await prisma.wallet.findFirst({
    where: { userId: testUser.id, name: 'Ví Tiền Mặt' },
  });

  if (!cashWallet) {
    cashWallet = await prisma.wallet.create({
      data: {
        name: 'Ví Tiền Mặt',
        balance: 5000000,
        currency: 'VND',
        isDefault: true,
        userId: testUser.id,
      },
    });
    console.log('  ✅ Đã tạo Ví Tiền Mặt (5,000,000 đ)');
  }

  let bankWallet = await prisma.wallet.findFirst({
    where: { userId: testUser.id, name: 'Tài Khoản Ngân Hàng' },
  });

  if (!bankWallet) {
    bankWallet = await prisma.wallet.create({
      data: {
        name: 'Tài Khoản Ngân Hàng',
        balance: 25000000,
        currency: 'VND',
        isDefault: false,
        userId: testUser.id,
      },
    });
    console.log('  ✅ Đã tạo Tài Khoản Ngân Hàng (25,000,000 đ)');
  }

  // 4. Seed Sample Transactions
  console.log('💸 [4/6] Seeding Sample Transactions...');
  const txCount = await prisma.transaction.count({
    where: { userId: testUser.id },
  });

  if (txCount === 0) {
    const salaryCatId = categoryMap.get('Lương_INCOME');
    const foodCatId = categoryMap.get('Ăn uống_EXPENSE');
    const shoppingCatId = categoryMap.get('Mua sắm_EXPENSE');
    const billCatId = categoryMap.get('Hóa đơn & Dịch vụ_EXPENSE');
    const transportCatId = categoryMap.get('Di chuyển_EXPENSE');

    const sampleTransactions = [
      {
        amount: 25000000,
        type: 'INCOME',
        note: 'Nhận lương tháng này',
        walletId: bankWallet.id,
        categoryId: salaryCatId!,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 350000,
        type: 'EXPENSE',
        note: 'Ăn tối cùng bạn bè',
        walletId: cashWallet.id,
        categoryId: foodCatId!,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 1200000,
        type: 'EXPENSE',
        note: 'Mua sắm siêu thị cuối tuần',
        walletId: bankWallet.id,
        categoryId: shoppingCatId!,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 750000,
        type: 'EXPENSE',
        note: 'Thanh toán tiền điện & internet',
        walletId: bankWallet.id,
        categoryId: billCatId!,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        amount: 120000,
        type: 'EXPENSE',
        note: 'Đổ xăng xe máy',
        walletId: cashWallet.id,
        categoryId: transportCatId!,
        date: new Date(),
      },
    ];

    for (const txData of sampleTransactions) {
      if (txData.categoryId) {
        await prisma.transaction.create({
          data: {
            ...txData,
            userId: testUser.id,
          },
        });
      }
    }
    console.log(`  ✅ Đã tạo ${sampleTransactions.length} giao dịch mẫu.`);
  } else {
    console.log(`  ℹ️ Đã có ${txCount} giao dịch mẫu.`);
  }

  // 5. Seed Budget (50/30/20 Template)
  console.log('📊 [5/6] Seeding Budget...');
  let budget = await prisma.budget.findUnique({
    where: { userId: testUser.id },
  });

  if (!budget) {
    budget = await prisma.budget.create({
      data: {
        userId: testUser.id,
        income: 25000000,
        budgetTemplate: '50_30_20',
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
    });

    const foodCatId = categoryMap.get('Ăn uống_EXPENSE');
    const billCatId = categoryMap.get('Hóa đơn & Dịch vụ_EXPENSE');

    if (foodCatId) {
      await prisma.budgetLimit.create({
        data: {
          budgetId: budget.id,
          categoryId: foodCatId,
          amount: 5000000,
        },
      });
    }
    if (billCatId) {
      await prisma.budgetLimit.create({
        data: {
          budgetId: budget.id,
          categoryId: billCatId,
          amount: 3000000,
        },
      });
    }
    console.log('  ✅ Đã tạo cấu hình Ngân sách 50/30/20.');
  } else {
    console.log('  ℹ️ Cấu hình ngân sách đã tồn tại.');
  }

  // 6. Seed Goals & Recurring Transactions
  console.log('🎯 [6/6] Seeding Goals & Recurring Transactions...');
  const goalCount = await prisma.goal.count({
    where: { userId: testUser.id },
  });

  if (goalCount === 0) {
    await prisma.goal.createMany({
      data: [
        {
          name: 'Quỹ khẩn cấp 6 tháng',
          targetAmount: 60000000,
          currentAmount: 35000000,
          deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          color: '#10B981',
          icon: 'ShieldCheck',
          userId: testUser.id,
        },
        {
          name: 'Mua Laptop Mới',
          targetAmount: 35000000,
          currentAmount: 15000000,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          color: '#3B82F6',
          icon: 'Laptop',
          userId: testUser.id,
        },
      ],
    });
    console.log('  ✅ Đã tạo các mục tiêu tiết kiệm mẫu.');
  }

  const recurringCount = await prisma.recurringTransaction.count({
    where: { userId: testUser.id },
  });

  if (recurringCount === 0) {
    const billCatId = categoryMap.get('Hóa đơn & Dịch vụ_EXPENSE');
    if (billCatId) {
      await prisma.recurringTransaction.create({
        data: {
          amount: 3500000,
          type: 'EXPENSE',
          note: 'Tiền thuê phòng trọ cố định hàng tháng',
          dayOfMonth: 5,
          isActive: true,
          categoryId: billCatId,
          userId: testUser.id,
        },
      });
      console.log('  ✅ Đã tạo giao dịch định kỳ mẫu (Tiền thuê nhà ngày 5 hàng tháng).');
    }
  }

  console.log('\n=============================================================');
  console.log('🎉 SEED DEVELOPMENT DATABASE HOÀN TẤT THÀNH CÔNG!');
  console.log('👉 Tài khoản test: test@example.com');
  console.log('👉 Mật khẩu:       Test@123456');
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
