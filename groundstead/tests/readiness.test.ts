import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES } from '../lib/i18n/locales.ts';
import { MODULES } from '../lib/content/modules.ts';
import {
  INTERESTS,
  PILLARS,
  PILLAR_MODULE,
  QUESTIONS,
  REASON_QUESTION,
  computeResult,
  type Answers,
} from '../lib/readiness/model.ts';
import { READINESS, type ReadinessText } from '../lib/readiness/text.ts';
import { elements, readOut, visibleText } from './helpers.ts';

// Every question answered with its first option (value 0), or its last option (value 3).
function uniform(pick: 'first' | 'last', reason = 'power'): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of QUESTIONS) answers[q.id] = pick === 'first' ? q.options[0]!.key : q.options[q.options.length - 1]!.key;
  answers[REASON_QUESTION] = reason;
  return answers;
}

function allStrings(t: ReadinessText): string[] {
  const out = [
    t.title, t.intro, t.scoreNote, t.planningAid, ...Object.values(t.themes), ...t.risks, t.interestHeading,
    t.interestNote, t.interestSystem, t.scoresHeading, t.scoreLabel, t.nextHeading, t.noLowNote, t.cityHeading,
    t.cityText, t.cityLink, t.risksTitle, t.submit, t.save, t.clear, t.incomplete, t.saved, t.cleared, t.noStorage,
    ...Object.values(t.interest),
  ];
  for (const q of Object.values(t.questions)) out.push(q.prompt, ...Object.values(q.options));
  for (const p of Object.values(t.pillars)) out.push(p.name, p.sentence, p.low, p.step, p.module);
  return out;
}

test('GT21 the check has twelve questions, ten of them score a pillar, and every pillar has a scored question', () => {
  assert.equal(QUESTIONS.length, 12);
  const scored = QUESTIONS.filter((q) => q.pillar !== null);
  assert.equal(scored.length, 10);
  for (const p of PILLARS) assert.ok(scored.some((q) => q.pillar === p), `${p} has a scored question`);
});

test('GT21 every scored question has four options worth 0 to 3, and the other questions score nothing', () => {
  for (const q of QUESTIONS) {
    if (q.pillar === null) {
      assert.ok(q.options.every((o) => o.value === 0), `${q.id} scores nothing`);
    } else {
      assert.deepEqual(q.options.map((o) => o.value), [0, 1, 2, 3], `${q.id} runs from 0 to 3`);
    }
  }
});

test('GT21 a complete check gives each of the seven pillars a score from 0 to 100, and no single overall grade', () => {
  const low = computeResult(uniform('first'));
  const high = computeResult(uniform('last'));
  assert.ok(low.complete && high.complete);
  if (!low.complete || !high.complete) return;
  for (const p of PILLARS) {
    assert.equal(low.scores[p], 0);
    assert.equal(high.scores[p], 100);
  }
  assert.deepEqual(Object.keys(high).sort(), ['complete', 'interest', 'low', 'scores'], 'the result carries no overall grade');
  assert.deepEqual(Object.keys(high.scores).sort(), [...PILLARS].sort());
});

test('GT21 one answer moves only the pillar it belongs to', () => {
  const answers = { ...uniform('last'), q08: 'no' };
  const r = computeResult(answers);
  assert.ok(r.complete);
  if (!r.complete) return;
  assert.equal(r.scores.water, 0);
  for (const p of PILLARS.filter((x) => x !== 'water')) assert.equal(r.scores[p], 100, `${p} is unchanged`);
});

test('GT21 a partly answered check reports what is missing and gives no scores', () => {
  const partial = { q01: QUESTIONS[0]!.options[1]!.key };
  const result = computeResult(partial);
  assert.equal(result.complete, false);
  if (!result.complete) assert.equal(result.missing.length, 11);
});

test('GT21 the interest label is "not concerned yet" when no worry is named, "especially concerned" when three or more pillars are low, and "concerned" otherwise', () => {
  const none = computeResult(uniform('first', 'none'));
  assert.ok(none.complete);
  if (none.complete) assert.equal(none.interest, 'unconcerned');

  const manyLow = computeResult(uniform('first', 'power'));
  assert.ok(manyLow.complete);
  if (manyLow.complete) {
    assert.equal(manyLow.interest, 'high');
    assert.equal(manyLow.low.length, 7);
  }

  const one = computeResult({ ...uniform('last', 'flood'), q08: 'no' });
  assert.ok(one.complete);
  if (one.complete) {
    assert.equal(one.interest, 'concerned');
    assert.deepEqual(one.low, ['water']);
  }
  assert.deepEqual([...INTERESTS], ['unconcerned', 'concerned', 'high']);
});

test('GT21 every low pillar gets a next step, in pillar order, and high pillars get none', () => {
  const r = computeResult({ ...uniform('last', 'flood'), q08: 'no', q09: 'no' });
  assert.ok(r.complete);
  if (r.complete) assert.deepEqual(r.low, ['water', 'energy']);
});

test('GT21 every pillar points at a planned module that exists in the module list', () => {
  for (const p of PILLARS) {
    assert.ok((MODULES as readonly string[]).includes(PILLAR_MODULE[p]), `${p} -> ${PILLAR_MODULE[p]}`);
  }
});

test('GT21 the English and Vietnamese texts have the same questions, options, pillars, risks and interest labels', () => {
  const en = READINESS.en;
  const vi = READINESS.vi;
  assert.deepEqual(Object.keys(vi.questions).sort(), Object.keys(en.questions).sort());
  for (const q of QUESTIONS) {
    const keys = q.options.map((o) => o.key).sort();
    assert.deepEqual(Object.keys(en.questions[q.id]!.options).sort(), keys, `${q.id} options in en`);
    assert.deepEqual(Object.keys(vi.questions[q.id]!.options).sort(), keys, `${q.id} options in vi`);
  }
  assert.deepEqual(Object.keys(vi.pillars).sort(), [...PILLARS].sort());
  assert.equal(vi.risks.length, en.risks.length);
  assert.deepEqual(Object.keys(vi.interest).sort(), [...INTERESTS].sort());
});

test('GT21 no copy is a verdict, a guarantee, or a claim that a place is safe', () => {
  const verdict = /\byou are (not )?(ready|unprepared)\b|\bbạn (đã|chưa) sẵn sàng\b/i;
  const claim = /guaranteed|100% safe|will keep you safe|đảm bảo an toàn|an toàn tuyệt đối|nơi này an toàn/i;
  for (const locale of LOCALES) {
    for (const s of allStrings(READINESS[locale])) {
      assert.doesNotMatch(s, verdict, s);
      assert.doesNotMatch(s, claim, s);
    }
  }
});

for (const locale of LOCALES) {
  test(`GT21 ${locale} readiness page is static HTML with one h1, one form, twelve question groups and the honest risks`, () => {
    const html = readOut(`${locale}/readiness/index.html`);
    const text = visibleText(html);
    const t = READINESS[locale];
    assert.equal(elements(html, 'h1').length, 1);
    assert.equal(elements(html, 'form').length, 1, 'one form');
    assert.equal(elements(html, 'legend').length, 12, 'twelve question groups');
    for (const q of QUESTIONS) assert.ok(text.includes(t.questions[q.id]!.prompt), `${q.id} is shown`);
    assert.ok(text.includes(t.planningAid), 'the planning-aid notice is shown');
    assert.ok(text.includes(t.scoreNote), 'the per-pillar note is shown');
    for (const risk of t.risks) assert.ok(text.includes(risk), `risk shown: ${risk}`);
  });
}
