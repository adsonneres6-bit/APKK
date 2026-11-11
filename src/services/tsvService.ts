const TSV_MIME = 'text/tab-separated-values;charset=utf-8';

function escapeTsvField(value: string): string {
  if (!/[\t\r\n"]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function createTsvBlob(headers: string[], rows: string[][]): Blob {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeTsvField(cell ?? '')).join('\t'),
  );
  return new Blob([lines.join('\n')], { type: TSV_MIME });
}
