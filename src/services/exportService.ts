import * as XLSX from 'xlsx';
import type { RawRow, DeliveryGroup, CheckState } from '../types';

export type ExportMode = 'checked' | 'full';

export function exportXlsx(
  rows: RawRow[],
  groups: DeliveryGroup[],
  headers: string[],
  checkState: CheckState,
  mode: ExportMode,
): void {
  const exportedRows: string[][] = [];

  if (mode === 'checked') {
    groups.forEach((group) => {
      const allChecked = group.spxTns.every((spx) => checkState.checked[spx]);
      if (!allChecked) return;

      const row = rows[group.primaryRowIndex];
      const newAddress = group.officialAddress || row.destinationAddress;

      exportedRows.push([
        row.colA,
        group.generatedSequence,
        row.colC,
        row.spxTn,
        newAddress,
        row.colF,
        row.colG,
        row.colH,
        row.colI,
        row.colJ,
        ...row.extra,
      ]);
    });
  } else {
    groups.forEach((group) => {
      const row = rows[group.primaryRowIndex];
      const allChecked = group.spxTns.every((spx) => checkState.checked[spx]);

      const newSequence = allChecked ? group.generatedSequence : row.sequence;
      const newAddress = group.officialAddress || row.destinationAddress;

      exportedRows.push([
        row.colA,
        newSequence,
        row.colC,
        row.spxTn,
        newAddress,
        row.colF,
        row.colG,
        row.colH,
        row.colI,
        row.colJ,
        ...row.extra,
      ]);
    });
  }

  const sheetData = [headers, ...exportedRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Entregas');

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dateStr = `${day}_${month}`;

  const fileName =
    mode === 'checked'
      ? `Romaneio_${dateStr}.xlsx`
      : `RomaneioFlex_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
