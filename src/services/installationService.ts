const STORAGE_KEY = 'circuit_installation_id';

let cachedId: string | null = null;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getInstallationId(): string {
  if (cachedId) return cachedId;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private mode) — fall through to in-memory
  }

  const newId = generateUUID();
  cachedId = newId;

  try {
    localStorage.setItem(STORAGE_KEY, newId);
  } catch {
    // If localStorage is unavailable we keep the in-memory copy;
    // data isolation still works for the session.
  }

  return newId;
}
