import { PrismaClient } from '@prisma/client';
import '../config/loadEnv';
import { Logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prismaInstance: PrismaClient | undefined;
}

/**
 * Validates and retrieves the PostgreSQL DATABASE_URL.
 * Throws a fatal error if DATABASE_URL is missing or invalid.
 * Strictly forbids any localhost or placeholder fallbacks in production.
 * Keeps URL-encoded characters intact for native Prisma parsing.
 */
export const getDatabaseUrl = (): string => {
  let envUrl = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();

  if (!envUrl) {
    throw new Error(
      'FATAL DATABASE CONFIG ERROR: DATABASE_URL is not configured. Please set DATABASE_URL in your .env file or environment variables.'
    );
  }

  if (!envUrl.startsWith('postgresql://') && !envUrl.startsWith('postgres://')) {
    throw new Error(
      'FATAL DATABASE CONFIG ERROR: DATABASE_URL must be a valid PostgreSQL connection string (starting with postgresql:// or postgres://).'
    );
  }

  // Inject connect_timeout=10 to prevent indefinite pool stalls if not present
  if (!envUrl.includes('connect_timeout')) {
    const separator = envUrl.includes('?') ? '&' : '?';
    envUrl = `${envUrl}${separator}connect_timeout=10`;
  }

  return envUrl;
};

/**
 * Creates a new configured PrismaClient instance.
 */
export const createPrismaClient = (): PrismaClient => {
  const url = getDatabaseUrl();

  const client = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

  client.$on('error' as never, (e: any) => {
    const errorMsg = e?.message || String(e);
    Logger.debug(`[Prisma Internal Event] ${errorMsg.split('\n')[0]}`);
  });

  client.$on('warn' as never, (e: any) => {
    Logger.debug(`[Prisma Internal Warn] ${e?.message || e}`);
  });

  return client;
};

/**
 * Singleton accessor that ensures exactly ONE PrismaClient instance exists
 * across both production and development environments.
 */
export const getPrismaClient = (): PrismaClient => {
  if (globalThis.__prismaInstance) {
    return globalThis.__prismaInstance;
  }

  const client = createPrismaClient();
  globalThis.__prismaInstance = client;

  return client;
};

/**
 * Reset function for testing environments
 */
export const resetPrismaInstanceForTesting = (): void => {
  globalThis.__prismaInstance = undefined;
};

/**
 * Transparent Lazy Proxy for PrismaClient.
 * This guarantees that `import { prisma } from './prisma'` can be evaluated during
 * module graph resolution without eagerly constructing PrismaClient before
 * environment configuration completes, while ensuring a true Singleton instance
 * and 100% compatibility with Vitest/Jest spies (`vi.spyOn(prisma, '$transaction')`),
 * reflection, and all runtime methods ($queryRaw, $connect, $disconnect, etc.).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop: string | symbol, receiver) {
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);

    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(target, prop: string | symbol, value: any, receiver) {
    return Reflect.set(target, prop, value, receiver);
  },
  defineProperty(target, prop: string | symbol, attributes) {
    return Reflect.defineProperty(target, prop, attributes);
  },
  deleteProperty(target, prop: string | symbol) {
    return Reflect.deleteProperty(target, prop);
  },
  has(target, prop: string | symbol) {
    if (prop in target) return true;
    const client = getPrismaClient();
    return Reflect.has(client, prop);
  },
  getOwnPropertyDescriptor(target, prop: string | symbol) {
    if (prop in target) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
    const client = getPrismaClient();
    const descriptor = Reflect.getOwnPropertyDescriptor(client, prop);
    if (descriptor) {
      descriptor.configurable = true;
      return descriptor;
    }
    if (prop in client) {
      return {
        value: (client as any)[prop],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    return undefined;
  },
  getPrototypeOf(_target) {
    const client = getPrismaClient();
    return Reflect.getPrototypeOf(client);
  },
  ownKeys(target) {
    const client = getPrismaClient();
    const clientKeys = Reflect.ownKeys(client);
    const targetKeys = Reflect.ownKeys(target);
    return Array.from(new Set([...targetKeys, ...clientKeys]));
  },
});

export default prisma;
