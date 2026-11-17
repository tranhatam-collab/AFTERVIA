import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO16-02: cờ kill switch. Không có dòng ma trận riêng (ma trận chỉ có T42 cho task này), nên tên kiểm thử bắt đầu bằng WO16-02.
// Kiểm: người dùng đã đăng nhập chỉ đọc trạng thái, không đọc lý do, không đổi cờ; cờ sharing chặn chia sẻ mới,
// không xóa chia sẻ hiện có; cờ ai_extraction không đổi quyền truy cập hồ sơ; mọi lần đổi cờ được ghi audit.
const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách sở hữu món đồ
const FAM = '00000000-0000-4000-8000-0000000000b1'; // thành viên gia đình đã chấp nhận

let itemA = '';
let itemB = '';
let membership = '';

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function setSwitch(key: string, enabled: boolean, reason: string): Promise<void> {
  await adminRows('select public.set_kill_switch($1::text, $2::boolean, $3::text)', [key, enabled, reason]);
}

async function share(actor: string, item: string, member: string): Promise<string> {
  return asActor(actor, async (c) =>
    (await c.query('select public.share_item_with_family($1::uuid, $2::uuid) as id', [item, member])).rows[0].id as string,
  );
}

async function sharedIds(actor: string): Promise<string[]> {
  const rows = await asActor(actor, async (c) => (await c.query('select item_id from public.family_shared_items()')).rows);
  return rows.map((r) => r.item_id as string).sort();
}

describe('WO16-02 kill switches: state readable, sharing stopped for new shares, AI switch leaves access unchanged', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', FAM, 'fam@test.invalid']);
    } finally {
      await admin.end();
    }
    itemA = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Máy pha cà phê', 'Hãng A', 'Model A', null, null) as id")).rows[0].id as string,
    );
    itemB = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Tủ lạnh', 'Hãng B', 'Model B', null, null) as id")).rows[0].id as string,
    );
    membership = await asActor(ALICE, async (c) =>
      (await c.query('select public.invite_family_member($1::uuid) as id', [FAM])).rows[0].id as string,
    );
    await asActor(FAM, (c) => c.query('select public.accept_family_invitation($1::uuid)', [membership]));
  });

  it('WO16-02 a signed-in user reads switch state without the reason, and cannot change a switch', async () => {
    const states = await asActor(ALICE, async (c) =>
      (await c.query('select switch_key, enabled from public.kill_switches order by switch_key')).rows,
    );
    expect(states.length).toBe(5);
    await expect(asActor(ALICE, async (c) => c.query('select reason from public.kill_switches'))).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(ALICE, async (c) => c.query("select public.set_kill_switch('sharing', false, 'thử')"))).rejects.toMatchObject({
      code: '42501',
    });
    expect(states.find((s) => s.switch_key === 'sharing')?.enabled).toBe(true);
    expect(states.find((s) => s.switch_key === 'country_activation')?.enabled).toBe(false);
  });

  it('WO16-02 turning sharing off refuses a new share at once, existing shares stay in place, and turning it on restores sharing', async () => {
    await share(ALICE, itemA, FAM);
    expect(await sharedIds(FAM)).toEqual([itemA].sort());
    await setSwitch('sharing', false, 'sự cố thử nghiệm');
    await expect(share(ALICE, itemB, FAM)).rejects.toMatchObject({ code: '55000' });
    // Quyết định ghi trong evidence: tắt sharing không xóa chia sẻ hiện có, nên việc đọc chia sẻ hiện có vẫn đúng như trước.
    expect(await sharedIds(FAM)).toEqual([itemA].sort());
    await setSwitch('sharing', true, 'khôi phục sau thử nghiệm');
    await share(ALICE, itemB, FAM);
    expect(await sharedIds(FAM)).toEqual([itemA, itemB].sort());
  });

  it('WO16-02 turning ai_extraction off does not change record access for the owner or the family member', async () => {
    await setSwitch('ai_extraction', false, 'thử nghiệm: tắt AI');
    expect(await sharedIds(FAM)).toEqual([itemA, itemB].sort());
    const own = await asActor(ALICE, async (c) => (await c.query('select id from public.items order by id')).rows);
    expect(own.length).toBe(2);
    await setSwitch('ai_extraction', true, 'bật lại sau thử nghiệm');
  });

  it('WO16-02 every switch change is audited, and an unknown switch or an empty reason is refused', async () => {
    expect(
      Number(
        (await adminRows("select count(*)::int as n from public.audit_events where action = 'kill_switch.changed'"))[0]?.n,
      ),
    ).toBe(4);
    await expect(setSwitch('unknown_switch', false, 'x')).rejects.toMatchObject({ code: '22023' });
    await expect(setSwitch('sharing', false, '   ')).rejects.toMatchObject({ code: '22023' });
  });
});
