/**
 * Safe localStorage wrapper that handles cases where localStorage
 * is not available (e.g., Android WebView, private browsing)
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch {
      console.warn('localStorage.getItem failed for key:', key);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch {
      console.warn('localStorage.setItem failed for key:', key);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch {
      console.warn('localStorage.removeItem failed for key:', key);
    }
  }
};

// Convenience exports for direct usage
export const safeGetItem = safeLocalStorage.getItem;
export const safeSetItem = safeLocalStorage.setItem;
export const safeRemoveItem = safeLocalStorage.removeItem;
