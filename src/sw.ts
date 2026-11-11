/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

clientsClaim();

const SHARE_TARGET_URL = '/share-target';
const DB_NAME = 'rota123-shared-files';
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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

async function storeFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  fileType: 'pdf' | 'xlsx',
): Promise<void> {
  const db = await openDB();
  const id = `shared-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id,
      file: blob,
      fileName,
      mimeType,
      fileType,
      createdAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function detectFileType(fileName: string, mimeType: string): 'pdf' | 'xlsx' | null {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }

  const xlsxMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ];

  if (xlsxMimes.includes(lowerMime) || lowerName.endsWith('.xlsx')) {
    return 'xlsx';
  }

  if (lowerName.endsWith('.pdf')) return 'pdf';
  if (lowerName.endsWith('.xlsx')) return 'xlsx';

  return null;
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === SHARE_TARGET_URL) {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    const allKeys = Array.from(formData.keys());

    for (const key of allKeys) {
      const value = formData.get(key);
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return Response.redirect('/?share=error&reason=no_file', 302);
    }

    const file = files[0];
    const fileType = detectFileType(file.name, file.type);

    if (!fileType) {
      return Response.redirect('/?share=error&reason=unsupported', 302);
    }

    await storeFile(file, file.name, file.type, fileType);

    return Response.redirect('/?share=received&type=' + fileType, 302);
  } catch {
    return Response.redirect('/?share=error&reason=exception', 302);
  }
}
