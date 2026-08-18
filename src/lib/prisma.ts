import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const getDatabaseUrl = (): string => {
  let envUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();

  if (!envUrl) {
    const user = process.env.POSTGRES_USER || 'postgres';
    const pass = process.env.POSTGRES_PASSWORD || 'staychitiu_postgres_pass_2026';
    const db = process.env.POSTGRES_DB || 'hophuloc_expense_db';
    const host = process.env.NODE_ENV === 'production' ? 'postgres' : 'localhost';
    envUrl = `postgresql://${user}:${pass}@${host}:5432/${db}?schema=public`;
  }

  // Đảm bảo có connection timeout để tránh treo tiến trình
  if (!envUrl.includes('connect_timeout')) {
    const separator = envUrl.includes('?') ? '&' : '?';
    envUrl = `${envUrl}${separator}connect_timeout=10`;
  }

  return envUrl;
};

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  // Ghi nhận sự kiện Prisma qua Logger ở cấp độ debug để giữ console luôn sạch sẽ
  client.$on('error' as never, (e: any) => {
    const errorMsg = e?.message || String(e);
    Logger.debug(`[Prisma Internal Event] ${errorMsg.split('\n')[0]}`);
  });

  client.$on('warn' as never, (e: any) => {
    Logger.debug(`[Prisma Internal Warn] ${e?.message || e}`);
  });

  return client;
};

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;

