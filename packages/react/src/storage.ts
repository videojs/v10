import type { StorageAdapter } from '@videojs/core/dom';

export const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently swallow SecurityError / quota exceeded.
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently swallow SecurityError.
    }
  },
};
