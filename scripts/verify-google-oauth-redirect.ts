import { getGoogleRedirectUri } from '../src/utils/googleRedirect';

function runDiagnostics() {
  console.log('=== Google OAuth Redirect URI Diagnostic ===\n');

  // Test 1: Production environment
  process.env.NODE_ENV = 'production';
  delete process.env.APP_URL;
  delete process.env.VITE_APP_URL;
  const prodUri = getGoogleRedirectUri();
  console.log('1. Production (NODE_ENV=production):', prodUri);
  if (prodUri !== 'https://hophuloc.online/auth/callback') {
    throw new Error(`Expected https://hophuloc.online/auth/callback, got ${prodUri}`);
  }

  // Test 2: Development environment (localhost)
  process.env.NODE_ENV = 'development';
  delete process.env.APP_URL;
  delete process.env.VITE_APP_URL;
  const devUri = getGoogleRedirectUri('http://localhost:5173');
  console.log('2. Development (Browser origin http://localhost:5173):', devUri);
  if (devUri !== 'http://localhost:5173/auth/callback') {
    throw new Error(`Expected http://localhost:5173/auth/callback, got ${devUri}`);
  }

  // Test 3: Custom environment variable APP_URL
  process.env.NODE_ENV = 'development';
  process.env.APP_URL = 'https://custom-preview.example.com';
  const customUri = getGoogleRedirectUri();
  console.log('3. Custom APP_URL (https://custom-preview.example.com):', customUri);
  if (customUri !== 'https://custom-preview.example.com/auth/callback') {
    throw new Error(`Expected https://custom-preview.example.com/auth/callback, got ${customUri}`);
  }

  console.log('\n✅ All Google OAuth redirect URI diagnostic checks passed successfully!');
}

try {
  runDiagnostics();
} catch (error: any) {
  console.error('\n❌ Diagnostic failed:', error.message);
  process.exit(1);
}
