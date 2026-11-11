import type { RawRow, DeliveryGroup, NormalizedAddress } from '../types';
import { normalizeAddress, buildOfficialAddress } from './normalizeService';
import { isSameAddress } from './similarityService';

export interface PotentialGroup {
  address: string;
  officialAddress: string;
  count: number;
  sequences: string[];
  spxTns: string[];
  rowIndices: number[];
}

/**
 * Detecta endereços que aparecem em mais de um pedido.
 * Retorna apenas grupos com 2+ pedidos no mesmo endereço.
 */
export function detectPotentialGroups(rows: RawRow[]): PotentialGroup[] {
  const normalizedMap = new Map<number, NormalizedAddress>();
  rows.forEach((row, i) => {
    normalizedMap.set(i, normalizeAddress(row.destinationAddress));
  });

  const groupOf = new Array(rows.length).fill(-1);
  const groups: PotentialGroup[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (groupOf[i] !== -1) continue;
    const normI = normalizedMap.get(i)!;
    if (!normI.number) {
      groupOf[i] = -2;
      continue;
    }

    const indices: number[] = [i];
    groupOf[i] = groups.length;

    for (let j = i + 1; j < rows.length; j++) {
      if (groupOf[j] !== -1) continue;
      const normJ = normalizedMap.get(j)!;
      if (!normJ.number) {
        groupOf[j] = -2;
        continue;
      }
      if (isSameAddress(normI, normJ)) {
        indices.push(j);
        groupOf[j] = groups.length;
      }
    }

    if (indices.length > 1) {
      groups.push({
        address: normI.normalized,
        officialAddress: chooseOfficialAddress(rows, indices),
        count: indices.length,
        sequences: indices.map((idx) => rows[idx].sequence).filter(Boolean),
        spxTns: indices.map((idx) => rows[idx].spxTn).filter(Boolean),
        rowIndices: indices,
      });
    }
  }

  return groups;
}

function chooseOfficialAddress(rows: RawRow[], indices: number[]): string {
  const addresses = indices.map((i) => rows[i].destinationAddress).filter(Boolean);
  if (addresses.length === 0) return '';

  const normalized = addresses.map((a) => normalizeAddress(a));

  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < normalized.length; i++) {
    const n = normalized[i];
    const streetWordCount = n.streetName.split(/\s+/).filter(Boolean).length;
    const hasType = n.streetType ? 1 : 0;
    const hasNumber = n.number ? 1 : 0;
    const score = streetWordCount * 2 + hasType + hasNumber;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return buildOfficialAddress(addresses[bestIdx]);
}

export function groupDeliveries(rows: RawRow[]): DeliveryGroup[] {
  return groupDeliveriesWithOptions(rows, true);
}

/**
 * Agrupa as entregas.
 * Quando groupingEnabled=true, pedidos no mesmo endereço são unificados em um grupo.
 * Quando groupingEnabled=false, cada pedido vira seu próprio grupo (sem unificação).
 */
export function groupDeliveriesWithOptions(
  rows: RawRow[],
  groupingEnabled: boolean,
): DeliveryGroup[] {
  if (!groupingEnabled) {
    return rows.map((row, i) => {
      const norm = normalizeAddress(row.destinationAddress);
      return {
        id: `group-${i}`,
        officialAddress: row.destinationAddress,
        normalizedAddress: norm.normalized,
        number: norm.number,
        streetName: norm.streetName,
        rowIndices: [i],
        spxTns: [row.spxTn].filter(Boolean),
        sequences: [row.sequence].filter(Boolean),
        primaryRowIndex: i,
        generatedSequence: '',
        sequenceBase: 0,
        sequenceLetters: [],
        allChecked: false,
        completed: false,
      };
    });
  }

  const normalizedMap = new Map<number, NormalizedAddress>();
  rows.forEach((row, i) => {
    normalizedMap.set(i, normalizeAddress(row.destinationAddress));
  });

  const groupOf = new Array(rows.length).fill(-1);
  const groups: DeliveryGroup[] = [];

  for (let i = 0; i < rows.length; i++) {
    if (groupOf[i] !== -1) continue;
    const normI = normalizedMap.get(i)!;
    if (!normI.number) {
      groupOf[i] = -2;
      continue;
    }

    const groupIndex = groups.length;
    const indices: number[] = [i];
    groupOf[i] = groupIndex;

    for (let j = i + 1; j < rows.length; j++) {
      if (groupOf[j] !== -1) continue;
      const normJ = normalizedMap.get(j)!;
      if (!normJ.number) {
        groupOf[j] = -2;
        continue;
      }

      if (isSameAddress(normI, normJ)) {
        indices.push(j);
        groupOf[j] = groupIndex;
      }
    }

    const spxTns = indices.map((idx) => rows[idx].spxTn).filter(Boolean);
    const sequences = indices.map((idx) => rows[idx].sequence).filter(Boolean);
    const officialAddress = chooseOfficialAddress(rows, indices);

    groups.push({
      id: `group-${groupIndex}`,
      officialAddress,
      normalizedAddress: normI.normalized,
      number: normI.number,
      streetName: normI.streetName,
      rowIndices: indices,
      spxTns,
      sequences,
      primaryRowIndex: indices[0],
      generatedSequence: '',
      sequenceBase: 0,
      sequenceLetters: [],
      allChecked: false,
      completed: false,
    });
  }

  rows.forEach((_, i) => {
    if (groupOf[i] === -2) {
      const groupIndex = groups.length;
      groups.push({
        id: `group-${groupIndex}`,
        officialAddress: rows[i].destinationAddress,
        normalizedAddress: normalizedMap.get(i)!.normalized,
        number: '',
        streetName: normalizedMap.get(i)!.streetName,
        rowIndices: [i],
        spxTns: [rows[i].spxTn].filter(Boolean),
        sequences: [rows[i].sequence].filter(Boolean),
        primaryRowIndex: i,
        generatedSequence: '',
        sequenceBase: 0,
        sequenceLetters: [],
        allChecked: false,
        completed: false,
      });
    }
  });

  return groups;
}
