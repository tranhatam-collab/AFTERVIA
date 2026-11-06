import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectiveReview, reviewLabel } from '../lib/content/review.ts';
import { DEFAULT_CONTENT_DIR, loadContent, validateContent } from '../lib/content/validate.ts';
import { MODULES } from '../lib/content/modules.ts';
import { ARTICLE, CARD_EN, SPEC, edit, editJson, validFiles, writeContent, type Files } from './content-fixtures.ts';
import { ROOT } from './helpers.ts';

const TODAY = '2026-11-06';
const run = (files: Files) => validateContent({ contentDir: writeContent(files), today: TODAY });
const messages = (files: Files): string => run(files).errors.map((e) => `${e.file}: ${e.message}`).join('\n');

test('GT03 a complete set of fixtures validates with no errors', () => {
  const report = run(validFiles());
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.counts, { sources: 2, specs: 1, cards: 2, articles: 1, countries: 1 });
});

test('GT03 the real content directory validates', () => {
  assert.deepEqual(validateContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY }).errors, []);
});

test('GT03 a card missing any required field fails the check and names the field', () => {
  const required = Object.keys(CARD_EN).filter((k) => k !== 'layer');
  for (const field of required) {
    const files = edit(validFiles(), 'cards/en/flood-before.md', (d) => void delete d[field]);
    assert.match(messages(files), new RegExp(`missing required field "${field}"`), `card without ${field} was accepted`);
  }
});

test('GT03 an article missing any required field fails the check and names the field', () => {
  const required = Object.keys(ARTICLE).filter((k) => k !== 'layer');
  for (const field of required) {
    const files = edit(validFiles(), 'modules/en/water-storage.md', (d) => void delete d[field]);
    assert.match(messages(files), new RegExp(`missing required field "${field}"`), `article without ${field} was accepted`);
  }
});

test('GT03 unknown fields, empty source lists and bad dates are rejected', () => {
  assert.match(messages(edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.approved = true))), /unknown field "approved"/);
  assert.match(messages(edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.sources = []))), /sources/);
  assert.match(messages(edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.updated = '06/11/2026'))), /updated/);
});

test('GT03 a card cannot cite a source that is not in the ledger', () => {
  const files = edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.sources = [{ id: 'made-up-source' }]));
  assert.match(messages(files), /unknown source "made-up-source"/);
});

test('GT03 a source that does not allow offline use, summaries or commercial use blocks the card', () => {
  for (const flag of ['summarize', 'offline', 'commercial']) {
    const files = editJson(validFiles(), 'sources.json', (d) => void (d.sources[0].usage[flag] = false));
    assert.match(messages(files), new RegExp(`does not allow: ${flag}`), `${flag}=false was accepted`);
  }
});

test('GT03 a source in another language needs translation rights, and link-only sources cannot allow reuse', () => {
  const noTranslate = editJson(validFiles(), 'sources.json', (d) => void (d.sources[0].usage.translate = false));
  assert.match(messages(noTranslate), /does not allow translation into "vi"/);
  const linkOnly = editJson(validFiles(), 'sources.json', (d) => void (d.sources[0].license.kind = 'link-only'));
  assert.match(messages(linkOnly), /link-only and restricted sources must have every usage flag false/);
});

test('GT03 every country a card applies to must be covered by a listed source', () => {
  const files = edit(validFiles(), 'cards/en/flood-before.md', (d) => {
    d.sources = [{ id: 'example-vn-notice' }];
    d.scope = { countries: ['US'], audience: ['adult'] };
  });
  assert.match(messages(files), /no listed source covers country "US"/);
});

test('GT03 files must sit in the folder of their locale and be named after their id or slug', () => {
  const wrongFolder: Files = { ...validFiles(), 'cards/vi/flood-after.md': validFiles()['cards/en/flood-before.md'] ?? '' };
  assert.match(messages(wrongFolder), /file is in "vi\/" but declares locale "en"/);
  assert.match(messages(wrongFolder), /file name must be "flood-before.md"/);
});

test('GT03 duplicate cards, a missing frontmatter block and broken YAML are reported', () => {
  const dup: Files = { ...validFiles(), 'cards/en/copy.md': validFiles()['cards/en/flood-before.md'] ?? '' };
  assert.match(messages(dup), /duplicate card flood-before \(en\)/);
  assert.match(messages({ ...validFiles(), 'cards/en/plain.md': '# no frontmatter\n' }), /missing frontmatter/);
  assert.match(messages({ ...validFiles(), 'cards/en/broken.md': '---\nid: [unclosed\n---\n' }), /not valid YAML/);
});

