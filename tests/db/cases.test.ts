import { beforeAll, describe, expect, it } from 'vitest';
import { CASE_TRANSITION_RULES } from '@aftervia/domain';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách sở hữu món đồ
const BOB = '00000000-0000-4000-8000-0000000000b1'; // khách khác
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng A
const AGENT = '00000000-0000-4000-8000-0000000000c2'; // nhân viên cửa hàng A
const OUTSIDER = '00000000-0000-4000-8000-0000000000d1'; // chủ cửa hàng B, tổ chức khác
const SHA = 'c'.repeat(64);

function first(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return row;
}

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

interface Moved {
  version: number;
  status: string;
  outcome: string | null;
  replayed: boolean;
}

let item = '';
let orgA = '';
let orgB = '';

async function openCase(actor: string, requestId: string): Promise<string> {
  return asActor(actor, async (c) =>
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

async function move(
  actor: string,
  caseId: string,
  to: string,
  expectedVersion: number,
  requestId: string,
  outcome: string | null = null,
  reason = 'Lý do thử',
): Promise<Moved> {
  return asActor(actor, async (c) => {
    const row = (
      await c.query(
        'select out_version, out_status, out_outcome, out_replayed from public.transition_case($1::uuid, $2::text, $3::integer, $4::text, $5::text, $6::text)',
        [caseId, to, expectedVersion, reason, requestId, outcome],
      )
    ).rows[0];
    return { version: row.out_version, status: row.out_status, outcome: row.out_outcome, replayed: row.out_replayed };
  });
}

// Tài liệu của khách đã tải lên xong (kiểm chữ ký, chưa có scanner): đủ điều kiện làm bằng chứng.
async function completedDocument(actor: string, key: string): Promise<string> {
  const doc = await asActor(actor, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(actor, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(actor, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, SHA, 4096]));
  return doc;
}

async function attach(actor: string, caseId: string, doc: string): Promise<void> {
  await asActor(actor, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseId, doc]));
}

