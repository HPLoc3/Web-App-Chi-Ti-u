import { AiRequestLog, FinancialIntent } from './ai.types';
import { Logger } from '../../utils/logger';

const MAX_LOGS_PER_USER = 100;
const inMemoryLogs: AiRequestLog[] = [];

export class AiLogger {
  static logRequest(entry: {
    userId: string;
    intent: FinancialIntent;
    prompt: string;
    status: 'SUCCESS' | 'RATE_LIMITED' | 'ERROR' | 'FALLBACK';
    durationMs: number;
    quotaRemaining: number;
  }): AiRequestLog {
    const log: AiRequestLog = {
      id: `ai-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: entry.userId,
      timestamp: new Date().toISOString(),
      intent: entry.intent,
      promptSnippet: entry.prompt.substring(0, 100),
      status: entry.status,
      durationMs: entry.durationMs,
      quotaRemaining: entry.quotaRemaining,
    };

    inMemoryLogs.unshift(log);

    if (inMemoryLogs.length > 500) {
      inMemoryLogs.pop();
    }

    Logger.info(
      `[AI Copilot Log] User: ${entry.userId} | Intent: ${entry.intent} | Status: ${entry.status} | Duration: ${entry.durationMs}ms | QuotaLeft: ${entry.quotaRemaining}`
    );

    return log;
  }

  static getLogs(userId: string, limit: number = 20): AiRequestLog[] {
    return inMemoryLogs
      .filter((l) => l.userId === userId)
      .slice(0, Math.min(limit, MAX_LOGS_PER_USER));
  }
}
