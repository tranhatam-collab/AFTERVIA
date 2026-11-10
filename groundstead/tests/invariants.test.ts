import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  digitGroups,
  invariantProblems,
  nameTerms,
  negationCount,
  numberUnits,
  type Exception,
  type InvariantFields,
} from '../lib/content/invariants.ts';
import { DEFAULT_CONTENT_DIR, validateContent } from '../lib/content/validate.ts';

const original: InvariantFields = {
  title: 'Flood safety',
  first_action: 'Leave right away.',
  avoid: ['Do not drive through 12 inches of water.'],
  steps: ['Stay informed. Listen to radio and TV, including NOAA Weather Radio if possible.', 'Call 911.'],
  limits: 'It is not an official NWS publication.',
};

const faithful: InvariantFields = {
  title: 'An toàn khi có lũ lụt',
  first_action: 'Hãy rời đi ngay lập tức.',
  avoid: ['Không lái xe qua 12 inch nước.'],
  steps: ['Theo dõi thông tin. Nghe đài phát thanh và truyền hình, kể cả NOAA Weather Radio nếu có thể.', 'Gọi 911.'],
  limits: 'Đây không phải là ấn phẩm chính thức của NWS.',
};

const tvException: Exception = {
  card: 'flood-safety',
  field: 'steps[0]',
  term: 'TV',
  vi: 'truyền hình',
  reason: 'test fixture',
};

test('GT05 a faithful translation has no problems; a name translated on purpose needs its listed exception', () => {
  assert.deepEqual(invariantProblems(original, faithful, [tvException]), []);
  assert.deepEqual(invariantProblems(original, faithful, []), ['steps[0]: "TV" is missing from the translation']);
});

test('GT05 a changed number, a converted unit, or a dropped negation is reported', () => {
  const changedNumber = { ...faithful, avoid: ['Không lái xe qua 15 inch nước.'] };
  assert.ok(
    invariantProblems(original, changedNumber, [tvException]).some((p) => p.startsWith('avoid[0]: numbers differ')),
    'a changed number',
  );
  const converted = { ...faithful, avoid: ['Không lái xe qua 30 cm nước.'] };
  assert.ok(
    invariantProblems(original, converted, [tvException]).some((p) => p.startsWith('avoid[0]: a number and its unit differ')),
    'a converted unit',
  );
  const dropped = { ...faithful, limits: 'Đây là ấn phẩm chính thức của NWS.' };
  assert.ok(
    invariantProblems(original, dropped, [tvException]).some((p) => p.startsWith('limits: the original has 1 negation')),
    'a dropped negation',
  );
});

test('GT05 an exception applies only when the translation uses the phrase the exception lists', () => {
  const other = {
    ...faithful,
    steps: ['Theo dõi thông tin. Nghe đài phát thanh và phát sóng, kể cả NOAA Weather Radio nếu có thể.', 'Gọi 911.'],
  };
  assert.deepEqual(invariantProblems(original, other, [tvException]), ['steps[0]: "TV" is missing from the translation']);
});

test('GT05 formatting does not count, and negations and units are counted the same way in each language', () => {
  assert.deepEqual(digitGroups('1,000 people'), digitGroups('1.000 người'));
  assert.deepEqual(digitGroups('+1 (800) 555-0100'), digitGroups('+1 800 555 0100'));
  assert.equal(negationCount("Do not go. Never stop. Don't drown.", 'en'), 3);
  assert.equal(negationCount('Không đi. Không bao giờ dừng. Đừng chết đuối.', 'vi'), 3);
  assert.deepEqual(numberUnits('103°F, 10 minutes and 72 hours'), ['103|F', '10|minute', '72|hour']);
});

test('GT05 names are the capitalised words that do not open a sentence', () => {
  assert.deepEqual(
    nameTerms('Stay informed. Listen to radio and TV, including NOAA Weather Radio if possible.'),
    ['NOAA Weather Radio', 'TV'],
  );
  assert.deepEqual(nameTerms('Do not enter until the authorities give the All Clear.'), ['All Clear']);
});

test('GT05 the real translations keep the invariants, and the content validator reports any that do not', () => {
  const report = validateContent({ contentDir: DEFAULT_CONTENT_DIR, today: '2026-11-06' });
  assert.deepEqual(
    report.errors.filter((e) => e.message.startsWith('translation:')),
    [],
  );
});

test('GT05 numbers are compared with their units in order: a swapped pair is reported, a matching pair is not (GSL-F03)', () => {
  const en = { ...original, avoid: ['Stay 3 m from the edge and 1 m from the wall.'] };
  const swapped = { ...faithful, avoid: ['Đứng cách mép 1 m và cách tường 3 m.'] };
  assert.ok(
    invariantProblems(en, swapped, [tvException]).some((p) => p.startsWith('avoid[0]: a number and its unit differ')),
    'the swapped pair is reported',
  );
  const matching = { ...faithful, avoid: ['Đứng cách mép 3 m và cách tường 1 m.'] };
  assert.deepEqual(invariantProblems(en, matching, [tvException]), []);
  assert.deepEqual(numberUnits('3 m then 1 m'), ['3|m', '1|m'], 'pairs are kept in text order');
});
