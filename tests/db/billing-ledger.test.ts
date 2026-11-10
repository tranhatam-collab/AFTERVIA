import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ingestBillingWebhook, type IngestResult } from '../../services/api/src/billing/ingest';
import { signWebhook } from '../../services/api/src/billing/webhook';
import { asActor, connect, resetTestDatabase, testDatabaseUrl } from '../support/db';

// WO12-01 (T27, T28): sổ sự kiện thanh toán trên cơ sở dữ liệu thật. Chỉ sandbox, dữ liệu tổng hợp,
// bí mật tổng hợp, không có nhà cung cấp hay khóa live nào.
// Sinh lúc chạy: repo không giữ chuỗi nào trông giống bí mật (quy tắc assigned-secret-literal).
const SECRET = randomBytes(24).toString('hex');
const PROVIDER = 'sandbox_b2b';
const BUYER = '00000000-0000-4000-8000-00000000c001';
const OTHER = '00000000-0000-4000-8000-00000000c002';
const NOW = 1_762_000_000;

let pool: pg.Pool;

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

interface EventInput {
  eventId: string;
  type: string;
  state: string;
  effectiveAt: string;
  seq?: number | null;
  user?: string;
}

function bodyOf(input: EventInput): string {
  return JSON.stringify({
    event_id: input.eventId,
    event_type: input.type,
    provider_state: input.state,
    subject_user_id: input.user ?? BUYER,
    effective_at: input.effectiveAt,
    provider_seq: input.seq ?? null,
  });
}

// Gửi một webhook đã ký đúng, như nhà cung cấp sandbox gửi.
async function send(input: EventInput, overrides: { header?: string | null; now?: number; body?: string } = {}): Promise<IngestResult> {
  const rawBody = overrides.body ?? bodyOf(input);
  const now = overrides.now ?? NOW;
  const header = overrides.header === undefined ? `t=${now},v1=${signWebhook(SECRET, rawBody, now)}` : overrides.header;
  return ingestBillingWebhook(pool, { provider: PROVIDER, secret: SECRET, rawBody, signatureHeader: header, nowSeconds: now });
}

async function ledgerCount(eventId?: string): Promise<number> {
  const rows =
    eventId === undefined
      ? await adminRows('select count(*)::int as n from public.billing_events')
      : await adminRows('select count(*)::int as n from public.billing_events where event_id = $1', [eventId]);
  return Number(rows[0]?.n);
}

async function entitlement(userId: string = BUYER): Promise<{ state: string; source_event_id: string } | null> {
  const rows = await adminRows('select state, source_event_id from public.entitlements where user_id = $1', [userId]);
  const row = rows[0];
  return row === undefined ? null : { state: row.state as string, source_event_id: row.source_event_id as string };
}

beforeAll(async () => {
  await resetTestDatabase();
  pool = new pg.Pool({ connectionString: testDatabaseUrl(), max: 2 });
  await adminRows('insert into auth.users (id, email) values ($1,$2),($3,$4)', [
    BUYER, 'buyer-billing@test.invalid',
    OTHER, 'other-billing@test.invalid',
  ]);
});

afterAll(async () => {
  await pool?.end();
});

