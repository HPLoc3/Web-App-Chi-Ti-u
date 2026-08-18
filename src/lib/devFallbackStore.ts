import { User, Wallet, Category, Transaction, Budget, Goal, RecurringTransaction, RefreshToken, Session, PasswordResetToken, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Pre-populated default system categories for fallback mode
export const DEFAULT_SYSTEM_CATEGORIES: Category[] = [
  { id: 'an_uong', name: 'Ăn uống', type: 'EXPENSE', icon: 'Utensils', color: '#10B981', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'di_chuyen', name: 'Di chuyển', type: 'EXPENSE', icon: 'Car', color: '#3B82F6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mua_sam', name: 'Mua sắm', type: 'EXPENSE', icon: 'ShoppingBag', color: '#EC4899', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'giai_tri', name: 'Giải trí', type: 'EXPENSE', icon: 'Gamepad2', color: '#8B5CF6', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'hoa_don', name: 'Hóa đơn & Tiện ích', type: 'EXPENSE', icon: 'Receipt', color: '#F97316', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'suc_khoe', name: 'Sức khỏe', type: 'EXPENSE', icon: 'HeartPulse', color: '#EF4444', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'giao_duc', name: 'Giáo dục', type: 'EXPENSE', icon: 'GraduationCap', color: '#6366F1', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'luong', name: 'Lương & Thu nhập', type: 'INCOME', icon: 'Wallet', color: '#10B981', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'khac', name: 'Khác', type: 'EXPENSE', icon: 'Sparkles', color: '#6B7280', isSystem: true, userId: null, createdAt: new Date(), updatedAt: new Date() },
];

export class DevFallbackStore {
  public users: Map<string, User> = new Map();
  public wallets: Map<string, Wallet> = new Map();
  public categories: Map<string, Category> = new Map();
  public transactions: Map<string, Transaction> = new Map();
  public budgets: Map<string, Budget> = new Map();
  public goals: Map<string, Goal> = new Map();
  public recurring: Map<string, RecurringTransaction> = new Map();
  public refreshTokens: Map<string, RefreshToken> = new Map();
  public sessions: Map<string, Session> = new Map();
  public resetTokens: Map<string, PasswordResetToken> = new Map();

  constructor() {
    // Populate default system categories
    DEFAULT_SYSTEM_CATEGORIES.forEach((cat) => this.categories.set(cat.id, cat));
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
      errMsg.includes('Connection terminated')
    );
  }

  // User methods
  public findUserByEmail(email: string): User | null {
    const lower = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) return u;
    }
    return null;
  }

  public findUserById(id: string): User | null {
    return this.users.get(id) || null;
  }

  public createUser(data: Prisma.UserCreateInput): User {
    const id = `dev-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const user: User = {
      id,
      email: data.email,
      name: data.name || null,
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
      name: 'Ví Chính',
      balance: new Prisma.Decimal(5000000),
      currency: 'VND',
      isDefault: true,
      userId: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wallets.set(walletId, wallet);

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
      // Create a default wallet if none exists
      const defaultW: Wallet = {
        id: `dev-wallet-${userId}`,
        name: 'Ví Chính',
        balance: new Prisma.Decimal(5000000),
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

    // Update wallet balance
    const wallet = this.wallets.get(tx.walletId);
    if (wallet) {
      const change = tx.type === 'INCOME' ? tx.amount : tx.amount.negated();
      wallet.balance = wallet.balance.add(change);
      this.wallets.set(wallet.id, wallet);
    }

    const cat = this.categories.get(tx.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
    return { ...tx, category: cat, wallet };
  }
}

export const devFallbackStore = new DevFallbackStore();
