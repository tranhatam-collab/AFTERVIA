import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { capabilitiesOf } from '@aftervia/domain';
import { ingestBillingWebhook } from '../../services/api/src/billing/ingest';
import { signWebhook } from '../../services/api/src/billing/webhook';
import { buildExportBundle, sha256Hex, type ExportItem } from '../../services/api/src/export/bundle';
import { asActor, connect, resetTestDatabase, testDatabaseUrl } from '../support/db';

// WO12-02 (T29): "Không xóa hồ sơ vì expired" (engineering/11). Bài kiểm này là chốt chặn hồi quy: nếu sau
// này ai đó gắn cổng entitlement vào đọc hồ sơ hoặc vào store_export, nó sẽ đỏ ở đây trước khi tới người dùng.
// Dữ liệu tổng hợp, chỉ sandbox.
const SECRET = randomBytes(24).toString('hex');
const PROVIDER = 'sandbox_b2b';
const LAPSED = '00000000-0000-4000-8000-00000000d001';
const NOW = 1_762_000_000;
const EXPORTED_AT = '2026-11-10T00:00:00.000Z';

let pool: pg.Pool;

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function sendEvent(eventId: string, state: string, effectiveAt: string, seq: number): Promise<void> {
  const rawBody = JSON.stringify({
    event_id: eventId,
    event_type: state === 'expired' ? 'expire' : 'purchase',
    provider_state: state,
    subject_user_id: LAPSED,
    effective_at: effectiveAt,
    provider_seq: seq,
  });
  const result = await ingestBillingWebhook(pool, {
    provider: PROVIDER,
    secret: SECRET,
    rawBody,
    signatureHeader: `t=${NOW},v1=${signWebhook(SECRET, rawBody, NOW)}`,
    nowSeconds: NOW,
  });
  if (result.kind !== 'accepted') throw new Error(`event ${eventId} was rejected: ${result.reason}`);
}

async function exportAs(userId: string, requestId: string): Promise<string> {
  const itemRows = await asActor(userId, async (c) =>
    (await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at')).rows,
  );
  const items: ExportItem[] = itemRows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    purchased_on: (r.purchased_on as string | null) ?? null,
    currency: (r.currency as string | null)?.trim() ?? null,
    version: Number(r.version),
    created_at: new Date(r.created_at as Date).toISOString(),
    updated_at: new Date(r.updated_at as Date).toISOString(),
  }));
  const bundle = buildExportBundle({ items, grants: [], exportedAt: EXPORTED_AT });
  const stored = await asActor(userId, async (c) =>
    (await c.query('select out_job_id from public.store_export($1, $2, $3::jsonb)', [requestId, sha256Hex(`token-${requestId}`), JSON.stringify(bundle)])).rows[0],
  );
  if (!stored) throw new Error('store_export returned no row');
  return stored.out_job_id as string;
}

beforeAll(async () => {
  await resetTestDatabase();
  pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 2 });
  await adminRows('insert into auth.users (id, email) values ($1,$2)', [LAPSED, 'lapsed@test.invalid']);
  await asActor(LAPSED, (c) => c.query("select public.create_item('Máy lạnh WO12', 'Hãng', 'M-1', '2026-01-02', 'VND')"));
  await sendEvent('evt-exp-0001', 'active', '2026-10-01T00:00:00.000Z', 1);
});

afterAll(async () => {
  await pool?.end();
});

describe('T29 an expired plan takes the paid features, not the data', () => {
  it('T29 the account moves to expired', async () => {
    await sendEvent('evt-exp-0002', 'expired', '2026-11-01T00:00:00.000Z', 2);
    const rows = await adminRows('select state from public.entitlements where user_id = $1', [LAPSED]);
    expect(rows[0]?.state).toBe('expired');
    expect(capabilitiesOf('expired').paidFeatures).toBe(false);
  });

  it('T29 the records are still there and still readable by their owner', async () => {
    const rows = await asActor(LAPSED, (c) => c.query('select title, brand, purchased_on from public.items'));
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0]).toMatchObject({ title: 'Máy lạnh WO12', brand: 'Hãng', purchased_on: '2026-01-02' });
  });

  it('T29 the owner can still create an export of their own data after the plan expired', async () => {
    const jobId = await exportAs(LAPSED, 'req-expired-export-0001');
    const stored = await adminRows('select owner_user_id from public.export_jobs where id = $1', [jobId]);
    expect(stored[0]?.owner_user_id).toBe(LAPSED);
  });

  it('T29 a refund after the expiry does not remove anything either', async () => {
    await sendEvent('evt-exp-0003', 'refunded', '2026-11-05T00:00:00.000Z', 3);
    const entitlement = await adminRows('select state from public.entitlements where user_id = $1', [LAPSED]);
    expect(entitlement[0]?.state).toBe('refunded');
    const items = await asActor(LAPSED, (c) => c.query('select count(*)::int as n from public.items'));
    expect(items.rows[0]?.n).toBe(1);
    const jobId = await exportAs(LAPSED, 'req-refunded-export-0001');
    expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('T29 the ledger still holds every event, in order, after all of this', async () => {
    const rows = await adminRows('select event_id, provider_state from public.billing_events where subject_user_id = $1 order by effective_at', [LAPSED]);
    expect(rows.map((r) => r.provider_state)).toEqual(['active', 'expired', 'refunded']);
  });
});
