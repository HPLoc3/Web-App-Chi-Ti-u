import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const getDatabaseUrl = (): string => {
  let envUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();

  if (!envUrl) {
    throw new Error('FATAL DATABASE CONFIG ERROR: Biến môi trường DATABASE_URL chưa được thiết lập.');
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

