import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

// WO16-04, mã T41: xác thực JSON schema của country pack theo schema đã công bố trong đặc tả (engineering/07).
// Schema là nguồn chuẩn; tệp trong packs/countries phải khớp với nó.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const SCHEMA = JSON.parse(
  readFileSync(join(ROOT, 'docs/spec/AFTERVIA_AZ_2026-10-31/engineering/07_COUNTRY_PACK.schema.json'), 'utf8'),
) as object;

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(SCHEMA);

describe('WO16-04 country pack JSON schema (T41)', () => {
  it('T41 every country pack in packs/countries validates against the published schema', () => {
    const files = readdirSync(join(ROOT, 'packs/countries')).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const pack: unknown = JSON.parse(readFileSync(join(ROOT, 'packs/countries', f), 'utf8'));
      const ok = validate(pack);
      expect(ok, `${f}: ${ajv.errorsText(validate.errors)}`).toBe(true);
    }
  });

  it('T41 a pack marked ENABLED without a named legal reviewer, readiness or sources is rejected by the schema', () => {
    const enabledWithoutApproval = {
      country_code: 'VN',
      version: '0.1.0',
      status: 'ENABLED',
      ui_locales: ['vi'],
      currency: 'VND',
      legal_review: { reviewer: null, reviewed_at: null, next_review_at: null },
      sources: [],
    };
    expect(validate(enabledWithoutApproval)).toBe(false);

    const readyButNoReviewer = {
      ...enabledWithoutApproval,
      billing_ready: true,
      privacy_ready: true,
      support_ready: true,
      sources: [{ title: 'Nguồn', url: 'https://example.test/nguon', accessed_at: '2026-10-31', scope: 'thuế' }],
    };
    expect(validate(readyButNoReviewer)).toBe(false);

    const complete = {
      ...readyButNoReviewer,
      legal_review: { reviewer: 'Luật sư A', reviewed_at: '2026-10-01', next_review_at: '2027-10-01' },
    };
    expect(validate(complete)).toBe(true);
  });
});
