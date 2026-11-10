import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { amount, assertConfirmedRevenue, reconcile, reportTotal, type LedgerRow, type ReportRow } from '@aftervia/domain';
import { ingestBillingWebhook } from '../../services/api/src/billing/ingest';
import { signWebhook } from '../../services/api/src/billing/webhook';
import { connect, resetTestDatabase, testDatabaseUrl } from '../support/db';

// WO12-03 (T30): đối soát báo cáo sandbox với sổ THẬT trong cơ sở dữ liệu, không phải với một mảng tự dựng.
// Fixture là báo cáo giả định của nhà cung cấp sandbox; không có tiền thật và không có khóa live.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SECRET = randomBytes(24).toString('hex');
const BUYER = '00000000-0000-4000-8000-00000000e001';
const NOW = 1_762_000_000;

interface FixtureRow {
  event_id: string;
  event_type: string;
  provider_state: string;
  effective_at: string;
  amount_minor: number;
}

interface Fixture {
  provider: string;
  currency: string;
  amount_kind: string;
  rows: FixtureRow[];
}

const fixture = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/billing/sandbox-report-2026-11.json'), 'utf8')) as Fixture;

let pool: pg.Pool;

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

// Báo cáo của nhà cung cấp, đọc từ fixture. Nguồn gốc tiền lấy đúng từ tệp: 'sandbox'.
function reportRows(): ReportRow[] {
  if (fixture.amount_kind !== 'sandbox') throw new Error('the fixture must be sandbox money');
  return fixture.rows.map((r) => ({
    provider: fixture.provider,
    eventId: r.event_id,
    eventType: r.event_type,
    providerState: r.provider_state,
    effectiveAt: r.effective_at,
    amount: amount('sandbox', r.amount_minor, fixture.currency),
  }));
}

// Sổ, đọc từ bảng thật.
async function ledgerRows(): Promise<LedgerRow[]> {
  const rows = await adminRows(
    'select provider, event_id, event_type, provider_state, effective_at from public.billing_events order by effective_at',
  );
  return rows.map((r) => ({
    provider: r.provider as string,
    eventId: r.event_id as string,
    eventType: r.event_type as string,
    providerState: r.provider_state as string,
    effectiveAt: new Date(r.effective_at as Date).toISOString(),
  }));
}

beforeAll(async () => {
  await resetTestDatabase();
  pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 2 });
  await adminRows('insert into auth.users (id, email) values ($1,$2)', [BUYER, 'recon@test.invalid']);
  for (const [index, r] of fixture.rows.entries()) {
    const rawBody = JSON.stringify({
      event_id: r.event_id,
      event_type: r.event_type,
      provider_state: r.provider_state,
      subject_user_id: BUYER,
      effective_at: r.effective_at,
      provider_seq: index + 1,
    });
    const sent = await ingestBillingWebhook(pool, {
      provider: fixture.provider,
      secret: SECRET,
      rawBody,
      signatureHeader: `t=${NOW},v1=${signWebhook(SECRET, rawBody, NOW)}`,
      nowSeconds: NOW,
    });
    if (sent.kind !== 'accepted') throw new Error(`fixture row ${r.event_id} was rejected: ${sent.reason}`);
  }
});

afterAll(async () => {
  await pool?.end();
});

describe('T30 the sandbox report reconciles against the real ledger', () => {
  it('T30 the difference is zero: every row of the provider report is in the ledger, and nothing else is', async () => {
    const result = reconcile(reportRows(), await ledgerRows());
    expect(result.missingFromLedger).toEqual([]);
    expect(result.missingFromReport).toEqual([]);
    expect(result.disagreements).toEqual([]);
    expect(result.matched).toBe(fixture.rows.length);
    expect(result.settled).toBe(true);
  });

  it('T30 an event the provider reports but we never received is caught', async () => {
    const withExtra = [
      ...reportRows(),
      {
        provider: fixture.provider,
        eventId: 'rep-9999',
        eventType: 'purchase',
        providerState: 'active',
        effectiveAt: '2026-11-28T09:00:00.000Z',
        amount: amount('sandbox', 14_900, fixture.currency),
      },
    ];
    const result = reconcile(withExtra, await ledgerRows());
    expect(result.settled).toBe(false);
    expect(result.missingFromLedger).toEqual([`${fixture.provider}:rep-9999`]);
  });

  it('T30 a row in the ledger that the report does not mention is caught', async () => {
    const short = reportRows().filter((r) => r.eventId !== 'rep-0002');
    const result = reconcile(short, await ledgerRows());
    expect(result.settled).toBe(false);
    expect(result.missingFromReport).toEqual([`${fixture.provider}:rep-0002`]);
  });

  it('T30 a replayed webhook does not create a second ledger row, so the difference stays zero', async () => {
    const first = fixture.rows[0];
    if (first === undefined) throw new Error('the fixture is empty');
    const rawBody = JSON.stringify({
      event_id: first.event_id,
      event_type: first.event_type,
      provider_state: first.provider_state,
      subject_user_id: BUYER,
      effective_at: first.effective_at,
      provider_seq: 1,
    });
    const replay = await ingestBillingWebhook(pool, {
      provider: fixture.provider,
      secret: SECRET,
      rawBody,
      signatureHeader: `t=${NOW},v1=${signWebhook(SECRET, rawBody, NOW)}`,
      nowSeconds: NOW,
    });
    expect(replay).toMatchObject({ kind: 'accepted', duplicate: true, recorded: false });
    expect(reconcile(reportRows(), await ledgerRows()).settled).toBe(true);
  });

  it('T30 the money in this run is sandbox money and is refused as revenue', () => {
    const total = reportTotal(reportRows(), fixture.currency);
    expect(total.kind).toBe('sandbox');
    // 14900 + 14900 + 0 - 14900 = 14900 đơn vị nhỏ nhất, nhưng đó KHÔNG phải doanh thu.
    expect(total.minorUnits).toBe(14_900);
    expect(() => assertConfirmedRevenue(total)).toThrow(/sandbox money is not confirmed revenue/);
  });
});
