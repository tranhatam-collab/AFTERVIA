import { beforeAll, describe, expect, it } from 'vitest';
import { normalizeUploadTicket } from '@aftervia/domain';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';

describe('WO05-01 documents and upload tickets in Postgres', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
  });

  it('T04 a ticket creates a private document only its owner can list', async () => {
    const ticket = await asActor(ALICE, async (c) => (await c.query(
      "select out_document_id, out_ticket_id from public.create_upload_ticket('application/pdf', 4096)",
    )).rows[0]);
    expect(ticket.out_document_id).toBeTruthy();
    expect(await asActor(ALICE, async (c) => (await c.query('select id from public.documents')).rows)).toHaveLength(1);
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.documents')).rows)).toEqual([]);
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.upload_tickets')).rows)).toEqual([]);
  });

  it('T38 the storage key is never readable by a client, and clients cannot insert documents directly', async () => {
    await expect(asActor(ALICE, (c) => c.query('select object_key from public.documents'))).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(ALICE, (c) => c.query("insert into public.documents (owner_user_id, declared_mime, size_bytes) values ($1, 'application/pdf', 10)", [ALICE])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T38 the ticket expires within fifteen minutes', async () => {
    const admin = await connect();
    try {
      const rows = (await admin.query(
        "select (expires_at > now()) as future, (expires_at <= now() + interval '15 minutes') as bounded from public.upload_tickets",
      )).rows;
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.future === true && r.bounded === true)).toBe(true);
    } finally {
      await admin.end();
    }
  });

  it('invalid declared type or size is refused by the database and by the domain rule', async () => {
    await expect(asActor(ALICE, (c) => c.query("select * from public.create_upload_ticket('application/x-msdownload', 10)"))).rejects.toMatchObject({ code: '23514' });
    await expect(asActor(ALICE, (c) => c.query("select * from public.create_upload_ticket('image/png', 0)"))).rejects.toMatchObject({ code: '23514' });
    await expect(asActor(ALICE, (c) => c.query("select * from public.create_upload_ticket('image/png', 10485761)"))).rejects.toMatchObject({ code: '23514' });
    expect(normalizeUploadTicket({ declared_mime: 'application/x-msdownload', size_bytes: 10 })).toEqual({ ok: false, field: 'declared_mime' });
    expect(normalizeUploadTicket({ declared_mime: 'image/png', size_bytes: 10485761 })).toEqual({ ok: false, field: 'size_bytes' });
    expect(normalizeUploadTicket({ declared_mime: 'image/png', size_bytes: 1024 }).ok).toBe(true);
  });

  it('an anonymous caller cannot create a ticket or read documents', async () => {
    await expect(asActor(null, (c) => c.query("select * from public.create_upload_ticket('image/png', 10)"))).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(null, (c) => c.query('select id from public.documents'))).rejects.toMatchObject({ code: '42501' });
  });
});
