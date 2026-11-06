import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';

// All fixture organizations and URLs are fictional (example.org); no real licence is implied.
export type Files = Record<string, string>;

export const md = (front: object, body = ''): string => `---\n${stringify(front)}---\n${body}\n`;

const longBody =
  'Store one litre of drinking water per person per day in clean, covered containers. Keep them away from heat and sunlight, and write the date on each one. ' +
  'Replace the water on a schedule and check that the containers have not been damaged. This is placeholder text for a test fixture.';

export const SOURCES = {
  sources: [
    {
      id: 'example-flood-guide', organization: 'Example Agency', title: 'Flood safety guide', url: 'https://example.org/flood',
      language: 'en', accessed: '2026-11-06',
      license: { kind: 'open-license', summary: 'Fictional open licence for tests', quote: 'Fictional licence text used only by the test fixtures.', checked_on: '2026-11-06', verified_via: 'official-page' },
      usage: { quote: true, summarize: true, translate: true, offline: true, commercial: true },
      scope: ['GLOBAL'],
    },
    {
      id: 'example-vn-notice', organization: 'Example Ministry', title: 'Thong bao mau', url: 'https://example.org/vn',
      language: 'vi', accessed: '2026-11-06',
      license: { kind: 'permission-granted', summary: 'Fictional permission for tests', quote: 'Fictional permission text used only by the test fixtures.', checked_on: '2026-11-06', verified_via: 'official-page' },
      usage: { quote: false, summarize: true, translate: false, offline: true, commercial: true },
      scope: ['VN'],
    },
  ],
};

export const CARD_EN = {
  layer: 'S', id: 'flood-before', locale: 'en', version: 1, title: 'Before a flood', hazard: 'flood',
  scope: { countries: ['GLOBAL'], audience: ['adult', 'child'] },
  first_action: 'Move valuables and documents above the expected water line.',
  avoid: ['Do not walk or drive through moving water.'],
  steps: ['Charge phones and power banks.', 'Fill clean containers with drinking water.'],
  limits: 'General guidance only. Follow orders from your local authorities.',
  sources: [{ id: 'example-flood-guide' }],
  updated: '2026-11-06',
  review: { status: 'AI_DRAFT' },
};

export const CARD_VI = {
  ...CARD_EN, locale: 'vi', title: 'Truoc khi lu', scope: { countries: ['VN'], audience: ['adult'] },
  first_action: 'Dua giay to va do co gia tri len cao hon muc nuoc du kien.',
  avoid: ['Không đi bộ hoặc lái xe qua nước đang chảy.'],
  steps: ['Sạc điện thoại và pin dự phòng.', 'Đổ đầy các thùng sạch bằng nước uống.'],
  limits: 'Chỉ là hướng dẫn chung. Hãy làm theo lệnh của chính quyền địa phương.',
  based_on: { locale: 'en', version: 1 },
};

export const ARTICLE = {
  layer: 'J', id: 'water-storage', locale: 'en', version: 1, title: 'Store water at home', module: 'water',
  slug: 'water-storage', summary: 'How much drinking water a household needs to store, and how to keep it safe.',
  scope: { countries: ['GLOBAL'], climate: ['all'] }, spec_ref: 'spec-water',
  sources: [{ id: 'example-flood-guide' }], author: { kind: 'ai' }, updated: '2026-11-06', disclaimer: 'none',
  review: { status: 'AI_DRAFT' },
};

export const SPEC = {
  layer: 'SPEC', id: 'spec-water', locale: 'en', version: 1, module: 'water',
  purpose: 'Show how to secure drinking water for a household.',
  audience: ['staying-in-city'],
  required_sections: [
    { id: 'how-much', heading: 'How much water', must_cover: ['The daily need, from the cited source.'] },
    { id: 'store', heading: 'Store it', must_cover: ['Containers and rotation.'] },
    { id: 'treat', heading: 'Treat it', must_cover: ['What each method removes and does not.'] },
  ],
  safety_points: ['A filter removes only what its certification says.'],
  red_lines: ['Do not call water safe without stating the method.'],
  minimum_sources: { count: 1 },
  local_must_have: ['units'],
  disclaimer: 'none',
  updated: '2026-11-06',
};

export const COUNTRY_VN = {
  code: 'VN', name: { en: 'Vietnam', vi: 'Viet Nam' }, locales: ['en', 'vi'], currency: 'VND', units: 'metric', status: 'verified',
  emergency_numbers: [{ service: 'general', number: '112', source: 'example-vn-notice', checked_on: '2026-11-01' }],
  authorities: [{ role: 'disaster-agency', name: 'Example disaster agency', url: 'https://example.org/agency', source: 'example-vn-notice', checked_on: '2026-11-01' }],
  checked_on: '2026-11-01',
};

export function validFiles(): Files {
  return {
    'sources.json': JSON.stringify(SOURCES),
    'specs/spec-water.md': md(SPEC, 'Writer notes.'),
    'cards/en/flood-before.md': md(CARD_EN, 'Extra detail for the card.'),
    'cards/vi/flood-before.md': md(CARD_VI),
    'modules/en/water-storage.md': md(ARTICLE, longBody),
    'countries/VN.json': JSON.stringify(COUNTRY_VN),
  };
}

// Re-writes the frontmatter of one markdown file after applying `mutate` to its parsed data.
export function edit(files: Files, path: string, mutate: (data: Record<string, unknown>) => void): Files {
  const text = files[path];
  if (text === undefined) throw new Error(`no fixture ${path}`);
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`fixture ${path} has no frontmatter`);
  const data = parse(m[1] ?? '') as Record<string, unknown>;
  mutate(data);
  return { ...files, [path]: md(data, (m[2] ?? '').trim()) };
}

export function editJson(files: Files, path: string, mutate: (data: any) => void): Files {
  const data = JSON.parse(files[path] ?? 'null');
  mutate(data);
  return { ...files, [path]: JSON.stringify(data) };
}

export function writeContent(files: Files): string {
  const dir = mkdtempSync(join(tmpdir(), 'gs-content-'));
  for (const [rel, text] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return dir;
}
