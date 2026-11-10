import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO11-02e-CASE (T25; Q2 đã QUYẾT, phương án C): lý do trong lịch sử case nằm trong bảng sửa được.
// case_events (chỉ thêm) giữ tham chiếu và các trường không có nội dung cá nhân. Dữ liệu tổng hợp.
const CUSTOMER = '00000000-0000-4000-8000-0000000002c1';
const OWNER = '00000000-0000-4000-8000-0000000002c2';
const OUTSIDER = '00000000-0000-4000-8000-0000000002c3';
const REASON = 'Máy không lên nguồn';

let caseId = '';
let createdEvent = '';

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

// Lịch sử như người dùng đọc: sự kiện kèm lý do qua bảng lý do.
const HISTORY = 'select e.type, r.reason from public.case_events e left join public.case_event_reasons r on r.event_id = e.id where e.case_id = $1 order by e.sequence';

describe('WO11-02e-CASE case history reasons: editable, while the events stay append-only', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await adminRows('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6)', [
      CUSTOMER,
      'customer-cr@test.invalid',
      OWNER,
      'owner-cr@test.invalid',
      OUTSIDER,
      'outsider-cr@test.invalid',
    ]);
    const org = (await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng CR', 'VN') as id")).rows[0].id)) as string;
    const item = (await asActor(CUSTOMER, async (c) => (await c.query("select public.create_item('Máy CR', null, null, null, 'VND') as id")).rows[0].id)) as string;
    caseId = (await asActor(CUSTOMER, async (c) =>
      (await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [item, org, REASON, 'case-cr-reason-0001'])).rows[0].out_case_id,
    )) as string;
    createdEvent = first(await adminRows("select id from public.case_events where case_id = $1 and type = 'created'", [caseId])).id as string;
  });

  it('T25 the reason of each event is in the reason table, and the event row itself holds no reason', async () => {
    const onEvent = first(await adminRows('select count(*)::int as n from public.case_events where case_id = $1 and reason is not null', [caseId]));
    expect(onEvent).toEqual({ n: 0 });
    const inTable = first(
      await adminRows(
        "select r.reason from public.case_events e join public.case_event_reasons r on r.event_id = e.id where e.case_id = $1 and e.type = 'created'",
        [caseId],
      ),
    );
    expect(inTable).toEqual({ reason: REASON });
  });

  it('T25 the customer and the organization read the history with its reasons, and no user reads the reason column of an event', async () => {
    const customerSees = await asActor(CUSTOMER, async (c) => (await c.query(HISTORY, [caseId])).rows);
    expect(customerSees).toEqual([{ type: 'created', reason: REASON }]);
    const ownerSees = await asActor(OWNER, async (c) => (await c.query(HISTORY, [caseId])).rows);
    expect(ownerSees).toEqual([{ type: 'created', reason: REASON }]);
    await expect(asActor(CUSTOMER, (c) => c.query('select reason from public.case_events where case_id = $1', [caseId]))).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('T25 an outside account reads neither the events nor their reasons, and an anonymous caller cannot read the reason table', async () => {
    const outside = first(await asActor(OUTSIDER, async (c) => (await c.query('select count(*)::int as n from public.case_event_reasons')).rows));
    expect(outside).toEqual({ n: 0 });
    await expect(asActor(null, (c) => c.query('select count(*) from public.case_event_reasons'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T25 the database owner may correct a reason, and the events stay append-only', async () => {
    const admin = await connect();
    try {
      const fixed = await admin.query('update public.case_event_reasons set reason = $2 where event_id = $1', [createdEvent, 'Đã ghi lại đúng']);
      expect(fixed.rowCount).toBe(1);
      await expect(admin.query("update public.case_events set reason = 'x' where id = $1", [createdEvent])).rejects.toMatchObject({ code: '42501' });
      await expect(admin.query('delete from public.case_events where id = $1', [createdEvent])).rejects.toMatchObject({ code: '42501' });
    } finally {
      await admin.end();
    }
    const customerSees = await asActor(CUSTOMER, async (c) => (await c.query(HISTORY, [caseId])).rows);
    expect(customerSees).toEqual([{ type: 'created', reason: 'Đã ghi lại đúng' }]);
  });

  it('T25 erasing a reason keeps the event: its type, its actor and its time stay, and the history shows no reason', async () => {
    const admin = await connect();
    try {
      const removed = await admin.query('delete from public.case_event_reasons where event_id = $1', [createdEvent]);
      expect(removed.rowCount).toBe(1);
    } finally {
      await admin.end();
    }
    const kept = first(
      await adminRows(
        'select e.type, e.actor_user_id = $2 as same_actor, e.created_at is not null as dated, r.reason from public.case_events e left join public.case_event_reasons r on r.event_id = e.id where e.id = $1',
        [createdEvent, CUSTOMER],
      ),
    );
    expect(kept).toEqual({ type: 'created', same_actor: true, dated: true, reason: null });
  });

  it('T25 the events table refuses a reason even when its triggers are off', async () => {
    const admin = await connect();
    try {
      await admin.query('set session_replication_role = replica');
      await expect(admin.query("update public.case_events set reason = 'x' where id = $1", [createdEvent])).rejects.toMatchObject({ code: '23514' });
    } finally {
      await admin.end();
    }
  });
});