test('GT03 an article needs a real body, a named human author and the disclaimer its module requires', () => {
  const short: Files = { ...validFiles(), 'modules/en/water-storage.md': `---\n${(validFiles()['modules/en/water-storage.md'] ?? '').split('---')[1] ?? ''}---\nToo short.\n` };
  assert.match(messages(short), /article body is too short/);
  assert.match(messages(edit(validFiles(), 'modules/en/water-storage.md', (d) => void (d.author = { kind: 'human' }))), /human author needs a name/);
  const land = edit(validFiles(), 'modules/en/water-storage.md', (d) => void (d.module = 'land'));
  assert.match(messages(land), /module "land" requires disclaimer "legal-land"/);
  const health = edit(validFiles(), 'modules/en/water-storage.md', (d) => {
    d.module = 'health';
    d.disclaimer = 'medical-first-aid';
  });
  assert.doesNotMatch(messages(health), /requires disclaimer/);
});

test('GT03 a country pack must name known sources, match its file name and warn when entries are old', () => {
  assert.match(messages(editJson(validFiles(), 'countries/VN.json', (d) => void (d.emergency_numbers[0].source = 'nope'))), /unknown source "nope"/);
  assert.match(messages(editJson(validFiles(), 'countries/VN.json', (d) => void (d.code = 'US'))), /file name must be "US.json"/);
  const old = editJson(validFiles(), 'countries/VN.json', (d) => void (d.emergency_numbers[0].checked_on = '2026-05-01'));
  const report = run(old);
  assert.deepEqual(report.errors, []);
  assert.ok(report.warnings.some((w) => /not re-checked for more than 92 days/.test(w.message)));
});

test('GT03 the content check exits non-zero on broken content, and the build runs it before next build', () => {
  const bad = edit(validFiles(), 'cards/en/flood-before.md', (d) => void delete d.first_action);
  const script = join(ROOT, 'tools/checks/content-validate.mjs');
  const failed = spawnSync(process.execPath, [script, '--content', writeContent(bad)], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /missing required field "first_action"/);
  const passed = spawnSync(process.execPath, [script, '--content', writeContent(validFiles())], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(passed.status, 0, passed.stderr);
  const build = (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts.build ?? '';
  assert.ok(build.indexOf('content-validate') >= 0 && build.indexOf('content-validate') < build.indexOf('next build'), 'build must run the content check first');
});

test('GT04 review records that would make a label misleading are rejected', () => {
  const rule = (mutate: (d: Record<string, unknown>) => void, pattern: RegExp) =>
    assert.match(messages(edit(validFiles(), 'cards/en/flood-before.md', mutate)), pattern);
  rule((d) => void (d.review = { status: 'AI_DRAFT', reviewer: { name: 'Someone' } }), /AI_DRAFT must not carry a reviewer/);
  rule((d) => void (d.review = { status: 'COMMUNITY_CHECKED', reviewer: { name: 'An Nguyen' } }), /COMMUNITY_CHECKED needs reviewed_on/);
  rule((d) => void (d.review = { status: 'EXPERT_REVIEWED', reviewed_on: '2026-11-06' }), /EXPERT_REVIEWED needs reviewer.name/);
  rule((d) => void (d.review = { status: 'EXPERT_REVIEWED', reviewer: { name: 'Dr Example' }, reviewed_on: '2026-11-06' }), /EXPERT_REVIEWED needs reviewer.expertise/);
  rule((d) => void (d.review = { status: 'STALE' }), /STALE needs stale_reason/);
  const ok = edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.review = { status: 'EXPERT_REVIEWED', reviewer: { name: 'Dr Example', expertise: 'First aid' }, reviewed_on: '2026-11-06' }));
  assert.deepEqual(run(ok).errors, []);
});

test('GT04 labels say what is true in both languages and never claim a review the record cannot back up', () => {
  const expert = { status: 'EXPERT_REVIEWED', reviewer: { name: 'Dr Example', expertise: 'First aid' }, reviewed_on: '2026-11-06' } as const;
  assert.equal(reviewLabel('en', expert), 'Reviewed by Dr Example (First aid) on 2026-11-06.');
  assert.equal(reviewLabel('vi', expert), 'Duyệt bởi Dr Example (First aid), ngày 2026-11-06.');
  assert.match(reviewLabel('en', { status: 'AI_DRAFT' }), /No expert has reviewed it yet/);
  assert.match(reviewLabel('vi', { status: 'AI_DRAFT' }), /Chưa có chuyên gia duyệt/);
  assert.match(reviewLabel('en', { status: 'COMMUNITY_CHECKED', reviewer: { name: 'An' }, reviewed_on: '2026-11-06' }), /not an expert review/);
  assert.match(reviewLabel('en', { status: 'STALE', stale_reason: 'source changed' }), /waiting to be checked again/);
  for (const broken of [
    { status: 'EXPERT_REVIEWED' },
    { status: 'EXPERT_REVIEWED', reviewer: { name: 'No Expertise' }, reviewed_on: '2026-11-06' },
    { status: 'COMMUNITY_CHECKED', reviewer: { name: 'No Date' } },
  ] as const) {
    assert.equal(reviewLabel('en', broken), reviewLabel('en', { status: 'AI_DRAFT' }), 'an unbacked review must show the AI-draft label');
    assert.equal(reviewLabel('vi', broken), reviewLabel('vi', { status: 'AI_DRAFT' }));
  }
});

