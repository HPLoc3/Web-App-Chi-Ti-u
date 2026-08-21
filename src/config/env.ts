import { z } from 'zod';
import { loadEnvironment } from './loadEnv';

// Ensure environment files are loaded according to precedence
loadEnvironment();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: z.string().optional().default('https://hophuloc.online,https://www.hophuloc.online,http://localhost:5173,http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required and cannot be empty').refine(
    (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
    { message: 'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://' }
  ),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters for security'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig | null = null;

export function maskDatabaseUrl(url?: string): string {
  if (!url) return '[NOT_SET]';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:([^:@]+)@/, ':***@');
  }
}

export function validateEnvironment(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv;
  }

  loadEnvironment();

  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    APP_URL: process.env.APP_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error('❌ FATAL DATABASE/CONFIG ERROR: Missing or Invalid Mandatory Environment Variables:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - [${issue.path.join('.')}]: ${issue.message}`);
    });
    console.error('\nServer cannot start without mandatory environment variables (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET).');
    console.error('Please configure them in your .env file or production environment settings.\n');

    if (typeof process !== 'undefined' && process.exit && process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw new Error(
      `Environment validation failed: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`
    );
  }

  validatedEnv = parsed.data;
  return validatedEnv;
}

export const env = validateEnvironment();
