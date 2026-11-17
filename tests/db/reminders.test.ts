import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';

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

// Tạo nhắc việc dưới danh nghĩa actor, giờ nhắc 09:00 theo múi giờ đã cho. remindAt là thời điểm UTC đã tính sẵn.
async function createReminder(
  actor: string,
  item: string,
  date: string | null,
  tz: string,
  remindAt: string,
  source = 'user_confirmed',
): Promise<string> {
  return asActor(actor, async (c) =>
    (
      await c.query('select public.create_reminder($1::uuid, $2::date, $3::text, $4::text, $5::time, $6::timestamptz) as id', [
        item,
        date,
        source,
        tz,
        '09:00',
        remindAt,
      ])
    ).rows[0].id as string,
  );
}

async function record(outcome: string, reminder: string): Promise<string> {
  return first(await adminRows('select public.record_reminder_delivery($1::uuid, $2::text) as status', [reminder, outcome])).status as string;
}

describe('WO07-03 reminders follow confirmed dates and keep an inbox copy when push is refused', () => {
  let item = '';

  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
    item = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Đèn bàn', null, null, null, null) as id")).rows[0].id as string);
  });

  it('T21 a reminder is created only from a confirmed date with a source, a known IANA zone and a time on that date', async () => {
    const id = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    const row = first(await adminRows('select status, confirmed_by, source from public.reminders where id = $1', [id]));
    expect(row).toEqual({ status: 'SCHEDULED', confirmed_by: ALICE, source: 'user_confirmed' });

    await expect(createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z', 'guess')).rejects.toMatchObject({ code: '22023' });
    await expect(createReminder(ALICE, item, '2026-04-30', 'Mars/Olympus', '2026-04-30T02:00:00Z')).rejects.toMatchObject({ code: '22023' });
    await expect(createReminder(ALICE, item, '2026-05-01', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z')).rejects.toMatchObject({ code: '22023' });
    await expect(createReminder(ALICE, item, null, 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z')).rejects.toMatchObject({ code: '22023' });
    await expect(createReminder(BOB, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z')).rejects.toMatchObject({ code: 'P0002' });
  });

  it('T21 when push is refused, the reminder is not marked as sent: it ends INBOX_ONLY, the refusal is logged and the owner keeps an inbox copy', async () => {
    const id = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    const status = await record('refused', id);
    expect(status).toBe('INBOX_ONLY');
    expect(status).not.toBe('PUSH_ACCEPTED');

    const stored = first(await asActor(ALICE, async (c) => (await c.query('select status from public.reminders where id = $1', [id])).rows));
    expect(stored.status).toBe('INBOX_ONLY');

    const deliveries = await adminRows('select outcome from public.reminder_deliveries where reminder_id = $1', [id]);
    expect(deliveries).toEqual([{ outcome: 'refused' }]);

    const inbox = await asActor(ALICE, async (c) => (await c.query('select message_key from public.inbox_messages where reminder_id = $1', [id])).rows);
    expect(inbox).toEqual([{ message_key: 'reminder_due' }]);

    const audit = first(await adminRows("select count(*)::int as n from public.audit_events where action = 'reminder.deliver' and object_id = $1", [id]));
    expect(audit.n).toBe(1);
  });

  it('T21 when push is accepted, the reminder is marked PUSH_ACCEPTED and the inbox copy is kept too', async () => {
    const id = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    expect(await record('accepted', id)).toBe('PUSH_ACCEPTED');
    const inbox = await adminRows('select count(*)::int as n from public.inbox_messages where reminder_id = $1', [id]);
    expect(inbox).toEqual([{ n: 1 }]);
  });

  it('T21 a reminder is delivered only once, an unknown outcome is refused, and deliveries and inbox copies cannot be changed or deleted', async () => {
    const id = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    expect(await record('refused', id)).toBe('INBOX_ONLY');
    await expect(adminRows('select public.record_reminder_delivery($1::uuid, $2::text)', [id, 'accepted'])).rejects.toMatchObject({ code: '55000' });

    const fresh = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    await expect(adminRows('select public.record_reminder_delivery($1::uuid, $2::text)', [fresh, 'sent'])).rejects.toMatchObject({ code: '22023' });
    expect(first(await adminRows('select status from public.reminders where id = $1', [fresh])).status).toBe('SCHEDULED');

    await expect(adminRows('update public.reminder_deliveries set outcome = $2 where reminder_id = $1', [id, 'accepted'])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('delete from public.inbox_messages where reminder_id = $1', [id])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('truncate public.reminder_deliveries')).rejects.toMatchObject({ code: '42501' });
    expect(first(await adminRows('select count(*)::int as n from public.reminder_deliveries where reminder_id = $1', [id])).n).toBe(1);
  });

  it('T21 only the owner reads reminders and inbox copies, and a client cannot write them or record a delivery', async () => {
    const id = await createReminder(ALICE, item, '2026-04-30', 'Asia/Ho_Chi_Minh', '2026-04-30T02:00:00Z');
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.reminders where id = $1', [id])).rows)).toEqual([]);
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.inbox_messages')).rows)).toEqual([]);
    expect(await asActor(ALICE, async (c) => (await c.query('select id from public.reminders where id = $1', [id])).rows)).toHaveLength(1);

    await expect(asActor(ALICE, (c) => c.query("update public.reminders set status = 'PUSH_ACCEPTED' where id = $1", [id]))).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(ALICE, (c) => c.query("insert into public.inbox_messages (owner_user_id, reminder_id, message_key) values ($1, $2, 'reminder_due')", [ALICE, id])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(ALICE, (c) => c.query('select public.record_reminder_delivery($1::uuid, $2::text)', [id, 'accepted']))).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(null, (c) => c.query('select id from public.reminders'))).rejects.toMatchObject({ code: '42501' });
  });
});
