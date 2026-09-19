// Ensure window.fetch has both a getter and setter to prevent "Cannot set property fetch of #<Window> which has only a getter"
try {
  let _fetch = window.fetch;
  const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
  if (!desc || desc.set === undefined) {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return _fetch;
      },
      set(fn) {
        _fetch = fn;
      },
    });
  }
} catch {
  // Ignore fallback if restricted
}

// Global safety handler for standard browser Pointer Lock interruptions
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || '';
  if (
    msg.includes('user has exited the lock') ||
    msg.includes('pointer') ||
    msg.includes('PointerLock')
  ) {
    event.preventDefault();
  }
});

// Global safety handler for restricted iframe localStorage access
try {
  const testKey = '__test_ls__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch {
  // If localStorage throws SecurityError or DOMException in restricted iframe, provide memory fallback
  const memStore = new Map<string, string>();
  const dummyStorage: Storage = {
    length: 0,
    clear: () => memStore.clear(),
    getItem: (key: string) => memStore.get(key) ?? null,
    key: (index: number) => Array.from(memStore.keys())[index] ?? null,
    removeItem: (key: string) => memStore.delete(key),
    setItem: (key: string, val: string) => {
      memStore.set(key, String(val));
    },
  };
  try {
    Object.defineProperty(window, 'localStorage', {
      value: dummyStorage,
      configurable: true,
      writable: true,
    });
  } catch {}
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
