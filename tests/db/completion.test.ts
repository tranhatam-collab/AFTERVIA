import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';
const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);

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

// Tạo ticket của Alice rồi ghi kết quả kiểm chữ ký: định dạng đúng nhưng chưa có scanner.
async function newInspectedDocument(mime: string, size: number): Promise<string> {
  const doc = await asActor(ALICE, async (c) =>
    (await c.query('select out_document_id from public.create_upload_ticket($1, $2)', [mime, size])).rows[0].out_document_id as string,
  );
  await asActor(ALICE, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', $2, $3)", [doc, mime, size]),
  );
  return doc;
}

async function complete(doc: string, key: string, sha: string, size: number, actor = ALICE): Promise<Record<string, unknown>> {
  return asActor(actor, async (c) =>
    (await c.query('select out_completion_id, out_replayed from public.complete_upload($1, $2, $3, $4)', [doc, key, sha, size])).rows[0],
  );
}

describe('WO05-03 idempotent upload completion in Postgres', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
    await asActor(ALICE, (c) => c.query("select public.create_item('Máy pha cà phê', null, null, null, null)"));
  });

  it('T10 a repeated completion with the same key returns the same record and writes nothing new', async () => {
    const itemsBefore = first(await adminRows('select count(*)::int as n from public.items'));
    const doc = await newInspectedDocument('image/png', 4096);
    const first_ = await complete(doc, 'key-00000001', SHA_A, 4096);
    expect(first_.out_replayed).toBe(false);
    for (let i = 0; i < 3; i += 1) {
      const again = await complete(doc, 'key-00000001', SHA_A, 4096);
      expect(again.out_completion_id).toBe(first_.out_completion_id);
      expect(again.out_replayed).toBe(true);
    }
    const counts = first(await adminRows(
      `select (select count(*)::int from public.upload_completions where document_id = $1::uuid) as completions,
              (select count(*)::int from public.audit_events where action = 'document.complete' and object_id = $2::text) as audits`,
      [doc, doc],
    ));
    expect(counts).toEqual({ completions: 1, audits: 1 });
    expect(first(await adminRows('select count(*)::int as n from public.items'))).toEqual(itemsBefore);
  });

  it('T10 a key reused for another document, or a different hash for a completed document, is refused with 23505', async () => {
    const doc = await newInspectedDocument('application/pdf', 1024);
    await expect(complete(doc, 'key-00000001', SHA_A, 1024)).rejects.toMatchObject({ code: '23505' });

    const done = await newInspectedDocument('image/jpeg', 2048);
    await complete(done, 'key-00000002', SHA_A, 2048);
    await expect(complete(done, 'key-00000003', SHA_B, 2048)).rejects.toMatchObject({ code: '23505' });
  });

  it('T10 a document still pending or quarantined cannot be completed', async () => {
    const pending = await asActor(ALICE, async (c) =>
      (await c.query("select out_document_id from public.create_upload_ticket('image/png', 512)")).rows[0].out_document_id as string,
    );
    await expect(complete(pending, 'key-00000010', SHA_A, 512)).rejects.toMatchObject({ code: '55000' });

    const quarantined = await asActor(ALICE, async (c) =>
      (await c.query("select out_document_id from public.create_upload_ticket('image/jpeg', 2048)")).rows[0].out_document_id as string,
    );
    await asActor(ALICE, (c) =>
      c.query("select public.record_upload_inspection($1, 'QUARANTINED', 'mime_mismatch', 'image/png', 2048)", [quarantined]),
    );
    await expect(complete(quarantined, 'key-00000011', SHA_A, 2048)).rejects.toMatchObject({ code: '55000' });
  });

  it('T09 completion never turns a document clean: its scan status stays SCANNER_UNAVAILABLE', async () => {
    const doc = await newInspectedDocument('application/pdf', 4096);
    await complete(doc, 'key-00000020', SHA_A, 4096);
    const status = first(await adminRows('select scan_status from public.documents where id = $1', [doc]));
    expect(status.scan_status).toBe('SCANNER_UNAVAILABLE');
  });

  it('T10 completion checks size, owner and sign-in, and only the owner can read its completions', async () => {
    const doc = await newInspectedDocument('image/png', 4096);
    await expect(complete(doc, 'key-00000030', SHA_A, 4095)).rejects.toMatchObject({ code: '22023' });
    await expect(complete(doc, 'key-00000031', SHA_A, 4096, BOB)).rejects.toMatchObject({ code: 'P0002' });
    await expect(
      asActor(null, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, 'key-00000032', SHA_A, 4096])),
    ).rejects.toMatchObject({ code: '42501' });

    await complete(doc, 'key-00000033', SHA_A, 4096);
    const bobSees = await asActor(BOB, async (c) => (await c.query('select id from public.upload_completions')).rows);
    expect(bobSees).toEqual([]);
    const aliceSees = await asActor(ALICE, async (c) => (await c.query('select id from public.upload_completions where document_id = $1', [doc])).rows);
    expect(aliceSees).toHaveLength(1);
  });
});
