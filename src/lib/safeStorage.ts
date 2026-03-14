function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate = window.localStorage as Partial<Storage> | undefined;
  if (!candidate || typeof candidate.getItem !== "function") {
    return null;
  }

  return candidate as Storage;
}

export function readLocalStorage(key: string): string | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
