import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// Filter out harmless [GSI_LOGGER] warning logs from console without overriding native APIs
if (typeof window !== 'undefined') {
  const consoleMethods = ['log', 'warn', 'info', 'error', 'debug'] as const;
  consoleMethods.forEach((method) => {
    const orig = console[method];
    if (typeof orig === 'function') {
      console[method] = function (...args: any[]) {
        if (
          args.some(
            (arg) =>
              typeof arg === 'string' &&
              (arg.includes('[GSI_LOGGER]') || arg.includes('identity-credentials-get'))
          )
        ) {
          return;
        }
        orig.apply(console, args);
      };
    }
  });
}

const rawEnvClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').replace(/^["']|["']$/g, '').trim();
const googleClientId = (
  rawEnvClientId &&
  !rawEnvClientId.includes('your_google_client_id') &&
  !rawEnvClientId.includes('your-google-client-id') &&
  !rawEnvClientId.includes('YOUR_GOOGLE_CLIENT_ID')
)
  ? rawEnvClientId
  : 'no-google-client-id-configured';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);


