/**
 * Security Logging Utility
 * Tự động che giấu (mask) các thông tin nhạy cảm: Passwords, Tokens, API Keys, Secrets
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
]);

export const maskSensitiveData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if looks like a JWT
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(data) && data.length > 30) {
      return '[REDACTED_JWT]';
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
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
};

export class Logger {
  static info(message: string, meta?: any, requestId?: string) {
    const prefix = `[${new Date().toISOString()}] [INFO]${requestId ? ` [Req: ${requestId}]` : ''}`;
    if (meta) {
      console.log(`${prefix} ${message}`, maskSensitiveData(meta));
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  static warn(message: string, meta?: any, requestId?: string) {
    const prefix = `[${new Date().toISOString()}] [WARN]${requestId ? ` [Req: ${requestId}]` : ''}`;
    if (meta) {
      console.warn(`${prefix} ${message}`, maskSensitiveData(meta));
    } else {
      console.warn(`${prefix} ${message}`);
    }
  }

  static error(message: string, error?: any, requestId?: string) {
    const prefix = `[${new Date().toISOString()}] [ERROR]${requestId ? ` [Req: ${requestId}]` : ''}`;
    const safeError = error instanceof Error 
      ? { message: error.message, name: error.name, ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}) }
      : maskSensitiveData(error);

    console.error(`${prefix} ${message}`, safeError);
  }
}
