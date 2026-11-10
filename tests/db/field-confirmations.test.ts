import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';
const EXTRACTION = '00000000-0000-4000-8000-0000000000e1';

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

// Ghi một xác nhận dưới danh nghĩa actor. JS null là SQL NULL (giá trị cũ rỗng hoặc giá trị mới vắng mặt).
async function confirm(
  actor: string | null,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  absentReason: string | null = null,
): Promise<string> {
  const oldJson = oldValue === null ? null : JSON.stringify(oldValue);
  const newJson = newValue === null ? null : JSON.stringify(newValue);
  return asActor(actor, async (c) =>
    (
      await c.query(
        'select public.record_field_confirmation($1::uuid, $2::text, $3::jsonb, $4::jsonb, $5::text) as id',
        [EXTRACTION, field, oldJson, newJson, absentReason],
      )
    ).rows[0].id as string,
  );
}

describe('WO06-05 field confirmations are append-only and keep actor, time and values', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
  });

  it('T14 a confirmation records the actor from the session, the database time, and the old and new values', async () => {
    const t0 = first(await adminRows('select now() as t')).t as Date;
    const id = await confirm(ALICE, 'purchase.amount', 120, 129);
    const t1 = first(await adminRows('select now() as t')).t as Date;
    const row = first(
      await adminRows(
        'select f.actor_user_id, v.old_value, v.new_value, f.new_absent_reason, f.confirmed_at from public.field_confirmations f join public.field_confirmation_values v on v.confirmation_id = f.id where f.id = $1',
        [id],
      ),
    );
    expect(row.actor_user_id).toBe(ALICE);
    expect(row.old_value).toBe(120);
    expect(row.new_value).toBe(129);
    expect(row.new_absent_reason).toBeNull();
    const at = row.confirmed_at as Date;
    expect(at.getTime()).toBeGreaterThanOrEqual(t0.getTime());
    expect(at.getTime()).toBeLessThanOrEqual(t1.getTime());
  });

  it('T14 the actor comes from the session, and each user reads only their own confirmations', async () => {
    const bobId = await confirm(BOB, 'purchase.amount', 129, 135);
    const bobRow = first(await adminRows('select actor_user_id from public.field_confirmations where id = $1', [bobId]));
    expect(bobRow.actor_user_id).toBe(BOB);
    const aliceSees = await asActor(ALICE, async (c) => (await c.query('select id from public.field_confirmations where id = $1', [bobId])).rows);
    expect(aliceSees).toEqual([]);
    const bobSees = await asActor(BOB, async (c) => (await c.query('select id from public.field_confirmations where id = $1', [bobId])).rows);
    expect(bobSees).toHaveLength(1);
  });

  it('T14 an absent value is confirmed only with the confirmed_absent reason, and a present value cannot carry one', async () => {
    const id = await confirm(ALICE, 'purchase.serial', null, null, 'confirmed_absent');
    const row = first(await adminRows('select v.new_value, f.new_absent_reason from public.field_confirmations f join public.field_confirmation_values v on v.confirmation_id = f.id where f.id = $1', [id]));
    expect(row.new_value).toBeNull();
    expect(row.new_absent_reason).toBe('confirmed_absent');
    await expect(confirm(ALICE, 'purchase.serial', null, null, null)).rejects.toMatchObject({ code: '22023' });
    await expect(confirm(ALICE, 'purchase.serial', null, null, 'other_reason')).rejects.toMatchObject({ code: '22023' });
    await expect(confirm(ALICE, 'purchase.serial', null, 'SN-1', 'confirmed_absent')).rejects.toMatchObject({ code: '22023' });
  });

  it('T14 an invalid field path, a JSON null, an oversized value or a missing extraction is refused with 22023', async () => {
    await expect(confirm(ALICE, 'Purchase.Amount', null, 1)).rejects.toMatchObject({ code: '22023' });
    await expect(confirm(ALICE, 'a'.repeat(121), null, 1)).rejects.toMatchObject({ code: '22023' });
    await expect(
      asActor(ALICE, (c) => c.query("select public.record_field_confirmation($1::uuid, 'purchase.amount', null, 'null'::jsonb, null)", [EXTRACTION])),
    ).rejects.toMatchObject({ code: '22023' });
    await expect(confirm(ALICE, 'purchase.note', null, 'x'.repeat(9000))).rejects.toMatchObject({ code: '22023' });
    await expect(
      asActor(ALICE, (c) => c.query("select public.record_field_confirmation(null::uuid, 'purchase.amount', null, '1'::jsonb, null)")),
    ).rejects.toMatchObject({ code: '22023' });
  });

  it('T14 the records are append-only: update, delete and truncate are refused with 42501, even for the table owner', async () => {
    const id = await confirm(ALICE, 'purchase.date', null, '2026-04-30');
    await expect(adminRows("update public.field_confirmations set field_path = 'purchase.other' where id = $1", [id])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('delete from public.field_confirmations where id = $1', [id])).rejects.toMatchObject({ code: '42501' });
    await expect(adminRows('truncate public.field_confirmations')).rejects.toMatchObject({ code: '42501' });
    const kept = first(await adminRows('select count(*)::int as n, min(v.new_value::text) as v from public.field_confirmations f join public.field_confirmation_values v on v.confirmation_id = f.id where f.id = $1', [id]));
    expect(kept).toEqual({ n: 1, v: '"2026-04-30"' });
  });

  it('T14 the authenticated role cannot write the table directly, and an anonymous caller cannot record a confirmation', async () => {
    await expect(
      asActor(ALICE, (c) =>
        c.query("insert into public.field_confirmations (extraction_id, field_path, actor_user_id) values ($1, 'purchase.amount', $2)", [EXTRACTION, ALICE]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(null, (c) => c.query("select public.record_field_confirmation($1::uuid, 'purchase.amount', null, '1'::jsonb, null)", [EXTRACTION])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T14 each confirmation writes one audit event that names the extraction and field, not the values', async () => {
    const id = await confirm(ALICE, 'purchase.currency', null, 'USD');
    const audit = first(
      await adminRows(
        "select count(*)::int as n, min(details::text) as d from public.audit_events where action = 'field.confirm' and object_id = $1",
        [id],
      ),
    );
    expect(audit.n).toBe(1);
    expect(String(audit.d)).toContain(EXTRACTION);
    expect(String(audit.d)).toContain('purchase.currency');
    expect(String(audit.d)).not.toContain('USD');
  });
});