describe('T27 a webhook that is not properly signed changes nothing at all', () => {
  it('T27 refuses a missing signature, a stale timestamp and a tampered body, and writes no row and no entitlement', async () => {
    const event: EventInput = { eventId: 'evt-forged-0001', type: 'purchase', state: 'active', effectiveAt: '2026-11-10T00:00:00.000Z' };

    expect(await send(event, { header: null })).toEqual({ kind: 'rejected', reason: 'missing_signature' });
    expect(await send(event, { header: 'garbage' })).toEqual({ kind: 'rejected', reason: 'malformed_signature' });

    // Chữ ký đúng nhưng mốc thời gian đã quá hạn: bản ghi cũ phát lại vẫn bị chặn.
    const stale = `t=${NOW - 3600},v1=${signWebhook(SECRET, bodyOf(event), NOW - 3600)}`;
    expect(await send(event, { header: stale })).toEqual({ kind: 'rejected', reason: 'timestamp_outside_window' });

    // Thân bị sửa sau khi ký (đổi trạng thái thành active có trả tiền).
    const signedBody = bodyOf({ ...event, state: 'expired' });
    const tampered = bodyOf({ ...event, state: 'active' });
    const header = `t=${NOW},v1=${signWebhook(SECRET, signedBody, NOW)}`;
    expect(await send(event, { body: tampered, header })).toEqual({ kind: 'rejected', reason: 'bad_signature' });

    expect(await ledgerCount()).toBe(0);
    expect(await entitlement()).toBeNull();
  });

  it('T27 refuses a signed body whose fields are wrong, before touching the ledger', async () => {
    const now = NOW;
    for (const raw of [
      'not json',
      JSON.stringify({ event_type: 'purchase', provider_state: 'active', subject_user_id: BUYER, effective_at: '2026-11-10T00:00:00.000Z' }),
      JSON.stringify({ event_id: 'e1', event_type: 'spend', provider_state: 'active', subject_user_id: BUYER, effective_at: '2026-11-10T00:00:00.000Z' }),
      JSON.stringify({ event_id: 'e1', event_type: 'purchase', provider_state: 'paid', subject_user_id: BUYER, effective_at: '2026-11-10T00:00:00.000Z' }),
      JSON.stringify({ event_id: 'e1', event_type: 'purchase', provider_state: 'active', subject_user_id: 'not-a-uuid', effective_at: '2026-11-10T00:00:00.000Z' }),
      JSON.stringify({ event_id: 'e1', event_type: 'purchase', provider_state: 'active', subject_user_id: BUYER, effective_at: 'yesterday' }),
      JSON.stringify({ event_id: 'e1', event_type: 'purchase', provider_state: 'active', subject_user_id: BUYER, effective_at: '2026-11-10T00:00:00.000Z', provider_seq: -1 }),
    ]) {
      const header = `t=${now},v1=${signWebhook(SECRET, raw, now)}`;
      const result = await ingestBillingWebhook(pool, { provider: PROVIDER, secret: SECRET, rawBody: raw, signatureHeader: header, nowSeconds: now });
      expect(result, raw.slice(0, 60)).toEqual({ kind: 'rejected', reason: 'invalid_payload' });
    }
    expect(await ledgerCount()).toBe(0);
    expect(await entitlement()).toBeNull();
  });

  it('T27 refuses a provider it does not know, without verifying anything', async () => {
    const raw = bodyOf({ eventId: 'evt-unknown-provider', type: 'purchase', state: 'active', effectiveAt: '2026-11-10T00:00:00.000Z' });
    const result = await ingestBillingWebhook(pool, {
      provider: 'stripe_live',
      secret: SECRET,
      rawBody: raw,
      signatureHeader: `t=${NOW},v1=${signWebhook(SECRET, raw, NOW)}`,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: 'rejected', reason: 'unknown_provider' });
    expect(await ledgerCount()).toBe(0);
  });
});

