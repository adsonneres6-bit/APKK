import { buildOfficialAddress } from './normalizeService';
import {
  readXlsxByHeaders,
  findColumnIndices,
} from './xlsxReaderService';
import { createTsvBlob } from './tsvService';
import { groupDeliveriesWithOptions } from './groupingService';
import type { RawRow } from '../types';

export interface AddressOptimizeResult {
  processedCount: number;
  outputFileName: string;
  blob: Blob;
  totalOrders: number;
  totalStops: number;
}

export async function optimizeAddressesFile(file: File): Promise<AddressOptimizeResult> {
  const startTime = performance.now();
  console.log('[ADDRESS OPTIMIZER] Starting optimization', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)} KB`,
  });

  const { headers, rows } = await readXlsxByHeaders(file);

  if (rows.length === 0) {
    console.warn('[ADDRESS OPTIMIZER] No rows found, returning empty');
    return { processedCount: 0, outputFileName: '', blob: new Blob(), totalOrders: 0, totalStops: 0 };
  }

  const indices = findColumnIndices(headers);
  console.log('[ADDRESS OPTIMIZER] Column indices found', {
    headers,
    indices,
  });

  if (indices.destinationAddress === -1) {
    throw new Error(
      'Coluna de endereço não encontrada. Verifique se a planilha possui um cabeçalho de endereço (ex: "Destination Address", "Endereco").',
    );
  }

  let processedCount = 0;
  let unchangedCount = 0;
  let alreadyCorrectCount = 0;

  const optimizedRows = rows.map((row) => {
    const addressCell = row[indices.destinationAddress]?.trim();

    if (addressCell) {
      const optimized = buildOfficialAddress(addressCell);
      if (optimized && optimized !== addressCell) {
        row[indices.destinationAddress] = optimized;
        processedCount++;
      } else if (optimized) {
        row[indices.destinationAddress] = optimized;
        alreadyCorrectCount++;
      } else {
        unchangedCount++;
      }
    } else {
      unchangedCount++;
    }

    return row;
  });

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const outputFileName = `Rota_${day}-${month}.tsv`;

  const blob = createTsvBlob(headers, optimizedRows);

  // Same equivalence criteria as the Flex scanner (groupingService), applied
  // to the optimized rows for statistics only — no order is removed or merged.
  const statsRows: RawRow[] = optimizedRows.map((row, i) => ({
    colA: '',
    sequence: indices.sequence >= 0 ? row[indices.sequence] : '',
    colC: '',
    spxTn: indices.spxTn >= 0 ? row[indices.spxTn] : '',
    destinationAddress: row[indices.destinationAddress],
    colF: '',
    colG: '',
    colH: '',
    colI: '',
    colJ: '',
    extra: [],
    originalIndex: i,
  }));
  const totalStops = groupDeliveriesWithOptions(statsRows, true).length;

  const elapsed = performance.now() - startTime;
  console.log('[ADDRESS OPTIMIZER] Optimization complete', {
    totalRows: rows.length,
    processedCount,
    alreadyCorrectCount,
    unchangedCount,
    outputFileName,
    processingTimeMs: elapsed.toFixed(2),
  });

  return { processedCount, outputFileName, blob, totalOrders: rows.length, totalStops };
}
