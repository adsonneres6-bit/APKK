import type { NormalizedAddress } from '../types';

export function isSameAddress(
  addrA: NormalizedAddress,
  addrB: NormalizedAddress,
): boolean {
  if (!addrA.number || !addrB.number) return false;
  if (addrA.number !== addrB.number) return false;

  return addrA.streetName === addrB.streetName;
}
