import { User, Wallet, Category, Transaction, Budget, BudgetLimit, Goal, RecurringTransaction, RefreshToken, Session, PasswordResetToken, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Pre-populated default system categories for fallback mode
export const DEFAULT_SYSTEM_CATEGORIES: Category[] = [
  { id: 'an_uong', name: 'Ăn uống', type: 'EXPENSE', icon: 'Utensils', color: '#EF4444', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'di_chuyen', name: 'Di chuyển', type: 'EXPENSE', icon: 'Car', color: '#F59E0B', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mua_sam', name: 'Mua sắm', type: 'EXPENSE', icon: 'ShoppingBag', color: '#8B5CF6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'hoa_don', name: 'Hóa đơn & Dịch vụ', type: 'EXPENSE', icon: 'Receipt', color: '#06B6D4', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'giai_tri', name: 'Giải trí', type: 'EXPENSE', icon: 'Gamepad2', color: '#EC4899', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'suc_khoe', name: 'Sức khỏe', type: 'EXPENSE', icon: 'HeartPulse', color: '#10B981', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'giao_duc', name: 'Giáo dục', type: 'EXPENSE', icon: 'GraduationCap', color: '#3B82F6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'khac', name: 'Khác', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#64748B', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'luong', name: 'Lương', type: 'INCOME', icon: 'Wallet', color: '#10B981', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'thuong', name: 'Thưởng', type: 'INCOME', icon: 'Gift', color: '#3B82F6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'dau_tu', name: 'Đầu tư', type: 'INCOME', icon: 'TrendingUp', color: '#8B5CF6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'phu', name: 'Thu nhập phụ', type: 'INCOME', icon: 'Coins', color: '#F59E0B', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
];

export class DevFallbackStore {
  public users: Map<string, User> = new Map();
  public wallets: Map<string, Wallet> = new Map();
  public categories: Map<string, Category> = new Map();
  public transactions: Map<string, Transaction> = new Map();
  public budgets: Map<string, Budget> = new Map();
  public budgetLimits: Map<string, BudgetLimit> = new Map();
  public goals: Map<string, Goal> = new Map();
  public recurring: Map<string, RecurringTransaction> = new Map();
  public refreshTokens: Map<string, RefreshToken> = new Map();
  public sessions: Map<string, Session> = new Map();
  public resetTokens: Map<string, PasswordResetToken> = new Map();

  constructor() {
    // 1. Populate default system categories
    DEFAULT_SYSTEM_CATEGORIES.forEach((cat) => this.categories.set(cat.id, cat));

    // 2. Pre-seed default Test User (test@example.com / Test@123456)
    const testUserId = 'dev-test-user-001';
    const testUserHashedPassword = bcrypt.hashSync('Test@123456', 10);
    const testUser: User = {
      id: testUserId,
      email: 'test@example.com',
      name: 'Nguyễn Văn Test (Dev)',
      avatar: null,
      password: testUserHashedPassword,
      provider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(testUserId, testUser);

    // 3. Pre-seed Wallets for Test User
    const cashWalletId = `dev-wallet-cash-${testUserId}`;
    const bankWalletId = `dev-wallet-bank-${testUserId}`;
    const cashWallet: Wallet = {
      id: cashWalletId,
      name: 'Ví Tiền Mặt',
      balance: new Prisma.Decimal(5000000),
      currency: 'VND',
      isDefault: true,
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const bankWallet: Wallet = {
      id: bankWalletId,
      name: 'Tài Khoản Ngân Hàng',
      balance: new Prisma.Decimal(25000000),
      currency: 'VND',
      isDefault: false,
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wallets.set(cashWalletId, cashWallet);
    this.wallets.set(bankWalletId, bankWallet);

    // 4. Pre-seed Budget & Limits
    const budgetId = `dev-budget-${testUserId}`;
    const budget: Budget = {
      id: budgetId,
      income: new Prisma.Decimal(25000000),
      budgetTemplate: '50_30_20',
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
      categoryLimits: null,
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.budgets.set(budgetId, budget);

    const limit1: BudgetLimit = {
      id: `dev-bl-1-${budgetId}`,
      budgetId,
      categoryId: 'an_uong',
      amount: new Prisma.Decimal(5000000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const limit2: BudgetLimit = {
      id: `dev-bl-2-${budgetId}`,
      budgetId,
      categoryId: 'hoa_don',
      amount: new Prisma.Decimal(3000000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.budgetLimits.set(limit1.id, limit1);
    this.budgetLimits.set(limit2.id, limit2);

    // 5. Pre-seed Sample Transactions
    const sampleTxData = [
      {
        id: `dev-tx-1`,
        amount: new Prisma.Decimal(25000000),
        type: 'INCOME',
        note: 'Nhận lương tháng này',
        walletId: bankWalletId,
        categoryId: 'luong',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `dev-tx-2`,
        amount: new Prisma.Decimal(350000),
        type: 'EXPENSE',
        note: 'Ăn tối cùng bạn bè',
        walletId: cashWalletId,
        categoryId: 'an_uong',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `dev-tx-3`,
        amount: new Prisma.Decimal(1200000),
        type: 'EXPENSE',
        note: 'Mua sắm siêu thị cuối tuần',
        walletId: bankWalletId,
        categoryId: 'mua_sam',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `dev-tx-4`,
        amount: new Prisma.Decimal(750000),
        type: 'EXPENSE',
        note: 'Thanh toán tiền điện & internet',
        walletId: bankWalletId,
        categoryId: 'hoa_don',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `dev-tx-5`,
        amount: new Prisma.Decimal(120000),
        type: 'EXPENSE',
        note: 'Đổ xăng xe máy',
        walletId: cashWalletId,
        categoryId: 'di_chuyen',
        date: new Date(),
        userId: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    sampleTxData.forEach((tx) => this.transactions.set(tx.id, tx as any));

    // 6. Pre-seed Goals
    const goal1: Goal = {
      id: 'dev-goal-1',
      name: 'Quỹ khẩn cấp 6 tháng',
      targetAmount: new Prisma.Decimal(60000000),
      currentAmount: new Prisma.Decimal(35000000),
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      color: '#10B981',
      icon: 'ShieldCheck',
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const goal2: Goal = {
      id: 'dev-goal-2',
      name: 'Mua Laptop Mới',
      targetAmount: new Prisma.Decimal(35000000),
      currentAmount: new Prisma.Decimal(15000000),
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      color: '#3B82F6',
      icon: 'Laptop',
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.goals.set(goal1.id, goal1);
    this.goals.set(goal2.id, goal2);

    // 7. Pre-seed Recurring Transactions
    const recurring1: RecurringTransaction = {
      id: 'dev-rec-1',
      amount: new Prisma.Decimal(3500000),
      type: 'EXPENSE',
      note: 'Tiền thuê phòng trọ cố định hàng tháng',
      dayOfMonth: 5,
      isActive: true,
      lastRunAt: null,
      categoryId: 'hoa_don',
      userId: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.recurring.set(recurring1.id, recurring1);
  }

  // Helper to check if an error is a database connection error
  public static isConnectionError(error: any): boolean {
    if (!error) return false;
    const errCode = error.code || '';
    const errName = error.name || '';
    const errMsg = String(error.message || error);

    return (
      errName === 'PrismaClientInitializationError' ||
      ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(errCode) ||
      errMsg.includes("Can't reach database server") ||
      errMsg.includes('connect ECONNREFUSED') ||
      errMsg.includes('Connection terminated') ||
      errMsg.includes('database server is running at')
    );
  }

  // User methods
  public findUserByEmail(email: string): User | null {
    const lower = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) return u;
    }
    return null;
  }

  public findUserById(id: string): User | null {
    return this.users.get(id) || null;
  }

  public createUser(data: Prisma.UserCreateInput): User {
    const cleanEmail = data.email.trim().toLowerCase();
    const id = `dev-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id,
      email: cleanEmail,
      name: data.name || cleanEmail.split('@')[0],
      avatar: data.avatar || null,
      password: data.password || null,
      provider: data.provider || 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);

    // Auto-create default wallet for user
    const walletId = `dev-wallet-${id}`;
    const wallet: Wallet = {
      id: walletId,
      name: 'Ví Tiền Mặt',
      balance: new Prisma.Decimal(0),
      currency: 'VND',
      isDefault: true,
      userId: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wallets.set(walletId, wallet);

    return user;
  }

  public updateUser(id: string, data: Partial<User>): User {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found in fallback store');
    Object.assign(user, data, { updatedAt: new Date() });
    this.users.set(id, user);
    return user;
  }

  public updateUserPassword(userId: string, passwordHash: string): User {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found in fallback store');
    user.password = passwordHash;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  public deleteUser(id: string): void {
    this.users.delete(id);
  }

  // Token & Session methods
  public createTokensAndSession(userId: string, hashedToken: string, expiresAt: Date, userAgent?: string, ipAddress?: string): void {
    const rtId = `dev-rt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const rt: RefreshToken = {
      id: rtId,
      token: hashedToken,
      userId,
      expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.refreshTokens.set(hashedToken, rt);

    const sId = `dev-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const session: Session = {
      id: sId,
      sessionToken: hashedToken,
      userId,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(hashedToken, session);
  }

  public findRefreshToken(hashedToken: string): RefreshToken | null {
    const rt = this.refreshTokens.get(hashedToken);
    if (!rt) return null;
    if (rt.revokedAt) return null;
    return rt;
  }

  public revokeRefreshToken(id: string): void {
    for (const [key, rt] of this.refreshTokens.entries()) {
      if (rt.id === id) {
        rt.revokedAt = new Date();
        this.refreshTokens.set(key, rt);
      }
    }
  }

  public revokeAllUserTokensAndSessions(userId: string): void {
    for (const [key, rt] of this.refreshTokens.entries()) {
      if (rt.userId === userId) {
        rt.revokedAt = new Date();
        this.refreshTokens.set(key, rt);
      }
    }
    for (const [key, sess] of this.sessions.entries()) {
      if (sess.userId === userId) {
        this.sessions.delete(key);
      }
    }
  }

  // Wallet methods
  public getUserWallets(userId: string): Wallet[] {
    const result: Wallet[] = [];
    for (const w of this.wallets.values()) {
      if (w.userId === userId) result.push(w);
    }
    if (result.length === 0) {
      const defaultW: Wallet = {
        id: `dev-wallet-${userId}`,
        name: 'Ví Tiền Mặt',
        balance: new Prisma.Decimal(0),
        currency: 'VND',
        isDefault: true,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.wallets.set(defaultW.id, defaultW);
      return [defaultW];
    }
    return result;
  }

  public createWallet(data: Prisma.WalletCreateInput): Wallet {
    const id = `dev-wallet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const w: Wallet = {
      id,
      name: data.name,
      balance: data.balance ? new Prisma.Decimal(data.balance.toString()) : new Prisma.Decimal(0),
      currency: data.currency || 'VND',
      isDefault: data.isDefault || false,
      userId: (data.user as any)?.connect?.id || 'dev-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wallets.set(id, w);
    return w;
  }

  // Transaction methods
  public getUserTransactions(userId: string): any[] {
    const list: any[] = [];
    for (const t of this.transactions.values()) {
      if (t.userId === userId) {
        const cat = this.categories.get(t.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
        const wallet = this.wallets.get(t.walletId);
        list.push({ ...t, category: cat, wallet });
      }
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public createTransaction(data: any): any {
    const id = `dev-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tx: Transaction = {
      id,
      amount: new Prisma.Decimal(data.amount.toString()),
      type: data.type || 'EXPENSE',
      note: data.note || null,
      date: data.date ? new Date(data.date) : new Date(),
      walletId: data.walletId || data.wallet?.connect?.id || `dev-wallet-${data.userId}`,
      categoryId: data.categoryId || data.category?.connect?.id || 'an_uong',
      userId: data.userId || data.user?.connect?.id || 'dev-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.transactions.set(id, tx);

    const wallet = this.wallets.get(tx.walletId);
    if (wallet) {
      const change = tx.type === 'INCOME' ? tx.amount : tx.amount.negated();
      wallet.balance = wallet.balance.add(change);
      this.wallets.set(wallet.id, wallet);
    }

    const cat = this.categories.get(tx.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
    return { ...tx, category: cat, wallet };
  }

  // Budget methods
  public findBudgetByUserId(userId: string): any {
    for (const b of this.budgets.values()) {
      if (b.userId === userId) {
        const limits = Array.from(this.budgetLimits.values())
          .filter((l) => l.budgetId === b.id)
          .map((l) => ({
            ...l,
            category: this.categories.get(l.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0],
          }));
        return { ...b, budgetLimits: limits };
      }
    }
    return null;
  }

  // Goals methods
  public getUserGoals(userId: string): Goal[] {
    const list: Goal[] = [];
    for (const g of this.goals.values()) {
      if (g.userId === userId) list.push(g);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Recurring methods
  public getUserRecurring(userId: string): any[] {
    const list: any[] = [];
    for (const r of this.recurring.values()) {
      if (r.userId === userId) {
        const cat = this.categories.get(r.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
        list.push({ ...r, category: cat });
      }
    }
    return list.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }
}

export const devFallbackStore = new DevFallbackStore();
