import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách sở hữu case và tài liệu
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng
const PARTNER = '00000000-0000-4000-8000-0000000000e1'; // partner được mời vào case A
const PARTNER2 = '00000000-0000-4000-8000-0000000000e2'; // partner thứ hai, dùng để kiểm hết hạn
const PARTNER3 = '00000000-0000-4000-8000-0000000000e3'; // partner thứ ba, dùng để kiểm phạm vi
const STRANGER = '00000000-0000-4000-8000-0000000000f1'; // không có quan hệ với case
const SHA = 'd'.repeat(64);

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

interface Access {
  out_allowed: boolean;
  out_can_download: boolean;
  out_reason: string;
}

let orgA = '';
let item = '';
let caseA = '';
let caseB = '';
let doc1 = '';
let doc2 = '';
let partA = '';
let grantA = '';
let grantB = '';

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

async function visibleCaseIds(actor: string): Promise<string[]> {
  const rows = await asActor(actor, async (c) =>
    (await c.query('select id from public.cases where id = $1 or id = $2', [caseA, caseB])).rows,
  );
  return rows.map((r) => r.id as string);
}

describe('WO09-01 partners and document grants: scope, revocation and expiry', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10), ($11, $12)', [
        ALICE,
        'alice@test.invalid',
        OWNER,
        'owner@test.invalid',
        PARTNER,
        'partner@test.invalid',
        PARTNER2,
        'partner2@test.invalid',
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
    caseA = await openCase('req-share-open-a1');
    caseB = await openCase('req-share-open-b1');
    doc1 = await completedDocument('key-share-doc-0001');
    doc2 = await completedDocument('key-share-doc-0002');
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, doc1]));
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseB, doc2]));
  });

  it('T07 a partner sees only the case they were invited to, and only the files granted to them on that case', async () => {
    partA = await invite(PARTNER, '7 days');
    expect(await visibleCaseIds(PARTNER)).toEqual([caseA]);
    expect(await check(PARTNER, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'no_grant' });
    grantA = await grant(doc1, PARTNER, false, '1 day');
    expect(await check(PARTNER, caseA, doc1)).toEqual({ out_allowed: true, out_can_download: false, out_reason: 'granted' });
  });

  it('T07 a partner who uses another case\'s ID or a file of another case is refused for both the detail and the document', async () => {
    expect(await asActor(PARTNER, async (c) => (await c.query('select id from public.cases where id = $1', [caseB])).rows)).toEqual([]);
    expect(await check(PARTNER, caseB, doc2)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'not_allowed' });
    expect(await check(PARTNER, caseA, doc2)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'document_not_in_case' });
  });

  it('T07 a stranger cannot be granted a file, and sees no case or document of the customer', async () => {
    expect(await visibleCaseIds(STRANGER)).toEqual([]);
    expect(await check(STRANGER, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'not_allowed' });
    await expect(grant(doc1, STRANGER, false, '1 day')).rejects.toMatchObject({ code: '55000' });
  });

  it('T08 revoking a grant blocks the next read at once, and the revoked state is explained', async () => {
    expect(await check(PARTNER, caseA, doc1)).toMatchObject({ out_allowed: true });
    await asActor(ALICE, (c) => c.query('select public.revoke_case_document_grant($1::uuid)', [grantA]));
    expect(await check(PARTNER, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'grant_revoked' });
    expect(await visibleCaseIds(PARTNER)).toEqual([caseA]);
    await asActor(ALICE, (c) => c.query('select public.revoke_case_document_grant($1::uuid)', [grantA]));
  });

  it('T08 revoking a participant blocks the case and every grant of that partner at once', async () => {
    grantB = await grant(doc1, PARTNER, true, '1 day');
    expect(await check(PARTNER, caseA, doc1)).toEqual({ out_allowed: true, out_can_download: true, out_reason: 'granted' });
    const revoked = await asActor(ALICE, async (c) => (await c.query('select public.revoke_case_participant($1::uuid) as n', [partA])).rows[0].n);
    expect(revoked).toBe(1);
    expect(await visibleCaseIds(PARTNER)).toEqual([]);
    expect(await check(PARTNER, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'participant_revoked' });
    expect(first(await adminRows('select revoked_at is not null as r, revoked_by from public.case_document_grants where id = $1', [grantB]))).toEqual({
      r: true,
      revoked_by: ALICE,
    });
  });

  it('T08 an expired grant or an expired participation is refused, and the database enforces the expiry', async () => {
    const partB = await invite(PARTNER2, '7 days');
    const gB = await grant(doc1, PARTNER2, false, '1 day');
    expect(await check(PARTNER2, caseA, doc1)).toMatchObject({ out_allowed: true });
    await adminRows("update public.case_document_grants set expires_at = now() - interval '1 minute' where id = $1", [gB]);
    expect(await check(PARTNER2, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'grant_expired' });
    await adminRows("update public.case_participants set expires_at = now() - interval '1 minute' where id = $1", [partB]);
    expect(await check(PARTNER2, caseA, doc1)).toEqual({ out_allowed: false, out_can_download: false, out_reason: 'participant_expired' });
    expect(await visibleCaseIds(PARTNER2)).toEqual([]);
  });

  it('T07 T08 a grant is never a wildcard: one file, one recipient, an expiry within 30 days, and no second active grant', async () => {
    await invite(PARTNER3, '7 days');
    await expect(grant(doc1, PARTNER3, false, '60 days')).rejects.toMatchObject({ code: '22023' });
    await expect(grant(doc2, PARTNER3, false, '1 day')).rejects.toMatchObject({ code: '22023' });
    await grant(doc1, PARTNER3, false, '1 day');
    await expect(grant(doc1, PARTNER3, true, '1 day')).rejects.toMatchObject({ code: '23505' });
    await expect(invite(PARTNER3, '7 days')).rejects.toMatchObject({ code: '23505' });
  });

  it('T07 T08 a recipient reads only their own rows, and clients cannot write participants or grants directly', async () => {
    const own = await asActor(PARTNER3, async (c) => (await c.query('select recipient_id from public.case_document_grants')).rows);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.recipient_id === PARTNER3)).toBe(true);
    expect(await asActor(STRANGER, async (c) => (await c.query('select id from public.case_document_grants')).rows)).toEqual([]);
    await expect(
      asActor(PARTNER3, (c) =>
        c.query("insert into public.case_document_grants (case_id, document_id, recipient_id, granted_by, expires_at) values ($1, $2, $3, $3, now() + interval '1 day')", [
          caseA,
          doc1,
          PARTNER3,
        ]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(PARTNER3, (c) =>
        c.query("insert into public.case_participants (case_id, actor_id, role, invited_by, expires_at) values ($1, $2, 'partner', $2, now() + interval '1 day')", [
          caseA,
          PARTNER3,
        ]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(null, (c) => c.query('select id from public.case_document_grants'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T08 each invite, grant and revoke writes its own audit event', async () => {
    const count = async (action: string): Promise<number> =>
      first(await adminRows('select count(*)::int as n from public.audit_events where action = $2 and object_id = $1', [caseA, action])).n as number;
    expect(await count('case.participant.invite')).toBe(3);
    expect(await count('case.grant.create')).toBe(4);
    expect(await count('case.grant.revoke')).toBe(1);
    expect(await count('case.participant.revoke')).toBe(1);
  });
});