describe('T28 one ledger entry per event, and the state follows the provider', () => {
  it('T28 records a purchase once; sending the very same event again adds no row and moves nothing', async () => {
    const purchase: EventInput = { eventId: 'evt-p-0001', type: 'purchase', state: 'active', effectiveAt: '2026-11-10T10:00:00.000Z', seq: 10 };

    expect(await send(purchase)).toEqual({ kind: 'accepted', recorded: true, duplicate: false, entitlementChanged: true, state: 'active' });
    expect(await ledgerCount('evt-p-0001')).toBe(1);
    expect(await entitlement()).toEqual({ state: 'active', source_event_id: 'evt-p-0001' });

    // Phát lại đúng sự kiện đó, kể cả ký lại với mốc thời gian mới.
    const replay = await send(purchase, { now: NOW + 60 });
    expect(replay).toEqual({ kind: 'accepted', recorded: false, duplicate: true, entitlementChanged: false, state: 'active' });
    expect(await ledgerCount('evt-p-0001')).toBe(1);
    expect(await entitlement()).toEqual({ state: 'active', source_event_id: 'evt-p-0001' });
  });

  it('T28 a cancel for an older period arriving after the new purchase is kept in the ledger but does not move the state back', async () => {
    // Sự kiện cũ hơn (kỳ trước) tới muộn.
    const lateCancel: EventInput = { eventId: 'evt-c-0001', type: 'cancel', state: 'expired', effectiveAt: '2026-11-09T10:00:00.000Z', seq: 9 };
    const result = await send(lateCancel);
    expect(result).toEqual({ kind: 'accepted', recorded: true, duplicate: false, entitlementChanged: false, state: 'active' });
    // Sổ vẫn ghi: sự kiện đã xảy ra, không được giấu.
    expect(await ledgerCount('evt-c-0001')).toBe(1);
    // Trạng thái vẫn theo sự kiện mới nhất của nhà cung cấp.
    expect(await entitlement()).toEqual({ state: 'active', source_event_id: 'evt-p-0001' });
  });

  it('T28 a genuinely newer cancel does move the state', async () => {
    const cancel: EventInput = { eventId: 'evt-c-0002', type: 'cancel', state: 'canceled_at_period_end', effectiveAt: '2026-11-11T10:00:00.000Z', seq: 11 };
    expect(await send(cancel)).toEqual({
      kind: 'accepted',
      recorded: true,
      duplicate: false,
      entitlementChanged: true,
      state: 'canceled_at_period_end',
    });
    expect(await entitlement()).toEqual({ state: 'canceled_at_period_end', source_event_id: 'evt-c-0002' });
  });

  it('T28 two events at the same instant are ordered by the provider sequence, and an equal pair does not flip the state', async () => {
    const sameInstant = '2026-11-11T10:00:00.000Z';
    // Cùng mốc, seq nhỏ hơn: không lùi.
    const older: EventInput = { eventId: 'evt-s-0001', type: 'renew', state: 'active', effectiveAt: sameInstant, seq: 10 };
    expect((await send(older)).kind).toBe('accepted');
    expect(await entitlement()).toEqual({ state: 'canceled_at_period_end', source_event_id: 'evt-c-0002' });

    // Cùng mốc, cùng seq: cũng không lật, để hai bản sao không đổi chỗ nhau mãi.
    const equal: EventInput = { eventId: 'evt-s-0002', type: 'renew', state: 'active', effectiveAt: sameInstant, seq: 11 };
    expect((await send(equal)).kind).toBe('accepted');
    expect(await entitlement()).toEqual({ state: 'canceled_at_period_end', source_event_id: 'evt-c-0002' });

    // Cùng mốc, seq lớn hơn: mới hơn thật, nên được áp dụng.
    const newer: EventInput = { eventId: 'evt-s-0003', type: 'renew', state: 'active', effectiveAt: sameInstant, seq: 12 };
    expect((await send(newer)).kind).toBe('accepted');
    expect(await entitlement()).toEqual({ state: 'active', source_event_id: 'evt-s-0003' });
  });

  it('T28 the same event id from another provider is a different event, and one buyer never moves another buyer', async () => {
    const shared: EventInput = { eventId: 'evt-p-0001', type: 'purchase', state: 'trial', effectiveAt: '2026-11-12T10:00:00.000Z', seq: 20 };
    const raw = bodyOf(shared);
    const result = await ingestBillingWebhook(pool, {
      provider: 'sandbox_play',
      secret: SECRET,
      rawBody: raw,
      signatureHeader: `t=${NOW},v1=${signWebhook(SECRET, raw, NOW)}`,
      nowSeconds: NOW,
    });
    expect(result).toEqual({ kind: 'accepted', recorded: true, duplicate: false, entitlementChanged: true, state: 'trial' });
    expect(await ledgerCount('evt-p-0001')).toBe(2);

    expect((await send({ eventId: 'evt-o-0001', type: 'purchase', state: 'active', effectiveAt: '2026-11-12T11:00:00.000Z', seq: 1, user: OTHER })).kind).toBe('accepted');
    expect(await entitlement(OTHER)).toEqual({ state: 'active', source_event_id: 'evt-o-0001' });
    expect(await entitlement(BUYER)).toEqual({ state: 'trial', source_event_id: 'evt-p-0001' });
  });
});

describe('T28 the ledger cannot be rewritten, and clients cannot reach it', () => {
  it('T28 the ledger refuses update, delete and truncate', async () => {
    await expect(adminRows("update public.billing_events set provider_state = 'active'")).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('delete from public.billing_events')).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('truncate public.billing_events')).rejects.toMatchObject({ code: '42501' });
  });

  it('T28 a signed-in client cannot call the recording function or read the ledger', async () => {
    await expect(
      asActor(BUYER, (c) =>
        c.query("select public.record_billing_event('sandbox_b2b','evt-client-0001',$1::uuid,'purchase','active',now(),1,'{}'::jsonb)", [BUYER]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(BUYER, (c) => c.query('select count(*) from public.billing_events'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T28 a client reads its own entitlement and no one else’s', async () => {
    const own = await asActor(BUYER, (c) => c.query('select user_id, state from public.entitlements'));
    expect(own.rows.map((r) => r.user_id)).toEqual([BUYER]);
    const other = await asActor(OTHER, (c) => c.query('select user_id from public.entitlements'));
    expect(other.rows.map((r) => r.user_id)).toEqual([OTHER]);
  });

  it('T28 a client cannot write its own entitlement', async () => {
    await expect(
      asActor(BUYER, (c) => c.query("update public.entitlements set state = 'active' where user_id = $1", [BUYER])),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
