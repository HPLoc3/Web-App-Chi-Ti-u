import dotenv from 'dotenv';
import path from 'path';

/**
 * Loads environment configuration with explicit precedence:
 * 1. process.env (System / OS / PM2 / Docker / CI) - Highest precedence
 * 2. .env.local (Local developer overrides, git-ignored)
 * 3. .env.${NODE_ENV} (e.g. .env.development or .env.production)
 * 4. .env (Base configuration fallback)
 *
 * All loaded with `override: false` to ensure higher priority values are never overwritten.
 */
export function loadEnvironment(cwd = process.cwd()): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 1. .env.local (Local uncommitted overrides)
  dotenv.config({ path: path.resolve(cwd, '.env.local'), override: false });

  // 2. .env.development / .env.production / .env.test
  dotenv.config({ path: path.resolve(cwd, `.env.${nodeEnv}`), override: false });

  // 3. .env (Base fallback)
  dotenv.config({ path: path.resolve(cwd, '.env'), override: false });
}

// Automatically invoke on module load
loadEnvironment();
