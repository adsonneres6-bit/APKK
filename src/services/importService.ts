import * as XLSX from 'xlsx';
import type { RawRow } from '../types';

export interface ImportResult {
  rows: RawRow[];
  headers: string[];
}

export async function importXlsx(file: File): Promise<ImportResult> {
  const startTime = performance.now();
  console.log('[IMPORT XLSX] Starting import', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type,
  });

  try {
    const buffer = await file.arrayBuffer();
    console.log('[IMPORT XLSX] ArrayBuffer read complete', {
      bufferSize: `${(buffer.byteLength / 1024).toFixed(2)} KB`,
    });

    const workbook = XLSX.read(buffer, { type: 'array' });
    console.log('[IMPORT XLSX] Workbook parsed', {
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

    console.log('[IMPORT XLSX] Sheet data extracted', {
      sheetName,
      totalRows: data.length,
      hasHeader: data.length > 0,
    });

    if (data.length < 2) {
      console.warn('[IMPORT XLSX] Insufficient data - returning empty', {
        dataLength: data.length,
      });
      return { rows: [], headers: [] };
    }

    const headers = (data[0] ?? []).map((h) => String(h ?? ''));
    const body = data.slice(1);

    console.log('[IMPORT XLSX] Headers identified', {
      headers,
      bodyRowCount: body.length,
    });

    const rows: RawRow[] = body.map((row, index) => {
      const cells = row.map((c) => String(c ?? '').trim());
      return {
        colA: cells[0] ?? '',
        sequence: cells[1] ?? '',
        colC: cells[2] ?? '',
        spxTn: cells[3] ?? '',
        destinationAddress: cells[4] ?? '',
        colF: cells[5] ?? '',
        colG: cells[6] ?? '',
        colH: cells[7] ?? '',
        colI: cells[8] ?? '',
        colJ: cells[9] ?? '',
        extra: cells.slice(10),
        originalIndex: index,
      };
    });

    const elapsed = performance.now() - startTime;
    console.log('[IMPORT XLSX] Import complete', {
      totalRowsFound: rows.length,
      processingTimeMs: elapsed.toFixed(2),
      rowsPerMs: rows.length > 0 ? (rows.length / elapsed).toFixed(2) : 0,
    });

    return { rows, headers };
  } catch (err) {
    const elapsed = performance.now() - startTime;
    console.error('[IMPORT XLSX] Import failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      processingTimeMs: elapsed.toFixed(2),
    });
    throw err;
  }
}

/**
 * Importa um PDF com colunas "#" (sequence) e "Notes" (SPX TN).
 * O campo Notes contém um ";" ao final de cada SPX TN que deve ser removido.
 */
export async function importPdf(file: File): Promise<ImportResult> {
  const startTime = performance.now();

  console.log('[IMPORT PDF] Starting import', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
    fileType: file.type || 'application/pdf',
  });

  try {
    const pdfjs = await import('pdfjs-dist');

    // Configura o worker usando o padrão new URL (compatível com Vite)
    const workerUrl = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    console.log('[IMPORT PDF] Loading PDF document...');
    const buffer = await file.arrayBuffer();
    console.log('[IMPORT PDF] ArrayBuffer read complete', {
      bufferSize: `${(buffer.byteLength / 1024).toFixed(2)} KB`,
    });

    const doc = await pdfjs.getDocument({
      data: buffer,
      // Tenta usar worker; se falhar, fallback para main thread
      useWorkerFetch: false,
    }).promise;

    console.log('[IMPORT PDF] PDF document loaded', {
      totalPages: doc.numPages,
    });

    const pageLines: string[] = [];
    let totalTextItems = 0;
    let totalCharacters = 0;

    // Process ALL pages - never stop early
    for (let p = 1; p <= doc.numPages; p++) {
      const pageStart = performance.now();
      console.log(`[IMPORT PDF] Processing page ${p}/${doc.numPages}...`);

      const page = await doc.getPage(p);
      const content = await page.getTextContent();

      type TextItem = { str: string; x: number; y: number };
      const items: TextItem[] = [];

      for (const item of content.items) {
        if (!('str' in item) || !(item as { str: string }).str) continue;
        const str = (item as { str: string }).str;
        const transform = (item as { transform?: number[] }).transform;
        if (!transform) {
          items.push({ str, x: 0, y: 0 });
          continue;
        }
        items.push({ str, x: transform[4], y: transform[5] });
      }

      totalTextItems += items.length;
      totalCharacters += items.reduce((sum, it) => sum + it.str.length, 0);

      const yMap = new Map<number, TextItem[]>();
      for (const item of items) {
        const yKey = Math.round(item.y);
        if (!yMap.has(yKey)) yMap.set(yKey, []);
        yMap.get(yKey)!.push(item);
      }

      const sortedYs = [...yMap.keys()].sort((a, b) => b - a);
      let pageLineCount = 0;

      for (const y of sortedYs) {
        const lineItems = yMap.get(y)!;
        lineItems.sort((a, b) => a.x - b.x);
        const lineText = lineItems.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
        if (lineText) {
          pageLines.push(lineText);
          pageLineCount++;
        }
      }

      const pageElapsed = performance.now() - pageStart;
      console.log(`[IMPORT PDF] Page ${p} complete`, {
        textItems: items.length,
        linesExtracted: pageLineCount,
        pageTimeMs: pageElapsed.toFixed(2),
      });
    }

    const fullText = pageLines.join('\n');

    console.log('[IMPORT PDF] Text extraction complete', {
      totalPages: doc.numPages,
      totalLines: pageLines.length,
      totalTextItems,
      totalCharacters,
      fullTextLength: fullText.length,
      extractionTimeMs: (performance.now() - startTime).toFixed(2),
    });

    const result = parsePdfText(fullText, file.name);

    const elapsed = performance.now() - startTime;
    console.log('[IMPORT PDF] Import complete', {
      rowsFound: result.rows.length,
      totalTimeMs: elapsed.toFixed(2),
    });

    return result;
  } catch (err) {
    const elapsed = performance.now() - startTime;
    console.error('[IMPORT PDF] Import failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      processingTimeMs: elapsed.toFixed(2),
    });

    const message =
      err instanceof Error
        ? `Erro ao processar PDF: ${err.message}`
        : 'Erro ao processar PDF. Verifique se o arquivo é válido.';
    throw new Error(message);
  }
}

