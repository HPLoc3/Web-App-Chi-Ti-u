/**
 * Production-Ready Structured Logging Utility
 * - Outputs structured JSON in staging and production
 * - Formats human-readable logs in development
 * - Automatically redacts secrets, tokens, passwords, database credentials, and keys
 * - Injects Request ID and timestamps for tracing
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'newpassword',
  'confirmpassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'credential',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'jwt_secret',
  'jwt_refresh_secret',
  'apikey',
  'gemini_api_key',
  'clientsecret',
  'google_client_secret',
  'database_url',
]);

export const maskSensitiveData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if string is a JWT
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(data) && data.length > 30) {
      return '[REDACTED_JWT]';
    }
    // Check if string contains database credentials like postgres://user:pass@host
    if (data.includes('://') && data.includes('@')) {
      return data.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1[REDACTED_PASSWORD]$3');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = maskSensitiveData(value);
      } else {
        sanitized[key] = maskSensitiveData(value);
      }
    }
    return sanitized;
  }

  return data;
};

export interface StructuredLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  meta?: any;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

export class Logger {
  private static isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  private static serviceName = 'expense-ledger-service';

  private static formatLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any, requestId?: string, error?: any): string {
    const timestamp = new Date().toISOString();
    const env = process.env.NODE_ENV || 'development';

    if (this.isProduction) {
      const logObject: StructuredLog = {
        timestamp,
        level,
        message,
        service: this.serviceName,
        environment: env,
        ...(requestId ? { requestId } : {}),
        ...(meta ? { meta: maskSensitiveData(meta) } : {}),
      };

      if (error) {
        logObject.error = {
          name: error.name || 'Error',
          message: error.message || String(error),
          ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
        };
      }

      return JSON.stringify(logObject);
    }

    // Development readable format
    const reqStr = requestId ? ` [Req: ${requestId}]` : '';
    const metaStr = meta ? ` ${JSON.stringify(maskSensitiveData(meta))}` : '';
    const errStr = error ? ` ${error.stack || error.message || error}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${reqStr} ${message}${metaStr}${errStr}`;
  }

  static info(message: string, meta?: any, requestId?: string) {
    const output = this.formatLog('info', message, meta, requestId);
    console.log(output);
  }

  static warn(message: string, meta?: any, requestId?: string) {
    const output = this.formatLog('warn', message, meta, requestId);
    console.warn(output);
  }

  static error(message: string, error?: any, requestId?: string, meta?: any) {
    const output = this.formatLog('error', message, meta, requestId, error);
    console.error(output);
  }

  static debug(message: string, meta?: any, requestId?: string) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      const output = this.formatLog('debug', message, meta, requestId);
      console.log(output);
    }
  }
}
