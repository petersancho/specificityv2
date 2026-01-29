const canAccessLocalStorage = () => {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
};

export const safeLocalStorageGet = (key: string) => {
  if (!canAccessLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string) => {
  if (!canAccessLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures (private mode, quota, blocked storage).
  }
};

export const safeLocalStorageRemove = (key: string) => {
  if (!canAccessLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage remove failures.
  }
};