/**
 * Parseia o texto extraído do PDF (já dividido em linhas por coordenada Y).
 *
 * Layout real do PDF (4 colunas):
 *   #  |  Address  |  Estimated Arrival Time  |  Notes (SPX TN com ;)
 *
 * Exemplo de linha reconstruída:
 *   "1 Avenida Matapi, 40, Ap 707 bl 3, São Paulo 19:00 BR268251580957W;"
 *
 * Estratégia de parse:
 *   1. Linha começa com dígito(s) seguido de espaço + texto (o #).
 *   2. Contém um token de horário HH:MM que separa Address de Notes.
 *   3. O SPX TN é o token após o horário, terminando com ";" (removido).
 */
function parsePdfText(text: string, fileName: string): ImportResult {
  const parseStart = performance.now();
  console.log('[PARSE PDF] Starting parse', {
    fileName,
    textLength: text.length,
    firstChars: text.substring(0, 100),
  });

  const rows: RawRow[] = [];
  let originalIndex = 0;

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  console.log('[PARSE PDF] Lines extracted', {
    totalLines: lines.length,
    sampleLines: lines.slice(0, 5),
  });

  // Pattern 1: Full format with time - <#> <Address> <HH:MM> <SPX_TN>;
  // More flexible: allow optional time, allow spaces before semicolon
  const lineWithTimeRegex = /^(\d+)\s+(.+?)\s+(\d{1,2}:\d{2})\s+([A-Za-z0-9]{6,})\s*;*/;

  // Pattern 2: Without time - <#> <Address> <SPX_TN>;
  // This handles cases where time format varies or is missing
  const lineWithoutTimeRegex = /^(\d+)\s+(.+?)\s+([A-Za-z0-9]{10,})\s*;*/;

  // Pattern 3: Just sequence and SPX TN (minimal)
  const minimalRegex = /^(\d+)\s+([A-Za-z0-9]{10,})\s*;*/;

  let matchedWithTime = 0;
  let matchedWithoutTime = 0;
  let matchedMinimal = 0;
  let unmatchedLines: string[] = [];

  for (const line of lines) {
    // Try pattern 1: with time
    let m = line.match(lineWithTimeRegex);
    if (m) {
      const sequence = m[1].trim();
      const address = m[2].trim();
      const spxTn = m[4].replace(/;+$/, '').trim();

      if (address && spxTn && spxTn.length >= 6) {
        rows.push({
          colA: '',
          sequence,
          colC: '',
          spxTn,
          destinationAddress: address,
          colF: '',
          colG: '',
          colH: '',
          colI: '',
          colJ: '',
          extra: [],
          originalIndex: originalIndex++,
        });
        matchedWithTime++;
        continue;
      }
    }

    // Try pattern 2: without time but with address
    m = line.match(lineWithoutTimeRegex);
    if (m) {
      const sequence = m[1].trim();
      const remaining = m[2].trim();
      const spxTn = m[3].replace(/;+$/, '').trim();

      // The remaining part might be address + potential junk before SPX TN
      // Try to separate address from SPX TN
      const spxMatch = remaining.match(/^(.+?)\s+[A-Za-z0-9]{10,}$/);
      const address = spxMatch ? spxMatch[1].trim() : remaining.replace(/[A-Za-z0-9]{10,}$/, '').trim();

      if (spxTn && spxTn.length >= 10 && address.length > 5) {
        rows.push({
          colA: '',
          sequence,
          colC: '',
          spxTn,
          destinationAddress: address,
          colF: '',
          colG: '',
          colH: '',
          colI: '',
          colJ: '',
          extra: [],
          originalIndex: originalIndex++,
        });
        matchedWithoutTime++;
        continue;
      }
    }

    // Try pattern 3: minimal - just sequence and SPX TN
    m = line.match(minimalRegex);
    if (m) {
      const sequence = m[1].trim();
      const spxTn = m[2].replace(/;+$/, '').trim();

      if (spxTn && spxTn.length >= 10) {
        rows.push({
          colA: '',
          sequence,
          colC: '',
          spxTn,
          destinationAddress: '',
          colF: '',
          colG: '',
          colH: '',
          colI: '',
          colJ: '',
          extra: [],
          originalIndex: originalIndex++,
        });
        matchedMinimal++;
        continue;
      }
    }

    // Track unmatched lines for debugging
    if (line.length > 5 && /^\d/.test(line)) {
      unmatchedLines.push(line);
    }
  }

  // FALLBACK: If we still have no rows, try a more aggressive extraction from full text
  if (rows.length === 0) {
    console.warn('[PARSE PDF] No rows found with line patterns, trying global extraction...');

    // Pattern: Number followed by alphanumeric tracking code (6+ chars) ending with semicolon
    const globalPattern = /(\d+)\s+[^\d]*?([A-Za-z0-9]{10,})\s*;+/g;
    let match: RegExpExecArray | null;

    while ((match = globalPattern.exec(text)) !== null) {
      const sequence = match[1].trim();
      const spxTn = match[2].replace(/;+$/, '').trim();

      // Try to extract address between sequence and SPX TN
      const fullMatch = match[0];
      const addressPart = fullMatch
        .replace(sequence, '')
        .replace(spxTn, '')
        .replace(/[;:]/g, '')
        .replace(/\d{1,2}:\d{2}/g, '') // Remove time
        .trim();

      rows.push({
        colA: '',
        sequence,
        colC: '',
        spxTn,
        destinationAddress: addressPart,
        colF: '',
        colG: '',
        colH: '',
        colI: '',
        colJ: '',
        extra: [],
        originalIndex: originalIndex++,
      });
    }

    console.log('[PARSE PDF] Global extraction results', {
      rowsFromGlobalExtraction: rows.length,
    });
  }

  // Final fallback: Extract ANY tracking number pattern (6+ alphanumeric chars followed by semicolon)
  if (rows.length === 0) {
    console.warn('[PARSE PDF] Still no rows, trying tracking code extraction...');

    // Match any tracking code pattern: uppercase letters + numbers, 10+ chars, ending with semicolon
    const trackingPattern = /([A-Za-z0-9]{10,})\s*;+/g;
    let seq = 1;
    let match: RegExpExecArray | null;

    while ((match = trackingPattern.exec(text)) !== null) {
      const spxTn = match[1].replace(/;+$/, '').trim();

      // Skip if it looks like a date, time, or other non-tracking data
      if (/^\d+$/.test(spxTn) || /^\d{1,2}:\d{2}$/.test(spxTn)) continue;

      rows.push({
        colA: '',
        sequence: String(seq),
        colC: '',
        spxTn,
        destinationAddress: '',
        colF: '',
        colG: '',
        colH: '',
        colI: '',
        colJ: '',
        extra: [],
        originalIndex: originalIndex++,
      });
      seq++;
    }

    console.log('[PARSE PDF] Tracking code extraction results', {
      rowsFromTrackingExtraction: rows.length,
    });
  }

  const elapsed = performance.now() - parseStart;

  console.log('[PARSE PDF] Parse complete', {
    totalRowsFound: rows.length,
    matchedWithTime,
    matchedWithoutTime,
    matchedMinimal,
    unmatchedPatternLines: unmatchedLines.length,
    sampleUnmatched: unmatchedLines.slice(0, 3),
    processingTimeMs: elapsed.toFixed(2),
  });

  if (rows.length === 0) {
    console.error('[PARSE PDF] NO ROWS EXTRACTED - This will trigger "No orders found"');
    console.error('[PARSE PDF] Full extracted text (first 500 chars):', text.substring(0, 500));
  }

  return {
    rows,
    headers: ['#', 'Address', 'Estimated Arrival Time', 'Notes'],
  };
}
