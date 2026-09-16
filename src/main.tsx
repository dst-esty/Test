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

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
