import type { ClientRateLimitInfo, IncrementResponse, Options, Store } from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { Logger } from '../utils/logger';

/**
 * Store cho express-rate-limit lưu bộ đếm trong PostgreSQL (bảng "RateLimit").
 * Dùng cho các endpoint nhạy cảm (đăng nhập, đăng ký, quên mật khẩu, AI) để giới hạn
 * đúng trên mọi instance / serverless function, không bị reset khi khởi động lại.
 *
 * Mỗi lần increment là một câu UPSERT nguyên tử, dùng đồng hồ của DB (không phụ thuộc giờ server app).
 */
export class PgRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;

  constructor(prefix: string) {
    this.prefix = `${prefix}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private k(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const rows = await prisma.$queryRaw<{ hits: number; resetAt: Date }[]>`
      SELECT "hits", "resetAt" FROM "RateLimit"
      WHERE "key" = ${this.k(key)} AND "resetAt" > now()
    `;
    if (rows.length === 0) return undefined;
    return { totalHits: Number(rows[0].hits), resetTime: new Date(rows[0].resetAt) };
  }

  async increment(key: string): Promise<IncrementResponse> {
    const rows = await prisma.$queryRaw<{ hits: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "hits", "resetAt")
      VALUES (${this.k(key)}, 1, now() + (${this.windowMs}::double precision * interval '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."hits" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now()
                         THEN now() + (${this.windowMs}::double precision * interval '1 millisecond')
                         ELSE "RateLimit"."resetAt" END
      RETURNING "hits", "resetAt"
    `;

    // Dọn dần các dòng đã hết hạn (xác suất ~1%) để bảng không phình to, không cần cron.
    if (Math.random() < 0.01) {
      prisma
        .$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 day'`
        .catch((err: unknown) => Logger.debug(`[RateLimit] cleanup failed: ${String(err)}`));
    }

    return { totalHits: Number(rows[0].hits), resetTime: new Date(rows[0].resetAt) };
  }

  async decrement(key: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "RateLimit" SET "hits" = GREATEST("hits" - 1, 0) WHERE "key" = ${this.k(key)}
    `;
  }

  async resetKey(key: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" = ${this.k(key)}`;
  }

  async resetAll(): Promise<void> {
    await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "key" LIKE ${this.prefix + '%'}`;
  }
}