describe('WO08-02 cases: versioned transitions, append-only history, evidence and organization isolation', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)', [
        ALICE,
        'alice@test.invalid',
        BOB,
        'bob@test.invalid',
        OWNER,
        'owner@test.invalid',
        AGENT,
        'agent@test.invalid',
        OUTSIDER,
        'outsider@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng A', 'VN') as id")).rows[0].id as string);
    await asActor(OWNER, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'agent')", [orgA, AGENT]));
    orgB = await asActor(OUTSIDER, async (c) => (await c.query("select public.create_organization('Cửa hàng B', 'VN') as id")).rows[0].id as string);
    item = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string);
    expect(orgB).not.toBe(orgA);
  });

  it('T17 a customer cannot close a case, an unknown or skipped state is refused, and the case keeps its state', async () => {
    const caseId = await openCase(ALICE, 'req-t17-open-0001');
    await move(ALICE, caseId, 'submitted', 1, 'req-t17-submit-01');
    await move(OWNER, caseId, 'triaged', 2, 'req-t17-triage-01');
    await move(OWNER, caseId, 'in_progress', 3, 'req-t17-start-001');
    const doc = await completedDocument(ALICE, 'key-t17-doc-0001');
    await attach(ALICE, caseId, doc);
    await move(OWNER, caseId, 'resolved', 4, 'req-t17-resolve-1', 'repaired');
    await expect(move(ALICE, caseId, 'closed', 5, 'req-t17-close-by-customer')).rejects.toMatchObject({ code: '42501' });
    await expect(move(OWNER, caseId, 'draft', 5, 'req-t17-skip-draft-1')).rejects.toMatchObject({ code: '55000' });
    await expect(move(OWNER, caseId, 'hacked', 5, 'req-t17-unknown-st')).rejects.toMatchObject({ code: '22023' });
    expect(first(await adminRows('select status, version from public.cases where id = $1', [caseId]))).toEqual({ status: 'resolved', version: 5 });
  });

  it('T17 an organization outside the case cannot see or change it, and another customer cannot see it either', async () => {
    const caseId = await openCase(ALICE, 'req-t17-iso-open-1');
    await expect(move(OUTSIDER, caseId, 'submitted', 1, 'req-t17-iso-out-1')).rejects.toMatchObject({ code: 'P0002' });
    expect(await asActor(OUTSIDER, async (c) => (await c.query('select id from public.cases where id = $1', [caseId])).rows)).toEqual([]);
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.cases where id = $1', [caseId])).rows)).toEqual([]);
    expect(await asActor(AGENT, async (c) => (await c.query('select id from public.cases where id = $1', [caseId])).rows)).toHaveLength(1);
  });

  it('T18 two agents sending the same version at once: one succeeds, the other gets a 409, and the history has no gap', async () => {
    const caseId = await openCase(ALICE, 'req-t18-open-0001');
    await move(ALICE, caseId, 'submitted', 1, 'req-t18-submit-1');
    await move(OWNER, caseId, 'triaged', 2, 'req-t18-triage-1');
    const results = await Promise.allSettled([
      move(OWNER, caseId, 'waiting_customer', 3, 'req-t18-agent-a1', null, 'Cần ảnh hóa đơn'),
      move(AGENT, caseId, 'waiting_customer', 3, 'req-t18-agent-b1', null, 'Cần ảnh hóa đơn'),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: '40001' });
    expect(first(await adminRows('select version, status from public.cases where id = $1', [caseId]))).toEqual({ version: 4, status: 'waiting_customer' });
    const sequences = await adminRows('select sequence from public.case_events where case_id = $1 order by sequence', [caseId]);
    expect(sequences.map((r) => r.sequence)).toEqual([1, 2, 3, 4]);
  });

  it('T19 resolving needs an outcome from the allowed list and attached evidence, and a refused resolve leaves the case in progress', async () => {
    const caseId = await openCase(ALICE, 'req-t19-open-0001');
    await move(ALICE, caseId, 'submitted', 1, 'req-t19-submit-1');
    await move(OWNER, caseId, 'triaged', 2, 'req-t19-triage-1');
    await move(OWNER, caseId, 'in_progress', 3, 'req-t19-start-01');
    await expect(move(OWNER, caseId, 'resolved', 4, 'req-t19-res-noev1', 'repaired')).rejects.toMatchObject({ code: '22023' });
    const doc = await completedDocument(ALICE, 'key-t19-doc-0001');
    await attach(ALICE, caseId, doc);
    await expect(move(OWNER, caseId, 'resolved', 4, 'req-t19-res-noout1')).rejects.toMatchObject({ code: '22023' });
    await expect(move(OWNER, caseId, 'resolved', 4, 'req-t19-res-badout', 'sent')).rejects.toMatchObject({ code: '22023' });
    expect(first(await adminRows('select status, version, outcome from public.cases where id = $1', [caseId]))).toEqual({
      status: 'in_progress',
      version: 4,
      outcome: null,
    });
    expect(await move(OWNER, caseId, 'resolved', 4, 'req-t19-res-ok-01', 'refunded')).toEqual({
      version: 5,
      status: 'resolved',
      outcome: 'refunded',
      replayed: false,
    });
  });

  it('T19 a withdrawn case is not resolved: only the customer can withdraw it, and it cannot be resolved or closed afterwards', async () => {
    const caseId = await openCase(ALICE, 'req-t19-wd-open-1');
    await move(ALICE, caseId, 'submitted', 1, 'req-t19-wd-sub-1');
    await expect(move(OWNER, caseId, 'withdrawn', 2, 'req-t19-wd-bymer')).rejects.toMatchObject({ code: '42501' });
    expect(await move(ALICE, caseId, 'withdrawn', 2, 'req-t19-wd-cust-1', null, 'Không còn cần nữa')).toEqual({
      version: 3,
      status: 'withdrawn',
      outcome: null,
      replayed: false,
    });
    await expect(move(OWNER, caseId, 'triaged', 3, 'req-t19-wd-after-1')).rejects.toMatchObject({ code: '55000' });
  });

  it('T20 reopening needs a reason, is recorded as a reopen event that returns the case to triaged, and keeps the earlier outcome', async () => {
    const caseId = await openCase(ALICE, 'req-t20-open-0001');
    await move(ALICE, caseId, 'submitted', 1, 'req-t20-sub-0001');
    await move(OWNER, caseId, 'triaged', 2, 'req-t20-tri-0001');
    await move(OWNER, caseId, 'in_progress', 3, 'req-t20-prg-0001');
    const doc = await completedDocument(ALICE, 'key-t20-doc-0001');
    await attach(ALICE, caseId, doc);
    await move(OWNER, caseId, 'resolved', 4, 'req-t20-res-0001', 'repaired');
    await expect(move(OWNER, caseId, 'triaged', 5, 'req-t20-merreo-1', null, 'Mở lại')).rejects.toMatchObject({ code: '42501' });
    await expect(move(ALICE, caseId, 'triaged', 5, 'req-t20-noreas-1', null, '   ')).rejects.toMatchObject({ code: '22023' });
    expect(await move(ALICE, caseId, 'triaged', 5, 'req-t20-reopen-1', null, 'Lỗi vẫn còn sau sửa')).toEqual({
      version: 6,
      status: 'triaged',
      outcome: 'repaired',
      replayed: false,
    });
    expect(
      first(
        await adminRows(
          'select type, from_state, to_state, outcome_after, reason from public.case_events where case_id = $1 order by sequence desc limit 1',
          [caseId],
        ),
      ),
    ).toEqual({ type: 'reopen', from_state: 'resolved', to_state: 'triaged', outcome_after: 'repaired', reason: 'Lỗi vẫn còn sau sửa' });
    expect(first(await adminRows('select outcome from public.cases where id = $1', [caseId]))).toEqual({ outcome: 'repaired' });
  });

  it('T18 a repeated request returns the earlier result without a new event, and the history cannot be changed or deleted', async () => {
    const caseId = await openCase(ALICE, 'req-t18-rep-open-1');
    const once = await move(ALICE, caseId, 'submitted', 1, 'req-t18-rep-sub-1');
    const again = await move(ALICE, caseId, 'submitted', 1, 'req-t18-rep-sub-1');
    expect(again).toEqual({ ...once, replayed: true });
    expect(first(await adminRows('select count(*)::int as n from public.case_events where case_id = $1', [caseId]))).toEqual({ n: 2 });
    await expect(move(OWNER, caseId, 'triaged', 2, 'req-t18-rep-sub-1')).rejects.toMatchObject({ code: '23505' });
    await expect(adminRows('update public.case_events set reason = $2 where case_id = $1', [caseId, 'sửa'])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('delete from public.case_events where case_id = $1', [caseId])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('truncate public.case_events')).rejects.toMatchObject({ code: '42501' });
  });

  it('T17 clients cannot write the case tables directly, and an anonymous caller sees nothing', async () => {
    const caseId = await openCase(ALICE, 'req-t17-direct-01');
    await expect(asActor(ALICE, (c) => c.query("update public.cases set status = 'closed' where id = $1", [caseId]))).rejects.toMatchObject({
      code: '42501',
    });
    await expect(
      asActor(ALICE, (c) =>
        c.query(
          "insert into public.case_events (case_id, sequence, version, actor_user_id, actor_role, type, to_state, reason, request_id) values ($1, 9, 9, $2, 'customer', 'transition', 'closed', 'x', 'req-forged-1')",
          [caseId, ALICE],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(null, (c) => c.query('select id from public.cases'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T17 the database transition rules match the domain allowlist exactly', async () => {
    const key = (r: { from_state: string; to_state: string }): string => `${r.from_state}>${r.to_state}`;
    const byKey = (a: { from_state: string; to_state: string }, b: { from_state: string; to_state: string }): number =>
      key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
    const dbRows = (await adminRows('select from_state, to_state, actor_role, reopen from public.case_transition_rules')).map((r) => ({
      from_state: r.from_state as string,
      to_state: r.to_state as string,
      actor_role: r.actor_role as string,
      reopen: r.reopen as boolean,
    }));
    const domainRows = CASE_TRANSITION_RULES.map((r) => ({
      from_state: r.from as string,
      to_state: r.to as string,
      actor_role: r.actor as string,
      reopen: r.reopen === true,
    }));
    expect(dbRows).toHaveLength(20);
    expect([...dbRows].sort(byKey)).toEqual([...domainRows].sort(byKey));
  });
});
