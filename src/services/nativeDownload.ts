type AndroidBridge = {
  isNativeApp?: () => boolean;
  saveBlob?: (base64: string, fileName: string, mimeType: string, requestId: string) => boolean;
  notifyPdfReady?: () => void;
  ackPdf?: (id: string) => void;
  notifyRouteReady?: (fileName: string) => boolean;
  openSavedFile?: (fileName: string) => boolean;
};

type SaveResolver = (saved: boolean, actualFileName: string | null) => void;

const pendingSaves = new Map<string, SaveResolver>();

declare global {
  interface Window {
    __rota123SaveResult?: (requestId: string, saved: boolean, actualFileName?: string | null) => void;
  }
}

window.__rota123SaveResult = (requestId, saved, actualFileName) => {
  const resolve = pendingSaves.get(requestId);
  if (!resolve) return;
  pendingSaves.delete(requestId);
  resolve(saved, actualFileName ?? null);
};

export function getAndroidBridge(): AndroidBridge | null {
  const bridge = (window as unknown as { AndroidRota123?: AndroidBridge }).AndroidRota123;
  if (bridge && typeof bridge.isNativeApp === 'function' && bridge.isNativeApp()) {
    return bridge;
  }
  return null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
}

function guessMime(blob: Blob, fileName: string): string {
  if (blob.type) return blob.type;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'tsv') return 'text/tab-separated-values';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function downloadInBrowser(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export interface SaveResult {
  saved: boolean;
  /** Name of the file as actually saved on the device (deduplicated by Android). */
  fileName: string | null;
}

/**
 * Saves a file to the device and resolves true only when it was actually written.
 * On Android the native side reports the result after the user picks a location
 * (or cancels). In the browser the download is triggered and treated as saved.
 */
export async function saveBlobToDevice(blob: Blob, fileName: string): Promise<SaveResult> {
  const bridge = getAndroidBridge();
  if (!bridge || typeof bridge.saveBlob !== 'function') {
    return { saved: downloadInBrowser(blob, fileName), fileName };
  }
  try {
    const base64 = await blobToBase64(blob);
    const requestId = `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const { saved, actualFileName } = await new Promise<{
      saved: boolean;
      actualFileName: string | null;
    }>((resolve) => {
      pendingSaves.set(requestId, (isSaved, name) => resolve({ saved: isSaved, actualFileName: name }));
      const accepted = bridge.saveBlob!(base64, fileName, guessMime(blob, fileName), requestId);
      if (!accepted) {
        pendingSaves.delete(requestId);
        resolve({ saved: false, actualFileName: null });
      }
    });
    if (saved && bridge.notifyRouteReady && actualFileName) {
      bridge.notifyRouteReady(actualFileName);
    }
    return { saved, fileName: actualFileName };
  } catch (err) {
    console.error('Native save failed:', err);
    return { saved: false, fileName: null };
  }
}

/**
 * Opens the saved file with a compatible app (Android only). Resolves false
 * when there is no saved copy or no app able to open it, so callers can
 * offer a fresh download instead.
 */
export async function openSavedFile(fileName: string): Promise<boolean> {
  const bridge = getAndroidBridge();
  if (!bridge || typeof bridge.openSavedFile !== 'function') return false;
  return bridge.openSavedFile(fileName);
}
