import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix for superagent / mime compatibility in test runner
try {
  const mime = require('mime');
  if (mime && !mime.getType) {
    mime.getType = (path: string) => mime.lookup ? mime.lookup(path) : 'application/json';
  }
  if (mime && !mime.getExtension) {
    mime.getExtension = (type: string) => mime.extension ? mime.extension(type) : 'json';
  }
} catch (e) {}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-key-minimum-32-chars!';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-jwt-secret-key-minimum-32-chars!';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db?schema=public';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';

// Only setup browser mocks if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // Mock ResizeObserver
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock as any;

  // Mock scrollTo
  window.scrollTo = vi.fn();
  if (typeof Element !== 'undefined' && Element.prototype) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}
