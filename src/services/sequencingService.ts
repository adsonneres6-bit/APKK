import type { DeliveryGroup, RawRow } from '../types';

/**
 * Atribui sequências aos grupos.
 * Quando useOriginalSequence=true, a sequência gerada usa os números originais
 * de cada linha do grupo, separados por vírgula (ex: "1, 2").
 * Grupos com um único pedido ficam apenas com o número original (ex: "3").
 */
export function assignSequences(
  groups: DeliveryGroup[],
  rows?: RawRow[],
  useOriginalSequence = false,
): DeliveryGroup[] {
  const sorted = [...groups].sort((a, b) => {
    if (a.primaryRowIndex !== b.primaryRowIndex) {
      return a.primaryRowIndex - b.primaryRowIndex;
    }
    return 0;
  });

  let seqBase = 1;
  return sorted.map((group) => {
    const count = group.spxTns.length;
    const letters = Array(count).fill('+');

    let generatedSequence: string;

    if (useOriginalSequence && rows && rows.length > 0) {
      // Usa as sequências originais de cada linha do grupo, separadas por vírgula
      const originalSeqs = group.rowIndices
        .map((idx) => rows[idx]?.sequence ?? '')
        .filter(Boolean);

      if (originalSeqs.length > 0) {
        generatedSequence = originalSeqs.join(', ');
      } else {
        generatedSequence = count === 1 ? String(seqBase) : `${seqBase}`;
      }
    } else {
      generatedSequence = String(seqBase);
    }

    // sequenceBase = número da primeira linha (para compatibilidade)
    let base = seqBase;
    if (useOriginalSequence && rows && rows.length > 0) {
      const parsed = parseInt(rows[group.primaryRowIndex]?.sequence ?? '', 10);
      if (!isNaN(parsed)) base = parsed;
    }

    const updated = {
      ...group,
      sequenceBase: base,
      sequenceLetters: letters,
      generatedSequence,
    };

    seqBase += 1;
    return updated;
  });
}
