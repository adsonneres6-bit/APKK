const DB_NAME = 'rota123-shared-files';
const STORE_NAME = 'files';
const DB_VERSION = 1;

interface StoredFile {
  id: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  fileType: 'pdf' | 'xlsx';
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeSharedFile(
  file: Blob,
  fileName: string,
  mimeType: string,
  fileType: 'pdf' | 'xlsx',
): Promise<string> {
  const db = await openDB();
  const id = `shared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: StoredFile = {
    id,
    file,
    fileName,
    mimeType,
    fileType,
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSharedFile(id: string): Promise<StoredFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getLatestSharedFile(): Promise<StoredFile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const results = request.result as StoredFile[];
      if (results.length === 0) {
        resolve(null);
        return;
      }
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results[0]);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSharedFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllSharedFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type { StoredFile };
