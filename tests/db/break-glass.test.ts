import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO16-02, mã T42: break-glass hỗ trợ có phê duyệt, hạn và audit. Hỗ trợ viên không có phê duyệt, hoặc đã hết hạn,
// không xem được dữ liệu case; lần đọc có phê duyệt được ghi audit.
const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách mở case
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng A, chủ tổ chức có case
const SUPPORT = '00000000-0000-4000-8000-0000000000f2'; // hỗ trợ viên đã đăng ký
const STRANGER = '00000000-0000-4000-8000-0000000000f1'; // không có quyền hỗ trợ
const OUTSIDER = '00000000-0000-4000-8000-0000000000d1'; // chủ cửa hàng B, tổ chức khác
const BG_REQUEST = 'req-bg-request-01';

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

function count(rows: Array<Record<string, unknown>>): number {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return Number(row.n);
}

let item = '';
let orgA = '';
let caseA = '';
let bgId = '';

async function openCase(requestId: string): Promise<string> {
  return asActor(ALICE, async (c) =>
    (
      await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [
        item,
        orgA,
        'Máy không lên nguồn',
        requestId,
      ])
    ).rows[0].out_case_id as string,
  );
}

async function move(actor: string, caseId: string, to: string, expectedVersion: number, requestId: string): Promise<void> {
  await asActor(actor, (c) =>
    c.query('select out_version from public.transition_case($1::uuid, $2::text, $3::integer, $4::text, $5::text, $6::text)', [
      caseId,
      to,
      expectedVersion,
      'Lý do thử',
      requestId,
      null,
    ]),
  );
}

async function requestBreakGlass(actor: string, requestId: string, caseId: string, reason: string): Promise<string> {
  return asActor(actor, async (c) =>
    (await c.query('select public.request_break_glass($1::text, $2::uuid, $3::text) as id', [requestId, caseId, reason])).rows[0].id as string,
  );
}

async function approve(actor: string, requestUuid: string, minutes: number): Promise<unknown> {
  return asActor(actor, async (c) => (await c.query('select public.approve_break_glass($1::uuid, $2::integer) as at', [requestUuid, minutes])).rows[0].at);
}

async function read(actor: string, requestUuid: string): Promise<Record<string, unknown>> {
  return asActor(actor, async (c) =>
    (await c.query('select public.read_case_for_break_glass($1::uuid) as r', [requestUuid])).rows[0].r as Record<string, unknown>,
  );
}

describe('WO16-02 break-glass (T42): approval, expiry and audit', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)', [
        ALICE,
        'alice@test.invalid',
        OWNER,
        'owner@test.invalid',
        SUPPORT,
        'support@test.invalid',
        STRANGER,
        'stranger@test.invalid',
        OUTSIDER,
        'outsider@test.invalid',
      ]);
      await admin.query('insert into public.support_staff (user_id) values ($1)', [SUPPORT]);
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng A', 'VN') as id")).rows[0].id as string);
    await asActor(OUTSIDER, (c) => c.query("select public.create_organization('Cửa hàng B', 'VN')"));
    item = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string,
    );
    caseA = await openCase('req-bg-open-a1');
    await move(ALICE, caseA, 'submitted', 1, 'req-bg-sub-0001');
    await move(OWNER, caseA, 'triaged', 2, 'req-bg-tri-0001');
    bgId = await requestBreakGlass(SUPPORT, BG_REQUEST, caseA, 'Khách báo máy không lên nguồn, cần xem lịch sử');
  });

  it('T42 a support user with no approval reads no case data, and the refusal is recorded', async () => {
    const r = await read(SUPPORT, bgId);
    expect(r).toEqual({ allowed: false, reason: 'not_approved' });
    expect(r).not.toHaveProperty('case');
    expect(r).not.toHaveProperty('events');
    expect(count(await adminRows("select count(*)::int as n from public.audit_events where action = 'support.break_glass.denied' and request_id = $1", [BG_REQUEST]))).toBe(1);
  });

  it('T42 the requester cannot approve, a customer or an owner of another organization cannot approve, and a window over 120 minutes is refused', async () => {
    await expect(approve(SUPPORT, bgId, 60)).rejects.toMatchObject({ code: '42501' });
    await expect(approve(ALICE, bgId, 60)).rejects.toMatchObject({ code: '42501' });
    await expect(approve(OUTSIDER, bgId, 60)).rejects.toMatchObject({ code: '42501' });
    await expect(approve(OWNER, bgId, 121)).rejects.toMatchObject({ code: '22023' });
    expect(count(await adminRows('select count(*)::int as n from public.break_glass_requests where id = $1 and approved_at is null', [bgId]))).toBe(1);
  });

  it('T42 after the case owner approves for a limited time, the requester reads the case, and each read is audited', async () => {
    await approve(OWNER, bgId, 60);
    expect(count(await adminRows("select count(*)::int as n from public.audit_events where action = 'support.break_glass.approved' and request_id = $1", [BG_REQUEST]))).toBe(1);
    const r = await read(SUPPORT, bgId);
    expect(r.allowed).toBe(true);
    expect((r.case as { id: string }).id).toBe(caseA);
    const events = r.events as Array<Record<string, unknown>>;
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((e) => !('reason' in e) && !('actor_user_id' in e))).toBe(true);
    expect(JSON.stringify(r)).not.toContain('Khách báo');
    expect(count(await adminRows("select count(*)::int as n from public.audit_events where action = 'support.break_glass.read' and request_id = $1", [BG_REQUEST]))).toBe(1);
  });

  it('T42 an approval that has expired gives no case data, and the refusal is recorded', async () => {
    await adminRows("update public.break_glass_requests set expires_at = now() - interval '1 minute' where request_id = $1", [BG_REQUEST]);
    const r = await read(SUPPORT, bgId);
    expect(r).toEqual({ allowed: false, reason: 'expired' });
    expect(count(await adminRows("select count(*)::int as n from public.audit_events where action = 'support.break_glass.denied' and request_id = $1 and details->>'reason' = 'expired'", [BG_REQUEST]))).toBe(1);
  });

  it('T42 a user who is not support staff cannot register or read, and a revoked support user loses access at once', async () => {
    await expect(requestBreakGlass(STRANGER, 'req-bg-stranger-01', caseA, 'Hỏi thử từ người không có quyền')).rejects.toMatchObject({ code: '42501' });
    await expect(read(ALICE, bgId)).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(null, async (c) => c.query('select public.read_case_for_break_glass($1::uuid)', [bgId])),
    ).rejects.toMatchObject({ code: '42501' });
    await adminRows('update public.support_staff set revoked_at = now() where user_id = $1', [SUPPORT]);
    await expect(read(SUPPORT, bgId)).rejects.toMatchObject({ code: '42501' });
  });
});