test('GT04 a translation becomes STALE as soon as its original has a newer version', () => {
  const files = edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.version = 2));
  const loaded = loadContent({ contentDir: writeContent(files), today: TODAY });
  assert.deepEqual(loaded.report.errors, []);
  assert.ok(loaded.report.warnings.some((w) => /stale translation/.test(w.message)));
  const original = loaded.cards.find((c) => c.data.locale === 'en')?.data;
  const translation = loaded.cards.find((c) => c.data.locale === 'vi')?.data;
  assert.ok(original && translation);
  const shown = effectiveReview(translation, original);
  assert.equal(shown.status, 'STALE');
  assert.match(reviewLabel('vi', shown), /Nguồn gốc đã thay đổi/);
});

test('GT04 a translation based on the current original keeps its declared review status', () => {
  const loaded = loadContent({ contentDir: writeContent(validFiles()), today: TODAY });
  const original = loaded.cards.find((c) => c.data.locale === 'en')?.data;
  const translation = loaded.cards.find((c) => c.data.locale === 'vi')?.data;
  assert.ok(original && translation);
  assert.equal(effectiveReview(translation, original).status, 'AI_DRAFT');
  assert.equal(loaded.report.warnings.length, 0);
});

test('GT04 translation links are checked: no original, wrong version, wrong hazard, wrong direction', () => {
  assert.match(messages(edit(validFiles(), 'cards/vi/flood-before.md', (d) => void delete d.based_on)), /needs based_on/);
  assert.match(messages(edit(validFiles(), 'cards/vi/flood-before.md', (d) => void (d.based_on = { locale: 'en', version: 3 }))), /based_on.version 3 is newer than the original/);
  assert.match(messages(edit(validFiles(), 'cards/vi/flood-before.md', (d) => void (d.hazard = 'heat'))), /hazard "heat" differs from the original/);
  assert.match(messages(edit(validFiles(), 'cards/en/flood-before.md', (d) => void (d.based_on = { locale: 'vi', version: 1 }))), /English original must not have based_on/);
  const orphan: Files = { ...validFiles() };
  delete orphan['cards/en/flood-before.md'];
  assert.match(messages(orphan), /based_on points to flood-before \(en\), which does not exist/);
});

test('GT03 a spec missing any required field fails the check and names the field', () => {
  for (const field of Object.keys(SPEC).filter((k) => k !== 'layer')) {
    const files = edit(validFiles(), 'specs/spec-water.md', (d) => void delete d[field]);
    assert.match(messages(files), new RegExp(`missing required field "${field}"`), `spec without ${field} was accepted`);
  }
});

test('GT03 a spec must be named after its id, be unique, and carry the disclaimer its module requires', () => {
  const copy: Files = { ...validFiles(), 'specs/spec-copy.md': validFiles()['specs/spec-water.md'] ?? '' };
  assert.match(messages(copy), /duplicate spec spec-water/);
  assert.match(messages(copy), /file name must be "spec-water.md"/);
  const health = edit(validFiles(), 'specs/spec-water.md', (d) => void (d.module = 'health'));
  assert.match(messages(health), /module "health" requires disclaimer "medical-first-aid"/);
});

