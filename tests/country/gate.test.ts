import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { marketDecision, newDisabledPack, type CountryPack } from '../../packages/domain/src/country-pack';

// WO16-04, mã T41: cổng mở thị trường. Thị trường DISABLED không mở giao dịch và không nêu khẳng định về tính đủ điều kiện pháp lý.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const NOW = new Date('2026-10-31T00:00:00Z');

const READY: CountryPack = {
  country_code: 'VN',
  version: '0.1.0',
  status: 'ENABLED',
  ui_locales: ['vi', 'en'],
  currency: 'VND',
  legal_review: { reviewer: 'Luật sư A', reviewed_at: '2026-10-01', next_review_at: '2027-10-01' },
  sources: [{ title: 'Nguồn', url: 'https://example.test/nguon', accessed_at: '2026-10-01', scope: 'thuế' }],
  billing_ready: true,
  privacy_ready: true,
  support_ready: true,
};

describe('WO16-04 market gate: DISABLED by default, opens only with approval, readiness and the switch (T41)', () => {
  it('T41 a new pack and the repository pack are DISABLED, so no transaction opens and no legal-eligibility claim is made, even with the switch on', () => {
    const fresh = newDisabledPack('VN', 'VND', ['vi', 'en'], '0.1.0');
    expect(fresh.status).toBe('DISABLED');
    const repoPack = JSON.parse(readFileSync(join(ROOT, 'packs/countries/VN.json'), 'utf8')) as CountryPack;
    for (const pack of [fresh, repoPack]) {
      const d = marketDecision(pack, true, NOW);
      expect(d.transactionsOpen).toBe(false);
      expect(d.legalEligibilityClaim).toBe(false);
      expect(d.blockers).toContain('status_not_enabled');
    }
  });

  it('T41 an ENABLED pack stays closed without a named reviewer, an unexpired review date or readiness and sources, and each gap is named', () => {
    const noReviewer = { ...READY, legal_review: { ...READY.legal_review, reviewer: null } };
    expect(marketDecision(noReviewer, true, NOW).blockers).toEqual(['legal_reviewer_missing']);

    const expired = { ...READY, legal_review: { ...READY.legal_review, next_review_at: '2026-01-01' } };
    expect(marketDecision(expired, true, NOW).blockers).toEqual(['legal_review_expired']);

    const notReady = { ...READY, billing_ready: false, support_ready: false, sources: [] };
    const d = marketDecision(notReady, true, NOW);
    expect(d.blockers).toEqual(['billing_not_ready', 'support_not_ready', 'sources_missing']);
    expect(d.transactionsOpen).toBe(false);
  });

  it('T41 a complete ENABLED pack opens the market only while the country_activation switch is on', () => {
    expect(marketDecision(READY, true, NOW)).toEqual({ transactionsOpen: true, legalEligibilityClaim: true, blockers: [] });
    const switchedOff = marketDecision(READY, false, NOW);
    expect(switchedOff.transactionsOpen).toBe(false);
    expect(switchedOff.blockers).toEqual(['kill_switch_country_activation_off']);
  });
});
