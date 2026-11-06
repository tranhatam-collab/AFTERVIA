// Readiness check (GS-016): 12 questions, seven pillars, a score per pillar and an interest label.
// Pure functions only, so the same code runs in the browser and in the tests. Nothing here sends data anywhere.

export const PILLARS = ['water', 'energy', 'food', 'shelter', 'health', 'money', 'community'] as const;
export type Pillar = (typeof PILLARS)[number];

export const THEMES = ['money', 'health', 'family', 'skills', 'reason'] as const;
export type Theme = (typeof THEMES)[number];

export type Option = { key: string; value: 0 | 1 | 2 | 3 };
export type Question = { id: string; theme: Theme; pillar: Pillar | null; options: readonly Option[] };

// Scored questions give 0 (first option) to 3 (last option). Questions with pillar null score nothing.
const scored = (...keys: string[]): Option[] => keys.map((key, i) => ({ key, value: i as 0 | 1 | 2 | 3 }));
const unscored = (...keys: string[]): Option[] => keys.map((key) => ({ key, value: 0 as const }));

export const QUESTIONS: readonly Question[] = [
  { id: 'q01', theme: 'money', pillar: 'money', options: scored('under1', 'm1to3', 'm3to6', 'over6') },
  { id: 'q02', theme: 'money', pillar: 'money', options: scored('none', 'one', 'two', 'three') },
  { id: 'q03', theme: 'health', pillar: 'health', options: scored('no', 'heard', 'course', 'practice') },
  { id: 'q04', theme: 'health', pillar: 'health', options: scored('far', 'outside', 'inside', 'walk') },
  { id: 'q05', theme: 'family', pillar: null, options: unscored('none', 'kids_elderly', 'disability_pets', 'several') },
  { id: 'q06', theme: 'family', pillar: 'community', options: scored('none', 'one', 'few', 'many') },
  { id: 'q07', theme: 'skills', pillar: 'community', options: scored('no', 'some', 'saved', 'checked') },
  { id: 'q08', theme: 'skills', pillar: 'water', options: scored('no', 'little', 'days', 'sized') },
  { id: 'q09', theme: 'skills', pillar: 'energy', options: scored('no', 'batteries', 'charged', 'system') },
  { id: 'q10', theme: 'skills', pillar: 'food', options: scored('no', 'few', 'days', 'list') },
  { id: 'q11', theme: 'skills', pillar: 'shelter', options: scored('not_yet', 'partly', 'some', 'full') },
  { id: 'q12', theme: 'reason', pillar: null, options: unscored('none', 'power', 'flood', 'heat', 'income', 'health', 'other') },
];

// The reason question. Answering 'none' means no particular worry, which gives the "unconcerned" label.
export const REASON_QUESTION = 'q12';

// A pillar below this score is "low" and gets a next step. Design default, pending the owner's review (D-27).
export const LOW_SCORE = 40;

// Interest label, computed from the reason question and the number of low pillars. Never shown as a grade.
export type Interest = 'unconcerned' | 'concerned' | 'high';
export const INTERESTS: readonly Interest[] = ['unconcerned', 'concerned', 'high'];

// Each pillar points at the planned module that would help with it (ids from lib/content/modules.ts).
export const PILLAR_MODULE: Record<Pillar, string> = {
  water: 'water',
  energy: 'power',
  food: 'food',
  shelter: 'shelter',
  health: 'health',
  money: 'fund',
  community: 'community',
};

export type Answers = Readonly<Record<string, string>>;

export type Result =
  | { complete: false; missing: string[] }
  | { complete: true; scores: Record<Pillar, number>; interest: Interest; low: Pillar[] };

function optionValue(question: Question, key: string): number {
  const option = question.options.find((o) => o.key === key);
  if (!option) throw new Error(`no option ${key} for ${question.id}`);
  return option.value;
}

export function computeResult(answers: Answers): Result {
  const missing = QUESTIONS.filter((q) => !q.options.some((o) => o.key === answers[q.id])).map((q) => q.id);
  if (missing.length > 0) return { complete: false, missing };

  const scores = {} as Record<Pillar, number>;
  for (const pillar of PILLARS) {
    const values = QUESTIONS.filter((q) => q.pillar === pillar).map((q) => optionValue(q, answers[q.id] as string));
    scores[pillar] = Math.round((values.reduce((sum, v) => sum + v, 0) / (values.length * 3)) * 100);
  }
  const low = PILLARS.filter((p) => scores[p] < LOW_SCORE);
  const interest: Interest =
    answers[REASON_QUESTION] === 'none' ? 'unconcerned' : low.length >= 3 ? 'high' : 'concerned';
  return { complete: true, scores, interest, low };
}
