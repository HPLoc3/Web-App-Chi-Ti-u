import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config({ override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().optional().default('https://hophuloc.online,https://www.hophuloc.online,http://localhost:5173,http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string' }
  ),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters for security'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig;

export function validateEnvironment(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv;
  }

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    APP_URL: process.env.APP_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://hophuloc_admin:SecurePass_157_66_101_43@157.66.101.43:5432/hophuloc_expense_db?schema=public',
    JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'staychitiu-super-secure-access-token-jwt-secret-key-2026'),
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'staychitiu-super-secure-refresh-token-jwt-secret-key-2026'),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error('❌ FATAL: Invalid Environment Configuration:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    // In production, exit immediately to prevent running with insecure or broken config
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // In development/test, provide safe fallback
    validatedEnv = {
      NODE_ENV: (rawEnv.NODE_ENV as any) || 'development',
      PORT: Number(rawEnv.PORT) || 3000,
      APP_URL: rawEnv.APP_URL || 'http://localhost:3000',
      ALLOWED_ORIGINS: rawEnv.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173',
      DATABASE_URL: rawEnv.DATABASE_URL,
      JWT_SECRET: rawEnv.JWT_SECRET || 'staychitiu-super-secure-access-token-jwt-secret-key-2026',
      JWT_REFRESH_SECRET: rawEnv.JWT_REFRESH_SECRET || 'staychitiu-super-secure-refresh-token-jwt-secret-key-2026',
      GOOGLE_CLIENT_ID: rawEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: rawEnv.GOOGLE_CLIENT_SECRET,
      GEMINI_API_KEY: rawEnv.GEMINI_API_KEY,
      LOG_LEVEL: (rawEnv.LOG_LEVEL as any) || 'info',
    };
    return validatedEnv;
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}

export const env = validateEnvironment();
