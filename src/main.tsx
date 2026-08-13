import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// Fix FedCM iframe permission issues and silence [GSI_LOGGER] noise
if (typeof window !== 'undefined') {
  // 1. Intercept navigator.credentials.get for identity to return null cleanly in iframes
  if (navigator.credentials && typeof navigator.credentials.get === 'function') {
    const originalGet = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = function (options?: any) {
      if (options && options.identity) {
        return Promise.resolve(null);
      }
      return originalGet(options);
    };
  }

  // 2. Filter out [GSI_LOGGER] messages across all console methods
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

  // 3. Patch google.accounts.id.initialize to disable FedCM prompt
  let googleObj = (window as any).google;
  const patchGoogleInitialize = (google: any) => {
    if (google?.accounts?.id && !google.accounts.id._patchedForFedCM) {
      const originalInitialize = google.accounts.id.initialize;
      google.accounts.id.initialize = function (config: any) {
        return originalInitialize.call(this, {
          ...config,
          use_fedcm_for_prompt: false,
        });
      };
      google.accounts.id._patchedForFedCM = true;
    }
  };

  if (googleObj) {
    patchGoogleInitialize(googleObj);
  } else {
    Object.defineProperty(window, 'google', {
      configurable: true,
      enumerable: true,
      get() {
        return googleObj;
      },
      set(val) {
        googleObj = val;
        if (val) {
          patchGoogleInitialize(val);
        }
      },
    });
  }
}

import appletConfig from '../firebase-applet-config.json';

const rawEnvClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleClientId = (rawEnvClientId && !rawEnvClientId.includes('your_google_client_id') && !rawEnvClientId.includes('your-google-client-id'))
  ? rawEnvClientId
  : (appletConfig.oAuthClientId || '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);

