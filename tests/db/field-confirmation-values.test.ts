import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO11-02e-CONF (T25; Q2 đã QUYẾT, phương án C): giá trị xác nhận trường nằm trong bảng sửa được.
// field_confirmations (chỉ thêm) giữ tham chiếu, người xác nhận, thời điểm, tên trường và lý do vắng mặt. Dữ liệu tổng hợp.
const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';
const EXTRACTION = '00000000-0000-4000-8000-0000000000e2';

let valued = '';
let absent = '';

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

// Ghi một xác nhận dưới danh nghĩa actor. JS null là SQL NULL.
async function confirm(actor: string, field: string, oldValue: unknown, newValue: unknown, absentReason: string | null = null): Promise<string> {
  const oldJson = oldValue === null ? null : JSON.stringify(oldValue);
  const newJson = newValue === null ? null : JSON.stringify(newValue);
  return asActor(actor, async (c) =>
    (
      await c.query('select public.record_field_confirmation($1::uuid, $2::text, $3::jsonb, $4::jsonb, $5::text) as id', [
        EXTRACTION,
        field,
        oldJson,
        newJson,
        absentReason,
      ])
    ).rows[0].id as string,
  );
}

describe('WO11-02e-CONF field confirmation values: editable, while the record stays append-only', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice-cv@test.invalid', BOB, 'bob-cv@test.invalid']);
    } finally {
      await admin.end();
    }
    valued = await confirm(ALICE, 'purchase.amount', 120, 129);
    absent = await confirm(ALICE, 'purchase.serial', null, null, 'confirmed_absent');
  });

  it('T25 the reference record holds no value columns, and each confirmation has exactly one value row', async () => {
    const columns = await adminRows(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'field_confirmations' and column_name in ('old_value', 'new_value')",
    );
    expect(columns).toEqual([]);
    const counts = first(
      await adminRows(
        'select (select count(*)::int from public.field_confirmation_values where confirmation_id = $1) as value_rows, (select count(*)::int from public.field_confirmations where id = $1) as references',
        [valued],
      ),
    );
    expect(counts).toEqual({ value_rows: 1, references: 1 });
  });

  it('T25 the actor reads the values through the value table, and another user reads none', async () => {
    const own = await asActor(ALICE, async (c) =>
      (await c.query('select old_value, new_value from public.field_confirmation_values where confirmation_id = $1', [valued])).rows,
    );
    expect(own).toEqual([{ old_value: 120, new_value: 129 }]);
    const other = await asActor(BOB, async (c) =>
      (await c.query('select old_value, new_value from public.field_confirmation_values where confirmation_id = $1', [valued])).rows,
    );
    expect(other).toEqual([]);
  });

  it('T25 no end user writes the value table directly', async () => {
    await expect(
      asActor(ALICE, (c) => c.query("update public.field_confirmation_values set new_value = '\"x\"'::jsonb where confirmation_id = $1", [valued])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(ALICE, (c) => c.query('delete from public.field_confirmation_values where confirmation_id = $1', [valued]))).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('T25 the owner may edit a value, for example to mask it, and the reference record stays append-only', async () => {
    const admin = await connect();
    try {
      await admin.query("update public.field_confirmation_values set new_value = '\"[đã che]\"'::jsonb where confirmation_id = $1", [valued]);
      const masked = await admin.query('select new_value from public.field_confirmation_values where confirmation_id = $1', [valued]);
      expect(masked.rows[0].new_value).toBe('[đã che]');
      await expect(admin.query("update public.field_confirmations set field_path = 'purchase.other' where id = $1", [valued])).rejects.toMatchObject({
        code: '42501',
      });
      await expect(admin.query('delete from public.field_confirmations where id = $1', [valued])).rejects.toMatchObject({ code: '42501' });
    } finally {
      await admin.end();
    }
  });

  it('T25 an absent value stays absent only with its reason, a present value cannot carry one, and a value needs a reference', async () => {
    const admin = await connect();
    try {
      await expect(admin.query('update public.field_confirmation_values set new_value = null where confirmation_id = $1', [valued])).rejects.toMatchObject({
        code: '22023',
      });
      await expect(
        admin.query("update public.field_confirmation_values set new_value = '1'::jsonb where confirmation_id = $1", [absent]),
      ).rejects.toMatchObject({ code: '22023' });
      await expect(
        admin.query("insert into public.field_confirmation_values (confirmation_id, new_value) values ('00000000-0000-4000-8000-0000000000ff', '1'::jsonb)"),
      ).rejects.toMatchObject({ code: 'P0002' });
    } finally {
      await admin.end();
    }
  });

  it('T25 erasing a value keeps the confirmation: its field, its actor and its time stay in the reference record', async () => {
    const admin = await connect();
    try {
      const removed = await admin.query('delete from public.field_confirmation_values where confirmation_id = $1', [absent]);
      expect(removed.rowCount).toBe(1);
    } finally {
      await admin.end();
    }
    const kept = first(
      await adminRows(
        'select f.field_path, f.actor_user_id, f.confirmed_at is not null as dated, (select count(*)::int from public.field_confirmation_values v where v.confirmation_id = f.id) as value_rows from public.field_confirmations f where f.id = $1',
        [absent],
      ),
    );
    expect(kept).toEqual({ field_path: 'purchase.serial', actor_user_id: ALICE, dated: true, value_rows: 0 });
  });
});
