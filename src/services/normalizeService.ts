import type { NormalizedAddress } from '../types';

const STREET_TYPE_MAP: Record<string, string> = {
  av: 'Avenida',
  ave: 'Avenida',
  avenida: 'Avenida',
  r: 'Rua',
  rua: 'Rua',
  al: 'Alameda',
  alameda: 'Alameda',
  pc: 'Praca',
  praca: 'Praca',
  tv: 'Travessa',
  travessa: 'Travessa',
  bd: 'Boulevard',
  blvd: 'Boulevard',
  boulevard: 'Boulevard',
};

const LOWERCASE_WORDS = new Set([
  'da',
  'de',
  'do',
  'das',
  'dos',
  'e',
]);

function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function cutAfterNumber(text: string): string {
  const match = text.match(/^(.*?)(\d+)\s*,/);
  if (match) {
    return `${match[1].trim()} ${match[2]}`.trim();
  }
  return text;
}

function removePunctuation(text: string): string {
  return text.replace(/[,.\/\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function expandStreetType(tokens: string[]): { type: string; rest: string[] } {
  if (tokens.length === 0) return { type: '', rest: tokens };

  const first = tokens[0].toLowerCase().replace(/\./g, '');
  const mapped = STREET_TYPE_MAP[first];

  if (mapped) {
    return { type: mapped, rest: tokens.slice(1) };
  }

  return { type: '', rest: tokens };
}

function extractNumber(tokens: string[]): { number: string; rest: string[] } {
  for (let i = 0; i < tokens.length; i++) {
    if (/^\d+$/.test(tokens[i])) {
      return {
        number: tokens[i],
        rest: [...tokens.slice(0, i), ...tokens.slice(i + 1)],
      };
    }
  }
  return { number: '', rest: tokens };
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  if (LOWERCASE_WORDS.has(word.toLowerCase())) {
    return word.toLowerCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(' ');
}

function processAddress(address: string): { type: string; streetName: string; number: string } {
  const noAccents = removeAccents(address);
  const cut = cutAfterNumber(noAccents);
  const cleaned = removePunctuation(cut);
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const { type, rest: afterType } = expandStreetType(tokens);
  const { number, rest: streetTokens } = extractNumber(afterType);

  return {
    type,
    streetName: streetTokens.join(' ').trim(),
    number,
  };
}

export function normalizeAddress(address: string): NormalizedAddress {
  const { type, streetName, number } = processAddress(address);

  const normalized = [type, streetName, number].filter(Boolean).join(' ').toLowerCase();

  return {
    normalized,
    streetType: type,
    streetName: streetName.toLowerCase(),
    number,
  };
}

export function buildOfficialAddress(address: string): string {
  const { type, streetName, number } = processAddress(address);

  const streetNameTitle = titleCase(streetName);
  const typeCapitalized = type ? capitalizeWord(type) : '';

  const parts = [typeCapitalized, streetNameTitle, number].filter(Boolean);
  return parts.join(' ');
}
