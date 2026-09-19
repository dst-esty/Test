/**
 * Safe LocalStorage wrapper for restricted or sandboxed iframe environments
 * where accessing window.localStorage may throw a SecurityError or DOMException.
 */

const memoryStore = new Map<string, string>();

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory store if localStorage is blocked by iframe security policy
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback to memory store
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback to memory store
    }
    memoryStore.delete(key);
  },
};
