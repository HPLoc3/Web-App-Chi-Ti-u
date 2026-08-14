import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const getDatabaseUrl = (): string => {
  let envUrl = process.env.DATABASE_URL;
  if (!envUrl) {
    return 'postgresql://hophuloc_admin:SecurePass_157_66_101_43@157.66.101.43:5432/hophuloc_expense_db?schema=public';
  }

  // Nếu DATABASE_URL trỏ về localhost:5432 nhưng container không chạy local PostgreSQL daemon,
  // tự động fallback về remote PostgreSQL host 157.66.101.43
  if (envUrl.includes('localhost:5432') && envUrl.includes('157_66_101_43')) {
    envUrl = envUrl.replace('localhost:5432', '157.66.101.43:5432');
  }

  return envUrl;
};

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
