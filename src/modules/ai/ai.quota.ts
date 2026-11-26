import { prisma } from '../../lib/prisma';
import { AiQuotaInfo } from './ai.types';

export const DAILY_AI_QUOTA_PER_USER = 50;

// Ngày nghiệp vụ tính theo Asia/Ho_Chi_Minh (UTC+7, không có DST).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trả về mốc 00:00 hôm nay và 00:00 ngày mai (giờ Việt Nam) dưới dạng Date (UTC instant).
 */
export const getVnDayWindow = (now: Date = new Date()): { start: Date; end: Date; dateKey: string } => {
  const vnNow = now.getTime() + VN_OFFSET_MS;
  const vnDayStart = Math.floor(vnNow / DAY_MS) * DAY_MS;
  const start = new Date(vnDayStart - VN_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end, dateKey: new Date(vnDayStart).toISOString().slice(0, 10) };
};

const buildQuotaInfo = (userId: string, used: number, now: Date = new Date()): AiQuotaInfo => {
  const { end, dateKey } = getVnDayWindow(now);
  return {
    userId,
    dateKey,
    used,
    limit: DAILY_AI_QUOTA_PER_USER,
    remaining: Math.max(0, DAILY_AI_QUOTA_PER_USER - used),
    resetAt: end.toISOString(),
  };
};

/**
 * Hạn mức AI theo ngày, lưu trong PostgreSQL (bảng AIUsage) nên đúng trên mọi instance
 * và không bị reset khi server/serverless function khởi động lại.
 */
export class AiQuotaManager {
  static async getQuota(userId: string): Promise<AiQuotaInfo> {
    const now = new Date();
    const { start, end } = getVnDayWindow(now);
    const used = await prisma.aIUsage.count({
      where: { userId, createdAt: { gte: start, lt: end } },
    });
    return buildQuotaInfo(userId, used, now);
  }

  /**
   * Kiểm tra và tiêu thụ 1 lượt một cách nguyên tử: advisory lock theo userId trong transaction
   * để hai request đồng thời không cùng vượt hạn mức.
   */
  static async checkAndConsumeQuota(
    userId: string,
    prompt: string = '',
    intent?: string
  ): Promise<{ allowed: boolean; quota: AiQuotaInfo }> {
    const now = new Date();
    const { start, end } = getVnDayWindow(now);

    const used = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const current = await tx.aIUsage.count({
        where: { userId, createdAt: { gte: start, lt: end } },
      });

      if (current >= DAILY_AI_QUOTA_PER_USER) {
        return { consumed: false, used: current };
      }

      await tx.aIUsage.create({
        data: { userId, prompt: prompt.substring(0, 100), intent: intent ?? null },
      });
      return { consumed: true, used: current + 1 };
    });

    return { allowed: used.consumed, quota: buildQuotaInfo(userId, used.used, now) };
  }
}
