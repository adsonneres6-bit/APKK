import type { RawRow, DeliveryGroup, SearchResult } from '../types';

export function search(
  query: string,
  rows: RawRow[],
  groups: DeliveryGroup[],
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const spxToGroup = new Map<string, number>();
  groups.forEach((g, i) => {
    g.spxTns.forEach((spx) => spxToGroup.set(spx, i));
  });

  rows.forEach((row) => {
    const spx = row.spxTn.toLowerCase();
    const addr = row.destinationAddress.toLowerCase();

    let matched = false;
    let groupIndex = -1;

    if (spx === q) {
      matched = true;
      groupIndex = spxToGroup.get(row.spxTn) ?? -1;
    } else if (spx && spx.includes(q)) {
      matched = true;
      groupIndex = spxToGroup.get(row.spxTn) ?? -1;
    } else if (addr.includes(q)) {
      matched = true;
      groupIndex = spxToGroup.get(row.spxTn) ?? -1;
    }

    if (matched) {
      results.push({
        row,
        group: groupIndex >= 0 ? groups[groupIndex] : undefined,
        groupIndex,
      });
    }
  });

  return results;
}
