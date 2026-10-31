import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách: sở hữu case, tải tài liệu, cấp grant
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng
const PARTNER = '00000000-0000-4000-8000-0000000000e1'; // partner sẽ yêu cầu xóa tài khoản
const PARTNER3 = '00000000-0000-4000-8000-0000000000e3'; // partner khác, không liên quan đến yêu cầu xóa
const STRANGER = '00000000-0000-4000-8000-0000000000f1'; // không có quan hệ với case
const SHA = 'd'.repeat(64);

interface Access {
  out_allowed: boolean;
  out_can_download: boolean;
  out_reason: string;
}

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

let orgA = '';
let item = '';
let caseA = '';
let doc1 = '';
let grantP = '';
let grantQ = '';
let receiptFirst: Record<string, unknown> = {};

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

async function completedDocument(key: string): Promise<string> {
  const doc = await asActor(ALICE, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(ALICE, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(ALICE, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, SHA, 4096]));
  return doc;
}

async function invite(partner: string, interval: string): Promise<string> {
  return asActor(ALICE, async (c) =>
    (await c.query('select public.invite_case_participant($1::uuid, $2::uuid, now() + $3::interval) as id', [caseA, partner, interval])).rows[0]
      .id as string,
  );
}

async function grant(doc: string, recipient: string, canDownload: boolean, interval: string): Promise<string> {
  return asActor(ALICE, async (c) =>
    (
      await c.query('select public.grant_case_document($1::uuid, $2::uuid, $3::uuid, $4::boolean, now() + $5::interval) as id', [
        caseA,
        doc,
        recipient,
        canDownload,
        interval,
      ])
    ).rows[0].id as string,
  );
}

async function check(actor: string, caseId: string, doc: string): Promise<Access> {
  return asActor(actor, async (c) =>
    (await c.query('select out_allowed, out_can_download, out_reason from public.check_document_access($1::uuid, $2::uuid)', [caseId, doc]))
      .rows[0] as Access,
  );
}

async function requestDeletion(actor: string, requestId: string): Promise<Record<string, unknown>> {
  return asActor(actor, async (c) =>
    (await c.query('select public.request_account_deletion($1::text) as r', [requestId])).rows[0].r as Record<string, unknown>,
  );
}

