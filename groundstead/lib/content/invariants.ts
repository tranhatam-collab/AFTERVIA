// Translation invariants for safety cards (GS-033, GT05). A translation must keep the digits, the units attached to
// them, the negations and the names of its original. The checks are literal on purpose: a mismatch is reported for a
// person to decide, never fixed silently. A name may be translated on purpose only when content/translation-exceptions.json
// lists it, with the reason and the phrase the translation uses.
import type { Card } from './types.ts';

export type InvariantFields = { title: string; first_action: string; avoid: string[]; steps: string[]; limits: string };

// One reviewed exception: in `field` of card `card`, the original's name `term` may be translated as `vi`, for `reason`.
export type Exception = { card: string; field: string; term: string; vi: string; reason: string };

export function fieldsOf(card: Card): InvariantFields {
  return { title: card.title, first_action: card.first_action, avoid: card.avoid, steps: card.steps, limits: card.limits };
}

// Digit groups, sorted. "1,000" and "1.000" both give 000 and 1; "+1 (800) 555-0100" and "+1 800 555 0100" give the
// same groups. So formatting differences do not count, but a changed digit does.
export function digitGroups(text: string): string[] {
  return (text.normalize('NFC').match(/\d+/g) ?? []).sort();
}

// Unit words that keep their meaning across the two languages, mapped to one shared name. Keys are lower case.
const UNITS: Record<string, string> = {
  inch: 'inch',
  inches: 'inch',
  ft: 'ft',
  foot: 'ft',
  feet: 'ft',
  mile: 'mile',
  miles: 'mile',
  mph: 'mph',
  km: 'km',
  m: 'm',
  meter: 'm',
  meters: 'm',
  cm: 'cm',
  mm: 'mm',
  hour: 'hour',
  hours: 'hour',
  giờ: 'hour',
  minute: 'minute',
  minutes: 'minute',
  phút: 'minute',
  day: 'day',
  days: 'day',
  ngày: 'day',
  week: 'week',
  weeks: 'week',
  tuần: 'week',
  '%': 'percent',
  percent: 'percent',
  '°f': 'F',
  '°c': 'C',
};

// Each number with the word or symbol right after it ('' when that is not a unit): "103°F" gives 103|F, "90s" gives 90|.
export function numberUnits(text: string): string[] {
  const pairs: string[] = [];
  for (const match of text.normalize('NFC').matchAll(/(\d+)\s*(°\s*[FCfc]|%|\p{L}+)?/gu)) {
    const word = (match[2] ?? '').replace(/\s+/g, '').toLowerCase();
    pairs.push(`${match[1]}|${UNITS[word] ?? ''}`);
  }
  return pairs.sort();
}

// Negation words. English: not, never, no, nor, cannot, can't, don't, without. Vietnamese: không, chớ, đừng, chưa,
// chẳng, tránh, thiếu. Each occurrence counts once; "do not" counts one, "không bao giờ" counts one.
const NEGATION = {
  en: /(?<!\p{L})(?:not|never|no|nor|cannot|can['’]t|don['’]t|without)(?!\p{L})/giu,
  vi: /(?<!\p{L})(?:không|chớ|đừng|chưa|chẳng|tránh|thiếu)(?!\p{L})/giu,
};

export function negationCount(text: string, language: 'en' | 'vi'): number {
  return (text.normalize('NFC').match(NEGATION[language]) ?? []).length;
}

// Names in an original: runs of capitalised words that do not open a sentence ("NOAA Weather Radio", "All Clear", "TV").
// The first word of a sentence is capitalised by grammar, so it is not a name.
export function nameTerms(text: string): string[] {
  const terms = new Set<string>();
  for (const sentence of text.normalize('NFC').split(/(?<=[.!?])\s+/)) {
    for (const match of sentence.matchAll(/[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*/g)) {
      if (match.index !== 0) terms.add(match[0]);
    }
  }
  return [...terms].sort();
}

const same = (a: string[], b: string[]): boolean => a.length === b.length && a.every((value, i) => value === b[i]);

// Problems with one field of the original and its translation. The title keeps numbers and units only; a headline
// has no negations, and its words are translated.
function fieldProblems(field: string, en: string, vi: string, exceptions: Exception[], body: boolean): string[] {
  const problems: string[] = [];
  const numbersEn = digitGroups(en);
  const numbersVi = digitGroups(vi);
  if (!same(numbersEn, numbersVi)) {
    problems.push(`${field}: numbers differ (${numbersEn.join(' ') || 'none'} in the original, ${numbersVi.join(' ') || 'none'} in the translation)`);
  }
  if (!same(numberUnits(en), numberUnits(vi))) problems.push(`${field}: a number and its unit differ`);
  if (!body) return problems;
  const negationsEn = negationCount(en, 'en');
  const negationsVi = negationCount(vi, 'vi');
  if (negationsEn !== negationsVi) {
    problems.push(`${field}: the original has ${negationsEn} negation(s), the translation ${negationsVi}`);
  }
  const translation = vi.normalize('NFC');
  for (const term of nameTerms(en)) {
    if (translation.includes(term)) continue;
    const excepted = exceptions.some((e) => e.field === field && e.term === term && translation.includes(e.vi));
    if (!excepted) problems.push(`${field}: "${term}" is missing from the translation`);
  }
  return problems;
}

// All problems of one translation against its original. An empty list means the translation keeps the invariants.
export function invariantProblems(original: InvariantFields, translation: InvariantFields, exceptions: Exception[] = []): string[] {
  const problems: string[] = [];
  if (original.avoid.length !== translation.avoid.length) {
    problems.push(`avoid: ${original.avoid.length} item(s) in the original, ${translation.avoid.length} in the translation`);
  }
  if (original.steps.length !== translation.steps.length) {
    problems.push(`steps: ${original.steps.length} item(s) in the original, ${translation.steps.length} in the translation`);
  }
  problems.push(...fieldProblems('title', original.title, translation.title, exceptions, false));
  problems.push(...fieldProblems('first_action', original.first_action, translation.first_action, exceptions, true));
  problems.push(...fieldProblems('limits', original.limits, translation.limits, exceptions, true));
  original.avoid.forEach((en, i) => {
    const vi = translation.avoid[i];
    if (vi !== undefined) problems.push(...fieldProblems(`avoid[${i}]`, en, vi, exceptions, true));
  });
  original.steps.forEach((en, i) => {
    const vi = translation.steps[i];
    if (vi !== undefined) problems.push(...fieldProblems(`steps[${i}]`, en, vi, exceptions, true));
  });
  return problems;
}
