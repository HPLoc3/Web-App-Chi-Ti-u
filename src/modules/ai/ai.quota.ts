import { AiQuotaInfo } from './ai.types';

const DAILY_AI_QUOTA_PER_USER = 50;

// In-memory quota store: userId -> { dateKey, used }
interface UserQuotaState {
  dateKey: string;
  used: number;
}

const quotaStore = new Map<string, UserQuotaState>();

const getDateKey = (d: Date = new Date()): string => {
  return d.toISOString().split('T')[0];
};

const getNextResetTimestamp = (d: Date = new Date()): string => {
  const tomorrow = new Date(d);
  tomorrow.setUTCHours(23, 59, 59, 999);
  return tomorrow.toISOString();
};

export class AiQuotaManager {
  static getQuota(userId: string): AiQuotaInfo {
    const todayKey = getDateKey();
    let current = quotaStore.get(userId);

    if (!current || current.dateKey !== todayKey) {
      current = { dateKey: todayKey, used: 0 };
      quotaStore.set(userId, current);
    }

    const remaining = Math.max(0, DAILY_AI_QUOTA_PER_USER - current.used);

    return {
      userId,
      dateKey: todayKey,
      used: current.used,
      limit: DAILY_AI_QUOTA_PER_USER,
      remaining,
      resetAt: getNextResetTimestamp(),
    };
  }

  static checkAndConsumeQuota(userId: string): {
    allowed: boolean;
    quota: AiQuotaInfo;
  } {
    const quota = this.getQuota(userId);

    if (quota.remaining <= 0) {
      return {
        allowed: false,
        quota,
      };
    }

    // Increment usage
    const current = quotaStore.get(userId)!;
    current.used += 1;
    quotaStore.set(userId, current);

    const updatedQuota = this.getQuota(userId);

    return {
      allowed: true,
      quota: updatedQuota,
    };
  }
}
