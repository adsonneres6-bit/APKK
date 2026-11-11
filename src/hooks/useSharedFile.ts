import { useEffect, useRef, useState } from 'react';
import {
  getLatestSharedFile,
  type StoredFile,
} from '../services/sharedFileService';
import { getAndroidBridge } from '../services/nativeDownload';

export interface SharedFileData {
  file: File;
  fileName: string;
  fileType: 'pdf' | 'xlsx';
  mimeType: string;
}

function toFileObject(stored: StoredFile): SharedFileData {
  const file = new File([stored.file], stored.fileName, {
    type: stored.mimeType || 'application/octet-stream',
  });
  return {
    file,
    fileName: stored.fileName,
    fileType: stored.fileType,
    mimeType: stored.mimeType,
  };
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

  return null;
}

export function useSharedFile(
  onPdfFile: (data: SharedFileData) => void,
  onXlsxFile: (data: SharedFileData) => void,
): {
  shareError: string | null;
  clearShareError: () => void;
} {
  const [shareError, setShareError] = useState<string | null>(null);
  const [processedId, setProcessedId] = useState<string | null>(null);

  const onPdfFileRef = useRef(onPdfFile);
  const onXlsxFileRef = useRef(onXlsxFile);
  onPdfFileRef.current = onPdfFile;
  onXlsxFileRef.current = onXlsxFile;

  // Handle files from Web Share Target (Android "Share" menu via Service Worker)
  useEffect(() => {
    const url = new URL(window.location.href);
    const shareParam = url.searchParams.get('share');

    if (!shareParam) return;

    window.history.replaceState({}, document.title, '/');

    if (shareParam === 'error') {
      const reason = url.searchParams.get('reason');
      const messages: Record<string, string> = {
        no_file: 'Nenhum arquivo recebido.',
        unsupported: 'Formato de arquivo não suportado. Use PDF ou XLSX.',
        exception: 'Erro ao receber o arquivo. Tente novamente.',
      };
      setShareError(messages[reason || 'exception'] || 'Erro ao receber arquivo.');
      return;
    }

    if (shareParam === 'received') {
      getLatestSharedFile()
        .then((stored) => {
          if (!stored) {
            setShareError('Arquivo não encontrado. Tente compartilhar novamente.');
            return;
          }
          if (processedId === stored.id) return;
          setProcessedId(stored.id);
          const data = toFileObject(stored);

          if (data.fileType === 'pdf') {
            onPdfFileRef.current(data);
          } else if (data.fileType === 'xlsx') {
            onXlsxFileRef.current(data);
          }
        })
        .catch(() => {
          setShareError('Erro ao carregar o arquivo recebido.');
        });
    }
  }, [processedId]);

  // Handle files from file_handlers API (desktop "Open with" menu)
  useEffect(() => {
    if (!('launchQueue' in window)) return;

    window.launchQueue?.setConsumer(async (launchParams) => {
      if (!launchParams.files || launchParams.files.length === 0) return;

      try {
        const handle = launchParams.files[0];
        const file = await handle.getFile();
        const fileType = detectFileType(file.name, file.type);

        if (!fileType) {
          setShareError('Formato de arquivo não suportado. Use PDF ou XLSX.');
          return;
        }

        const data: SharedFileData = {
          file,
          fileName: file.name,
          fileType,
          mimeType: file.type || 'application/octet-stream',
        };

        if (fileType === 'pdf') {
          onPdfFileRef.current(data);
        } else if (fileType === 'xlsx') {
          onXlsxFileRef.current(data);
        }
      } catch {
        setShareError('Erro ao abrir o arquivo. Tente novamente.');
      }
    });
  }, []);

  // Handle files from the Android native queue. Each PDF carries an id and is
  // acknowledged only after it was handed to the app, so the native side keeps it until then.
  useEffect(() => {
    const bridge = getAndroidBridge();
    const handledIds = new Set<string>();

    (window as any).__rota123ReceiveExternalFile = (file: File, id?: string): boolean => {
      if (id && handledIds.has(id)) {
        bridge?.ackPdf?.(id);
        return true;
      }

      const fileType = detectFileType(file.name, file.type);
      if (!fileType) {
        setShareError('Formato de arquivo não suportado. Use PDF ou XLSX.');
        if (id) bridge?.ackPdf?.(id);
        return true;
      }

      const data: SharedFileData = {
        file,
        fileName: file.name,
        fileType,
        mimeType: file.type || 'application/octet-stream',
      };

      if (id) handledIds.add(id);
      try {
        if (fileType === 'pdf') {
          onPdfFileRef.current(data);
        } else {
          onXlsxFileRef.current(data);
        }
      } catch (err) {
        if (id) handledIds.delete(id);
        console.error('Failed to handle external file:', err);
        return false;
      }

      if (id) bridge?.ackPdf?.(id);
      return true;
    };

    bridge?.notifyPdfReady?.();

    return () => {
      delete (window as any).__rota123ReceiveExternalFile;
    };
  }, []);

  const clearShareError = () => setShareError(null);

  return { shareError, clearShareError };
}
