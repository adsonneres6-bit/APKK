import * as XLSX from 'xlsx';

export interface XlsxSheetData {
  headers: string[];
  rows: string[][];
}

export interface ColumnIndices {
  sequence: number;
  destinationAddress: number;
  spxTn: number;
}

const HEADER_ALIASES: Record<keyof ColumnIndices, string[]> = {
  sequence: ['sequence', 'seq', 'sequencia', 'sequência', '#', 'numero', 'número'],
  destinationAddress: [
    'destination address',
    'destinationaddress',
    'address',
    'endereco',
    'endereço',
    'destino',
    'destination',
  ],
  spxTn: ['spx tn', 'spxtn', 'spx', 'tn', 'notes', 'tracking', 'rastreamento'],
};

function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function readXlsxByHeaders(file: File): Promise<XlsxSheetData> {
  const startTime = performance.now();
  console.log('[XLSX READER] Starting read', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type,
  });

  try {
    const buffer = await file.arrayBuffer();
    console.log('[XLSX READER] ArrayBuffer read complete', {
      bufferSize: `${(buffer.byteLength / 1024).toFixed(2)} KB`,
    });

    const workbook = XLSX.read(buffer, { type: 'array' });
    console.log('[XLSX READER] Workbook parsed', {
      sheetCount: workbook.SheetNames.length,
      sheetNames: workbook.SheetNames,
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    console.log('[XLSX READER] Sheet data extracted', {
      sheetName,
      totalRows: data.length,
      hasHeader: data.length > 0,
    });

    if (data.length === 0) {
      console.warn('[XLSX READER] No data in sheet, returning empty');
      return { headers: [], rows: [] };
    }

    const headers = (data[0] ?? []).map((h) => String(h ?? ''));
    const body = data.slice(1).map((row) => row.map((c) => String(c ?? '')));

    const elapsed = performance.now() - startTime;
    console.log('[XLSX READER] Read complete', {
      headers,
      dataRows: body.length,
      processingTimeMs: elapsed.toFixed(2),
    });

    return { headers, rows: body };
  } catch (err) {
    const elapsed = performance.now() - startTime;
    console.error('[XLSX READER] Read failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      processingTimeMs: elapsed.toFixed(2),
    });
    throw err;
  }
}

export function findColumnIndices(headers: string[]): ColumnIndices {
  const normalized = headers.map(normalizeHeader);

  const findIndex = (aliases: string[]): number => {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.includes(normalized[i])) return i;
    }
    return -1;
  };

  return {
    sequence: findIndex(HEADER_ALIASES.sequence.map(normalizeHeader)),
    destinationAddress: findIndex(HEADER_ALIASES.destinationAddress.map(normalizeHeader)),
    spxTn: findIndex(HEADER_ALIASES.spxTn.map(normalizeHeader)),
  };
}

export function writeXlsx(
  headers: string[],
  rows: string[][],
  sheetName: string,
  outputFileName: string,
): void {
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, outputFileName);
}

export function createXlsxBlob(
  headers: string[],
  rows: string[][],
  sheetName: string,
): Blob {
  const sheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function buildDateSuffix(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}_${month}`;
}