test('GT03 an article must point at a real spec of its own module, with the same disclaimer and enough sources', () => {
  assert.match(messages(edit(validFiles(), 'modules/en/water-storage.md', (d) => void (d.spec_ref = 'spec-nowhere'))), /unknown spec_ref "spec-nowhere"/);
  const otherModule = edit(validFiles(), 'modules/en/water-storage.md', (d) => void (d.module = 'food'));
  assert.match(messages(otherModule), /module "food" differs from its spec's module "water"/);
  const otherDisclaimer = edit(validFiles(), 'modules/en/water-storage.md', (d) => void (d.disclaimer = 'electrical'));
  assert.match(messages(otherDisclaimer), /disclaimer "electrical" differs from its spec's "none"/);
  const needsTwo = edit(validFiles(), 'specs/spec-water.md', (d) => void (d.minimum_sources = { count: 2 }));
  assert.match(messages(needsTwo), /requires at least 2 source\(s\); the article lists 1/);
});

test('GT03 a source that allows any reuse must record its evidence: quote, check date and how it was verified', () => {
  for (const field of ['quote', 'checked_on', 'verified_via']) {
    const files = editJson(validFiles(), 'sources.json', (d) => void delete d.sources[0].license[field]);
    assert.match(messages(files), new RegExp(`has no recorded evidence \\(missing license\\.${field}`), `reuse without ${field} was accepted`);
  }
  const linkOnly = editJson(validFiles(), 'sources.json', (d) => {
    const src = d.sources[0];
    src.license = { kind: 'link-only', summary: 'Terms not read.' };
    src.usage = { quote: false, summarize: false, translate: false, offline: false, commercial: false };
  });
  assert.doesNotMatch(messages(linkOnly), /no recorded evidence/);
});

test('GT03 the module list, both schemas and the real specs agree on the ten modules', () => {
  const schemaModules = (file: string): string[] => JSON.parse(readFileSync(join(DEFAULT_CONTENT_DIR, 'schema', file), 'utf8')).properties.module.enum;
  assert.deepEqual(schemaModules('article.schema.json'), [...MODULES]);
  assert.deepEqual(schemaModules('spec.schema.json'), [...MODULES]);
  const real = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });
  assert.deepEqual(real.specs.map((s) => s.data.module).sort(), [...MODULES].sort(), 'every module needs exactly one spec');
  for (const { data: spec } of real.specs) {
    assert.equal(spec.id, `spec-${spec.module === 'mode72' ? 'mode72' : spec.module}`);
    assert.ok(spec.red_lines.length >= 4, `${spec.id} should carry the common red lines`);
  }
});

test('GT03 the real source ledger: reuse only with evidence, non-commercial terms never allow commercial use, unread sources are link-only', () => {
  const { sources } = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });
  assert.ok(sources.length >= 15, `expected at least 15 sources, found ${sources.length}`);
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length, 'source ids must be unique');
  const reusable = sources.filter((s) => Object.values(s.usage).some(Boolean));
  assert.ok(reusable.length >= 1);
  for (const s of sources) {
    const read = s.license.checked_on !== undefined;
    if (!read) {
      assert.equal(s.license.kind, 'link-only', `${s.id}: an unread source must be link-only`);
      assert.deepEqual(Object.values(s.usage), [false, false, false, false, false], `${s.id}: an unread source allows nothing`);
      continue;
    }
    assert.ok(s.license.quote && s.license.verified_via, `${s.id}: a read source must carry its quote and how it was verified`);
    // The wording of the licence decides the commercial flag: "non-commercial" can never allow a site with affiliate links.
    if (/non-?commercial/i.test(s.license.quote ?? '')) assert.equal(s.usage.commercial, false, `${s.id}: a non-commercial licence cannot allow commercial use`);
    if (s.license.verified_via === 'official-page') assert.ok(s.license.url?.startsWith('https://'), `${s.id}: an official-page source must link the page it was read on`);
  }
  for (const s of reusable) assert.ok(['public-domain', 'open-license', 'permission-granted'].includes(s.license.kind), `${s.id}: reuse needs a licence that grants it`);
  const cleared = reusable.filter((s) => s.usage.summarize && s.usage.offline && s.usage.commercial).map((s) => s.id).sort();
  assert.deepEqual(cleared, ['eu-commission-preparedness', 'us-cdc-emergency', 'us-fema-ready', 'us-nws-safety', 'us-usgs-hazards'].sort(), 'sources cleared for cards changed: review the ledger');
});

test('GT03 a public-domain source cannot deny any use, and the real public-domain sources allow all five', () => {
  const files = editJson(validFiles(), 'sources.json', (d) => {
    d.sources[0].license.kind = 'public-domain';
    d.sources[0].usage.commercial = false;
  });
  assert.match(messages(files), /is public-domain, so every usage flag must be true/);
  const { sources } = loadContent({ contentDir: DEFAULT_CONTENT_DIR, today: TODAY });
  for (const s of sources.filter((x) => x.license.kind === 'public-domain')) assert.deepEqual(Object.values(s.usage), [true, true, true, true, true], s.id);
});

test('GT34 a verified pack needs a number; a partial pack must say what is still unverified', () => {
  const noNumbers = editJson(validFiles(), 'countries/VN.json', (d) => void (d.emergency_numbers = []));
  assert.match(messages(noNumbers), /a verified pack needs at least one emergency number/);
  const pending = { en: 'Emergency numbers are not yet checked against an official source in this fixture.', vi: 'Số khẩn cấp trong dữ liệu thử này chưa được đối chiếu với nguồn chính thức.' };
  const partial = editJson(validFiles(), 'countries/VN.json', (d) => { d.status = 'partial'; d.emergency_numbers = []; d.pending = pending; });
  assert.deepEqual(run(partial).errors, []);
  const noPending = editJson(validFiles(), 'countries/VN.json', (d) => { d.status = 'partial'; d.emergency_numbers = []; });
  assert.match(messages(noPending), /a partial pack must say what is still unverified/);
});
