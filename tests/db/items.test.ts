import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';
let itemId = '';

describe('WO07-01 items in Postgres: owner-only rows, guarded writes, persistence', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
    } finally {
      await admin.end();
    }
  });

  it('T03 an item created by its owner is stored and read back after reconnecting, with its date kept as written', async () => {
    itemId = await asActor(ALICE, async (c) => (await c.query(
      "select public.create_item('Máy hút bụi', 'Hãng X', 'M1', '2026-03-04', 'VND') as id",
    )).rows[0].id as string);
    const admin = await connect();
    try {
      const rows = (await admin.query(
        'select title, brand, model, purchased_on::text as purchased_on, currency, version from public.items where id = $1',
        [itemId],
      )).rows;
      expect(rows).toEqual([{ title: 'Máy hút bụi', brand: 'Hãng X', model: 'M1', purchased_on: '2026-03-04', currency: 'VND', version: 1 }]);
    } finally {
      await admin.end();
    }
  });

  it('T04 another account cannot list, read, count, or change the item', async () => {
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.items')).rows)).toEqual([]);
    expect(await asActor(BOB, async (c) => (await c.query('select id from public.items where id = $1', [itemId])).rows)).toEqual([]);
    expect(await asActor(BOB, async (c) => (await c.query('select count(*)::int as n from public.items')).rows[0].n)).toBe(0);
    await expect(
      asActor(BOB, (c) => c.query("select public.update_item($1, 1, 'Bị đổi', null, null, null, null)", [itemId])),
    ).rejects.toMatchObject({ code: 'P0002' });
    const admin = await connect();
    try {
      expect((await admin.query('select title, version from public.items where id = $1', [itemId])).rows).toEqual([
        { title: 'Máy hút bụi', version: 1 },
      ]);
    } finally {
      await admin.end();
    }
    expect(await asActor(ALICE, async (c) => (await c.query('select count(*)::int as n from public.items')).rows[0].n)).toBe(1);
  });

  it('T04 direct inserts, updates and deletes on items are refused for the owner too', async () => {
    await expect(
      asActor(ALICE, (c) => c.query("insert into public.items (owner_user_id, title) values ($1, 'Giả mạo')", [ALICE])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(ALICE, (c) => c.query("update public.items set title = 'Giả mạo' where id = $1", [itemId])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(ALICE, (c) => c.query('delete from public.items where id = $1', [itemId]))).rejects.toMatchObject({ code: '42501' });
  });

  it('a stale version is refused with 40001 and the newer version is kept', async () => {
    const v2 = await asActor(ALICE, async (c) => (await c.query(
      "select public.update_item($1, 1, 'Máy hút bụi 2', 'Hãng X', 'M1', '2026-03-04', 'VND') as v",
      [itemId],
    )).rows[0].v as number);
    expect(v2).toBe(2);
    await expect(
      asActor(ALICE, (c) => c.query("select public.update_item($1, 1, 'Phiên bản cũ', null, null, null, null)", [itemId])),
    ).rejects.toMatchObject({ code: '40001' });
    const admin = await connect();
    try {
      expect((await admin.query('select title, version from public.items where id = $1', [itemId])).rows).toEqual([
        { title: 'Máy hút bụi 2', version: 2 },
      ]);
    } finally {
      await admin.end();
    }
  });

  it('an empty title and a lowercase currency are refused by the database', async () => {
    await expect(
      asActor(ALICE, (c) => c.query("select public.create_item('   ', null, null, null, null)")),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      asActor(ALICE, (c) => c.query("select public.create_item('Thiếu tiền tệ', null, null, null, 'vnd')")),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('an anonymous caller cannot create or read items', async () => {
    await expect(asActor(null, (c) => c.query("select public.create_item('Vô danh', null, null, null, null)"))).rejects.toMatchObject({
      code: '42501',
    });
    await expect(asActor(null, (c) => c.query('select id from public.items'))).rejects.toMatchObject({ code: '42501' });
  });
});
