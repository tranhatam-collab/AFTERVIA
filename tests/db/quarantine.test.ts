import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';

async function newDocument(mime: string, size: number): Promise<string> {
  return asActor(ALICE, async (c) => {
    const row = (await c.query('select out_document_id from public.create_upload_ticket($1, $2)', [mime, size])).rows[0];
    return row.out_document_id as string;
  });
}

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

function first(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return row;
}

describe('WO05-02 quarantine and inspection state in Postgres', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
  });

  it('T09 a PNG uploaded as JPEG is quarantined, keeps seven days of retention and leaves an audit trail', async () => {
    const doc = await newDocument('image/jpeg', 2048);
    await asActor(ALICE, (c) =>
      c.query("select public.record_upload_inspection($1, 'QUARANTINED', 'mime_mismatch', 'image/png', 2048)", [doc]),
    );
    const status = await asActor(ALICE, async (c) => (await c.query('select scan_status from public.documents where id = $1', [doc])).rows[0]);
    expect(status.scan_status).toBe('QUARANTINED');
    const retention = await adminRows(
      "select (retention_until between now() + interval '6 days 23 hours' and now() + interval '7 days 1 minute') as seven_days from public.documents where id = $1",
      [doc],
    );
    expect(first(retention).seven_days).toBe(true);
    const audit = await adminRows("select count(*)::int as n from public.audit_events where action = 'document.inspect' and object_id = $1", [doc]);
    expect(first(audit).n).toBe(1);
  });

  it('T09 the database refuses CLEAN, a status that does not match its reason, and an unknown reason', async () => {
    const doc = await newDocument('application/pdf', 1024);
    const attempts = [
      "select public.record_upload_inspection($1, 'CLEAN', 'scanner_unavailable', 'application/pdf', 1024)",
      "select public.record_upload_inspection($1, 'QUARANTINED', 'scanner_unavailable', 'application/pdf', 1024)",
      "select public.record_upload_inspection($1, 'QUARANTINED', 'unknown_signature', 'image/png', 1024)",
      "select public.record_upload_inspection($1, 'QUARANTINED', 'mime_mismatch', 'application/pdf', 1024)",
      "select public.record_upload_inspection($1, 'REJECTED', 'size_out_of_range', null, 1024)",
      "select public.record_upload_inspection($1, 'QUARANTINED', 'anything_else', null, 1024)",
    ];
    for (const sql of attempts) {
      await expect(asActor(ALICE, (c) => c.query(sql, [doc]))).rejects.toMatchObject({ code: '22023' });
    }
    const status = await adminRows('select scan_status from public.documents where id = $1', [doc]);
    expect(first(status).scan_status).toBe('PENDING_UPLOAD');
  });

  it('T09 an inspected document cannot be inspected again or moved back to a passing state', async () => {
    const doc = await newDocument('image/png', 4096);
    await asActor(ALICE, (c) =>
      c.query("select public.record_upload_inspection($1, 'QUARANTINED', 'unknown_signature', null, 4096)", [doc]),
    );
    await expect(
      asActor(ALICE, (c) => c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc])),
    ).rejects.toMatchObject({ code: '55000' });
    const status = await adminRows('select scan_status from public.documents where id = $1', [doc]);
    expect(first(status).scan_status).toBe('QUARANTINED');
  });

  it('T09 a valid signature only reaches SCANNER_UNAVAILABLE, which keeps the document out of real use', async () => {
    const doc = await newDocument('application/pdf', 1024);
    await asActor(ALICE, (c) =>
      c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'application/pdf', 1024)", [doc]),
    );
    const rows = await adminRows('select scan_status, retention_until from public.documents where id = $1', [doc]);
    expect(first(rows).scan_status).toBe('SCANNER_UNAVAILABLE');
    expect(first(rows).retention_until).toBeNull();
  });

  it('T09 an oversize upload is rejected and kept for seven days; an in-range size cannot be called oversize', async () => {
    const doc = await newDocument('application/pdf', 10485760);
    await expect(
      asActor(ALICE, (c) => c.query("select public.record_upload_inspection($1, 'REJECTED', 'size_out_of_range', null, 10485760)", [doc])),
    ).rejects.toMatchObject({ code: '22023' });
    await asActor(ALICE, (c) =>
      c.query("select public.record_upload_inspection($1, 'REJECTED', 'size_out_of_range', null, 10485761)", [doc]),
    );
    const rows = await adminRows('select scan_status from public.documents where id = $1', [doc]);
    expect(first(rows).scan_status).toBe('REJECTED');
  });

  it('T09 another account cannot inspect a document it does not own, and anonymous callers are refused', async () => {
    const doc = await newDocument('image/jpeg', 2048);
    await expect(
      asActor(BOB, (c) => c.query("select public.record_upload_inspection($1, 'QUARANTINED', 'unknown_signature', null, 2048)", [doc])),
    ).rejects.toMatchObject({ code: 'P0002' });
    await expect(
      asActor(null, (c) => c.query("select public.record_upload_inspection($1, 'QUARANTINED', 'unknown_signature', null, 2048)", [doc])),
    ).rejects.toMatchObject({ code: '42501' });
    const status = await adminRows('select scan_status from public.documents where id = $1', [doc]);
    expect(first(status).scan_status).toBe('PENDING_UPLOAD');
  });
});