describe('WO11-02 account deletion slice: revoke access, tombstone and reapply after restore', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)', [
        ALICE,
        'alice@test.invalid',
        OWNER,
        'owner@test.invalid',
        PARTNER,
        'partner@test.invalid',
        PARTNER3,
        'partner3@test.invalid',
        STRANGER,
        'stranger@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng A', 'VN') as id")).rows[0].id as string);
    item = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string);
    caseA = await openCase('req-del-open-a1');
    doc1 = await completedDocument('key-del-doc-0001');
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, doc1]));
    await invite(PARTNER, '7 days');
    await invite(PARTNER3, '7 days');
    grantP = await grant(doc1, PARTNER, false, '1 day');
    grantQ = await grant(doc1, PARTNER3, false, '1 day');
  });

  it('T25 a partner who asks for deletion loses every grant and case access at once, and the receipt names what is still pending', async () => {
    expect(await check(PARTNER, caseA, doc1)).toMatchObject({ out_allowed: true });
    receiptFirst = await requestDeletion(PARTNER, 'req-del-partner-0001');
    expect(receiptFirst).toMatchObject({
      request_id: 'req-del-partner-0001',
      status: 'PENDING_POLICY',
      access_revoked: { grants: 1, participants: 1 },
    });
    expect(receiptFirst.pending).toEqual(
      expect.arrayContaining(['primary_data_erasure', 'retention_policy', 'session_revocation', 'identity_verification']),
    );
    expect((await check(PARTNER, caseA, doc1)).out_allowed).toBe(false);
    expect((await check(PARTNER3, caseA, doc1)).out_allowed).toBe(true);
    expect(first(await adminRows('select deletion_status from public.profiles where id = $1', [PARTNER])).deletion_status).toBe('PENDING_DELETION');
    expect(first(await adminRows("select count(*)::int as n from public.audit_events where action = 'account.delete.requested' and object_id = $1", [PARTNER])).n).toBe(1);
  });

  it('T25 the same request ID returns the same receipt and writes no second request or audit record', async () => {
    const again = await requestDeletion(PARTNER, 'req-del-partner-0001');
    expect(again).toEqual(receiptFirst);
    expect(first(await adminRows('select count(*)::int as n from public.account_deletion_requests where user_id = $1', [PARTNER])).n).toBe(1);
    expect(first(await adminRows("select count(*)::int as n from public.audit_events where action = 'account.delete.requested' and object_id = $1", [PARTNER])).n).toBe(1);
  });

  it('T25 a new request ID from the same account returns the first receipt and creates no second tombstone', async () => {
    const other = await requestDeletion(PARTNER, 'req-del-partner-0002');
    expect(other).toEqual(receiptFirst);
    expect(first(await adminRows('select count(*)::int as n from public.account_tombstones where user_id = $1', [PARTNER])).n).toBe(1);
  });

  it('T25 a request ID that belongs to another account is refused and changes nothing of that account', async () => {
    await expect(requestDeletion(STRANGER, 'req-del-partner-0001')).rejects.toMatchObject({ code: '42501' });
    expect(first(await adminRows('select deletion_status from public.profiles where id = $1', [STRANGER])).deletion_status).toBe('ACTIVE');
    expect(await adminRows('select 1 from public.account_tombstones where user_id = $1', [STRANGER])).toEqual([]);
  });

  it('T25 an anonymous caller cannot request deletion, and no end user can write tombstones directly', async () => {
    await expect(
      asActor(null, async (c) => c.query('select public.request_account_deletion($1::text)', ['req-anon-0001'])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(STRANGER, async (c) =>
        c.query("insert into public.account_tombstones (user_id, request_id) values ($1, 'req-del-partner-0001')", [STRANGER]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T26 restoring a backup taken before the deletion does not bring the revoked access back, and the tombstone reapplies it', async () => {
    // Mô phỏng khôi phục backup cũ: đưa lại grant, người tham gia và trạng thái hồ sơ như trước yêu cầu xóa.
    await adminRows('update public.case_document_grants set revoked_at = null, revoked_by = null where id = $1', [grantP]);
    await adminRows('update public.case_participants set revoked_at = null, revoked_by = null where actor_id = $1', [PARTNER]);
    await adminRows("update public.profiles set deletion_status = 'ACTIVE' where id = $1", [PARTNER]);
    expect((await check(PARTNER, caseA, doc1)).out_allowed).toBe(true);
    const applied = first(await adminRows('select public.reapply_account_tombstones() as n'));
    expect(applied.n).toBeGreaterThanOrEqual(1);
    expect((await check(PARTNER, caseA, doc1)).out_allowed).toBe(false);
    expect(first(await adminRows('select deletion_status from public.profiles where id = $1', [PARTNER])).deletion_status).toBe('PENDING_DELETION');
  });

  it('T26 an end user cannot run the reapply step', async () => {
    await expect(asActor(PARTNER, async (c) => c.query('select public.reapply_account_tombstones()'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T25 when the customer who granted documents asks for deletion, the grants they issued to partners are revoked too', async () => {
    expect((await check(PARTNER3, caseA, doc1)).out_allowed).toBe(true);
    const receipt = await requestDeletion(ALICE, 'req-del-alice-0001');
    expect(receipt).toMatchObject({ access_revoked: { grants: 1 } });
    expect((await check(PARTNER3, caseA, doc1)).out_allowed).toBe(false);
    expect(first(await adminRows('select deletion_status from public.profiles where id = $1', [ALICE])).deletion_status).toBe('PENDING_DELETION');
    expect(grantQ).not.toBe('');
  });
});
