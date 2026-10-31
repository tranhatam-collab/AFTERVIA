import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách sở hữu case và tài liệu
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng
const PARTNER = '00000000-0000-4000-8000-0000000000e1'; // partner được mời vào case A
const SHA = 'e'.repeat(64);

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

interface Read {
  out_allowed: boolean;
  out_reason: string;
  out_notice: string | null;
}

let orgA = '';
let item = '';
let caseA = '';
let caseB = '';
let doc1 = '';
let doc2 = '';
let partA = '';
let grantView = '';
let grantDownload = '';

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

async function grantDoc(doc: string, canDownload: boolean, interval: string): Promise<string> {
  return asActor(ALICE, async (c) =>
    (
      await c.query('select public.grant_case_document($1::uuid, $2::uuid, $3::uuid, $4::boolean, now() + $5::interval) as id', [
        caseA,
        doc,
        PARTNER,
        canDownload,
        interval,
      ])
    ).rows[0].id as string,
  );
}

async function read(actor: string, caseId: string, doc: string, mode: string): Promise<Read> {
  return asActor(actor, async (c) =>
    (await c.query('select out_allowed, out_reason, out_notice from public.read_case_document($1::uuid, $2::uuid, $3::text)', [caseId, doc, mode]))
      .rows[0] as Read,
  );
}

async function auditCount(action: string, doc: string): Promise<number> {
  return first(await adminRows('select count(*)::int as n from public.audit_events where action = $1 and object_id = $2', [action, doc])).n as number;
}

async function deniedCount(doc: string, reason: string): Promise<number> {
  return first(
    await adminRows(
      "select count(*)::int as n from public.audit_events where action = 'document.read.denied' and object_id = $1 and details->>'reason' = $2",
      [doc, reason],
    ),
  ).n as number;
}

describe('WO09-02 document read proxy: per-read authorization, audit, revocation and no URLs', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6)', [
        ALICE,
        'alice@test.invalid',
        OWNER,
        'owner@test.invalid',
        PARTNER,
        'partner@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng A', 'VN') as id")).rows[0].id as string);
    item = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string);
    caseA = await openCase('req-read-open-a1');
    caseB = await openCase('req-read-open-b1');
    doc1 = await completedDocument('key-read-doc-0001');
    doc2 = await completedDocument('key-read-doc-0002');
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, doc1]));
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseB, doc2]));
    partA = await asActor(ALICE, async (c) =>
      (await c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '7 days') as id", [caseA, PARTNER])).rows[0].id as string,
    );
  });

  it('T07 a granted view is allowed with a notice and audited, and a file of another case or an ungranted file is denied and audited', async () => {
    grantView = await grantDoc(doc1, false, '1 day');
    expect(await read(PARTNER, caseA, doc1, 'view')).toEqual({
      out_allowed: true,
      out_reason: 'granted',
      out_notice: 'revocation_limits_copies',
    });
    expect(await read(PARTNER, caseB, doc2, 'view')).toEqual({ out_allowed: false, out_reason: 'not_allowed', out_notice: null });
    expect(await read(PARTNER, caseA, doc2, 'view')).toEqual({ out_allowed: false, out_reason: 'document_not_in_case', out_notice: null });
    expect(await auditCount('document.read', doc1)).toBe(1);
    expect(await auditCount('document.read.denied', doc2)).toBe(2);
  });

  it('T07 a view-only grant refuses a download, and the refusal is audited with its reason', async () => {
    expect(await read(PARTNER, caseA, doc1, 'download')).toEqual({ out_allowed: false, out_reason: 'download_not_permitted', out_notice: null });
    expect(await deniedCount(doc1, 'download_not_permitted')).toBe(1);
  });

  it('T08 revoking a grant blocks the next read at once, and the earlier allowed read stays in the audit history', async () => {
    await asActor(ALICE, (c) => c.query('select public.revoke_case_document_grant($1::uuid)', [grantView]));
    expect(await read(PARTNER, caseA, doc1, 'view')).toEqual({ out_allowed: false, out_reason: 'grant_revoked', out_notice: null });
    expect(await auditCount('document.read', doc1)).toBe(1);
    expect(await deniedCount(doc1, 'grant_revoked')).toBe(1);
  });

  it('T08 an expired grant is refused on the next read, and the database enforces the expiry', async () => {
    grantDownload = await grantDoc(doc1, true, '1 day');
    expect(await read(PARTNER, caseA, doc1, 'download')).toEqual({
      out_allowed: true,
      out_reason: 'granted',
      out_notice: 'revocation_limits_copies',
    });
    await adminRows("update public.case_document_grants set expires_at = now() - interval '1 minute' where id = $1", [grantDownload]);
    expect(await read(PARTNER, caseA, doc1, 'download')).toEqual({ out_allowed: false, out_reason: 'grant_expired', out_notice: null });
    expect(await deniedCount(doc1, 'grant_expired')).toBe(1);
  });

  it('T08 revoking the participant blocks every read of that case at once', async () => {
    await asActor(ALICE, (c) => c.query('select public.revoke_case_participant($1::uuid)', [partA]));
    expect(await read(PARTNER, caseA, doc1, 'view')).toEqual({ out_allowed: false, out_reason: 'participant_revoked', out_notice: null });
  });

  it('T38 a read takes only identifiers: a URL-like input is refused by type with no read recorded, and no URL column exists in the document tables', async () => {
    const before = await adminRows("select count(*)::int as n from public.audit_events where action like 'document.read%' and object_id = $1", [doc1]);
    await expect(
      asActor(PARTNER, (c) => c.query("select * from public.read_case_document($1::uuid, 'https://evil.example/doc.pdf'::uuid, 'view')", [caseA])),
    ).rejects.toMatchObject({ code: '22P02' });
    expect(await adminRows("select count(*)::int as n from public.audit_events where action like 'document.read%' and object_id = $1", [doc1])).toEqual(before);
    expect(
      await adminRows(
        "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name in ('documents', 'cases', 'case_evidence', 'case_document_grants', 'case_participants') and column_name ilike '%url%'",
      ),
    ).toEqual([]);
  });

  it('T07 an unauthenticated caller cannot read, an unknown mode is refused, and a refused call is not counted as a read', async () => {
    const reads = await auditCount('document.read', doc1);
    await expect(asActor(null, (c) => c.query("select * from public.read_case_document($1::uuid, $2::uuid, 'view')", [caseA, doc1]))).rejects.toMatchObject({
      code: '42501',
    });
    await expect(asActor(PARTNER, (c) => c.query("select * from public.read_case_document($1::uuid, $2::uuid, 'stream')", [caseA, doc1]))).rejects.toMatchObject({
      code: '22023',
    });
    expect(await auditCount('document.read', doc1)).toBe(reads);
    expect(await asActor(ALICE, async (c) => (await c.query('select out_allowed, out_reason from public.read_case_document($1::uuid, $2::uuid, $3::text)', [caseA, doc1, 'download'])).rows[0])).toEqual({
      out_allowed: true,
      out_reason: 'owner',
    });
  });

  it('T07 a document that is not clean or scanner-approved is never served, not even to its owner', async () => {
    const doc3 = await completedDocument('key-read-doc-0003');
    await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, doc3]));
    await adminRows("update public.documents set scan_status = 'QUARANTINED' where id = $1", [doc3]);
    expect(await read(ALICE, caseA, doc3, 'view')).toEqual({ out_allowed: false, out_reason: 'document_not_readable', out_notice: null });
    expect(await deniedCount(doc3, 'document_not_readable')).toBe(1);
  });
});
