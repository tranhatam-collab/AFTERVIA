import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO11-02b (T25): tài khoản đang PENDING_DELETION không tạo hay đổi dữ liệu của chính mình; thu hồi vẫn được.
// Dữ liệu tổng hợp. Trigger nằm ở migration 0018.
const ALICE = '00000000-0000-4000-8000-0000000000e1';
const BOB = '00000000-0000-4000-8000-0000000000e2';

let itemA = '';
let itemB = '';
let shareId = '';

describe('WO11-02b pending deletion: the account cannot write its own data, revocation still works', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@test.invalid', BOB, 'bob@test.invalid']);
      itemA = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Máy giặt', null, null, null, 'VND') as id")).rows[0].id as string);
      itemB = await asActor(BOB, async (c) => (await c.query("select public.create_item('Tủ lạnh', null, null, null, 'VND') as id")).rows[0].id as string);
      // Thành viên gia đình đã chấp nhận, và một chia sẻ đang hiệu lực từ ALICE cho BOB (ghi trực tiếp, dữ liệu tổng hợp).
      await admin.query('insert into public.family_memberships (owner_user_id, member_user_id, accepted_at) values ($1, $2, now())', [ALICE, BOB]);
      shareId = (await admin.query('insert into public.item_family_shares (item_id, owner_user_id, member_user_id) values ($1, $2, $3) returning id', [itemA, ALICE, BOB])).rows[0].id as string;
      await asActor(ALICE, (c) => c.query("select public.request_account_deletion('erase-alice-0001')"));
      const status = (await admin.query('select deletion_status from public.profiles where id = $1', [ALICE])).rows[0].deletion_status;
      expect(status).toBe('PENDING_DELETION');
    } finally {
      await admin.end();
    }
  });

  it('T25 a pending account cannot create an item or an upload ticket, and still reads the items it already had', async () => {
    await expect(asActor(ALICE, (c) => c.query("select public.create_item('Lò nướng', null, null, null, 'VND')"))).rejects.toMatchObject({ code: '55000' });
    await expect(asActor(ALICE, (c) => c.query("select public.create_upload_ticket('application/pdf', 1024)"))).rejects.toMatchObject({ code: '55000' });
    const own = await asActor(ALICE, async (c) => (await c.query('select id from public.items order by id')).rows.map((r) => r.id as string));
    expect(own).toContain(itemA);
  });

  it('T25 a pending account cannot change an item it owns, and another account can still change its own item', async () => {
    await expect(asActor(ALICE, (c) => c.query("select public.update_item($1::uuid, 1, 'Đổi tên', null, null, null, null)", [itemA]))).rejects.toMatchObject({ code: '55000' });
    const version = await asActor(BOB, async (c) => (await c.query("select public.update_item($1::uuid, 1, 'Tủ lạnh mới', null, null, null, null) as version", [itemB])).rows[0].version);
    expect(version).toBe(2);
  });

  it('T25 a pending account can still revoke a share it gave, but cannot share the item again', async () => {
    await asActor(ALICE, (c) => c.query('select public.revoke_item_share($1::uuid)', [shareId]));
    const admin = await connect();
    try {
      const revoked = (await admin.query('select revoked_at is not null as revoked from public.item_family_shares where id = $1', [shareId])).rows[0].revoked;
      expect(revoked).toBe(true);
    } finally {
      await admin.end();
    }
    // Cổng thu hồi của WO13-01 chặn trước khi tới INSERT: lỗi 42501 'account deletion requested'. Trigger 0018 là lớp thứ hai.
    await expect(asActor(ALICE, (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemA, BOB]))).rejects.toMatchObject({ code: '42501', message: 'account deletion requested' });
  });

  it('T25 writes made without a user session, such as restore or system jobs, are not blocked by this guard', async () => {
    const admin = await connect();
    try {
      const inserted = await admin.query("insert into public.items (owner_user_id, title, currency) values ($1, 'Ghi hệ thống', 'VND') returning id", [ALICE]);
      expect(inserted.rowCount).toBe(1);
    } finally {
      await admin.end();
    }
  });
});
