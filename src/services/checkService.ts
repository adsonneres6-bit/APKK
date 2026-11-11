import type { DeliveryGroup, CheckState, RawRow } from '../types';

function buildIndividualSequence(
  group: DeliveryGroup,
  spxTn: string,
  rows?: RawRow[],
): string {
  if (group.spxTns.length === 1) return String(group.sequenceBase);
  // Retorna a sequência original da linha específica dentro do grupo
  const idx = group.spxTns.indexOf(spxTn);
  if (idx >= 0 && rows && rows.length > 0) {
    const rowIdx = group.rowIndices[idx];
    const seq = rows[rowIdx]?.sequence ?? '';
    if (seq) return seq;
  }
  return `${group.sequenceBase}${group.sequenceLetters[idx] ?? ''}`;
}

export function createCheckState(groups: DeliveryGroup[]): CheckState {
  const checked: Record<string, boolean> = {};
  const spxToGroup: Record<string, number> = {};

  groups.forEach((group, gIndex) => {
    group.spxTns.forEach((spx) => {
      checked[spx] = false;
      spxToGroup[spx] = gIndex;
    });
  });

  return { checked, spxToGroup };
}

export type CheckResult =
  | { status: 'not_found' }
  | { status: 'already_checked'; group: DeliveryGroup; spxTn: string; individualSequence: string }
  | { status: 'success'; group: DeliveryGroup; groupNowComplete: boolean; spxTn: string; individualSequence: string };

export function checkSpxTn(
  spxTn: string,
  state: CheckState,
  groups: DeliveryGroup[],
  rows?: RawRow[],
): CheckResult {
  const groupIndex = state.spxToGroup[spxTn];

  if (groupIndex === undefined) {
    return { status: 'not_found' };
  }

  if (state.checked[spxTn]) {
    const group = groups[groupIndex];
    const individualSequence = buildIndividualSequence(group, spxTn, rows);
    return { status: 'already_checked', group, spxTn, individualSequence };
  }

  state.checked[spxTn] = true;
  const group = groups[groupIndex];

  const individualSequence = buildIndividualSequence(group, spxTn, rows);

  const allChecked = group.spxTns.every((spx) => state.checked[spx]);
  if (allChecked) {
    group.allChecked = true;
    group.completed = true;
  }

  return {
    status: 'success',
    group,
    groupNowComplete: allChecked,
    spxTn,
    individualSequence,
  };
}

export function getCheckedCount(state: CheckState): number {
  return Object.values(state.checked).filter(Boolean).length;
}

export function getTotalCount(state: CheckState): number {
  return Object.keys(state.checked).length;
}
