import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1';

describe('WO07-02 date-only values in Postgres do not move with the session time zone', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2)', [ALICE, 'alice@test.invalid']);
    } finally {
      await admin.end();
    }
    await asActor(ALICE, (c) => c.query("select public.create_item('Đèn bàn', null, null, '2026-04-30'::date, null)"));
  });

  it('T22 the purchase date reads back as the same calendar date under UTC+7, UTC-8 and UTC sessions', async () => {
    for (const zone of ['Asia/Ho_Chi_Minh', 'America/Los_Angeles', 'UTC']) {
      const rows = await asActor(ALICE, async (c) => {
        await c.query("select set_config('TimeZone', $1, true)", [zone]);
        return (await c.query("select purchased_on from public.items where title = 'Đèn bàn'")).rows;
      });
      expect(rows).toEqual([{ purchased_on: '2026-04-30' }]);
    }
  });
});
