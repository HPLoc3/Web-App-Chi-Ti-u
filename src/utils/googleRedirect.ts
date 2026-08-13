/**
 * Helper utility to determine the Google OAuth redirect URI dynamically
 * without hardcoding.
 * 
 * Logic:
 * 1. If running in browser (`typeof window !== 'undefined'`):
 *    - Uses `window.location.origin + '/auth/callback'`
 * 2. If running on server or build-time/SSR:
 *    - Checks `process.env.NODE_ENV === 'production'` -> returns `'https://hophuloc.online/auth/callback'`
 *    - Checks `process.env.APP_URL` or `process.env.VITE_APP_URL` -> uses `env + '/auth/callback'`
 *    - Default fallback -> `'http://localhost:5173/auth/callback'`
 */
export function getGoogleRedirectUri(currentOrigin?: string): string {
  const isProduction = process.env.NODE_ENV === 'production' || 
    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));

  // If explicit origin provided (e.g. from window.location.origin or request headers)
  const baseOrigin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '');

  if (baseOrigin && baseOrigin.trim() !== '') {
    const cleanOrigin = baseOrigin.replace(/\/$/, '');
    return `${cleanOrigin}/auth/callback`;
  }

  // Fallback to environment variables
  const envAppUrl = (
    process.env.APP_URL || 
    process.env.VITE_APP_URL || 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_URL) || 
    ''
  ).trim().replace(/\/$/, '');

  if (envAppUrl) {
    return `${envAppUrl}/auth/callback`;
  }

  if (isProduction) {
    return 'https://hophuloc.online/auth/callback';
  }

  // Development default
  return 'http://localhost:5173/auth/callback';
}
