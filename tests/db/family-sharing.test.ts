import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // chủ kho đồ, mời gia đình và chia sẻ từng món
const FAM = '00000000-0000-4000-8000-0000000000b1'; // thành viên đã chấp nhận lời mời ngay từ đầu
const FAM2 = '00000000-0000-4000-8000-0000000000b2'; // thành viên được mời, chấp nhận sau
const STRANGER = '00000000-0000-4000-8000-0000000000f1'; // không có quan hệ với chủ kho đồ
const SHA = 'd'.repeat(64);

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

let itemA = '';
let itemB = '';
let membershipFam = '';
let membershipFam2 = '';
let shareA = '';

async function completedDocument(key: string): Promise<string> {
  const doc = await asActor(ALICE, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(ALICE, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(ALICE, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, SHA, 4096]));
  return doc;
}

async function sharedAs(actor: string): Promise<Array<Record<string, unknown>>> {
  return asActor(actor, async (c) =>
    (await c.query('select item_id, owner_user_id, title, brand, model, shared_at from public.family_shared_items()')).rows,
  );
}

describe('WO13-01 family sharing: one item at a time, revocation at the next call', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)', [
        ALICE,
        'alice@test.invalid',
        FAM,
        'fam@test.invalid',
        FAM2,
        'fam2@test.invalid',
        STRANGER,
        'stranger@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    itemA = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Máy pha cà phê', 'Hãng A', 'Model A', '2025-01-10'::date, 'VND') as id")).rows[0].id as string,
    );
    itemB = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Tủ lạnh', 'Hãng B', 'Model B', null, null) as id")).rows[0].id as string,
    );
    membershipFam = await asActor(ALICE, async (c) =>
      (await c.query('select public.invite_family_member($1::uuid) as id', [FAM])).rows[0].id as string,
    );
    await asActor(FAM, (c) => c.query('select public.accept_family_invitation($1::uuid)', [membershipFam]));
    membershipFam2 = await asActor(ALICE, async (c) =>
      (await c.query('select public.invite_family_member($1::uuid) as id', [FAM2])).rows[0].id as string,
    );
    await completedDocument('key-family-doc-0001');
  });

  it('T31 before any share, a family member sees no item through the function or the owner table', async () => {
    expect(await sharedAs(FAM)).toEqual([]);
    expect(await asActor(FAM, async (c) => (await c.query('select id from public.items')).rows)).toEqual([]);
  });

  it('T31 the owner shares one item: the member sees only that item, with title, brand and model, and no document or purchase detail', async () => {
    shareA = await asActor(ALICE, async (c) =>
      (await c.query('select public.share_item_with_family($1::uuid, $2::uuid) as id', [itemA, FAM])).rows[0].id as string,
    );
    const rows = await sharedAs(FAM);
    expect(rows.map((r) => r.item_id)).toEqual([itemA]);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(['brand', 'item_id', 'model', 'owner_user_id', 'shared_at', 'title']);
    expect(await asActor(FAM, async (c) => (await c.query('select id from public.items')).rows)).toEqual([]);
    expect(await asActor(FAM, async (c) => (await c.query('select id from public.documents')).rows)).toEqual([]);
  });

  it('T31 a member cannot share an item, and a stranger sees no shared item', async () => {
    await expect(
      asActor(FAM, async (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemA, STRANGER])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(FAM, async (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemB, FAM])),
    ).rejects.toMatchObject({ code: '42501' });
    expect(await sharedAs(STRANGER)).toEqual([]);
  });

  it('T31 an invitation the member has not accepted receives no share, and another account cannot accept it', async () => {
    await expect(
      asActor(ALICE, async (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemB, FAM2])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(STRANGER, async (c) => c.query('select public.accept_family_invitation($1::uuid)', [membershipFam2])),
    ).rejects.toMatchObject({ code: 'P0002' });
    expect(await sharedAs(FAM2)).toEqual([]);
  });

  it('T31 after acceptance, a share of a second item reaches only that member and only that item', async () => {
    await asActor(FAM2, (c) => c.query('select public.accept_family_invitation($1::uuid)', [membershipFam2]));
    await asActor(ALICE, (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemB, FAM2]));
    expect((await sharedAs(FAM2)).map((r) => r.item_id)).toEqual([itemB]);
    expect((await sharedAs(FAM)).map((r) => r.item_id)).toEqual([itemA]);
  });

  it("T31 revoking a share removes the item at the next call, and a member cannot revoke the owner's share", async () => {
    await expect(asActor(FAM, async (c) => c.query('select public.revoke_item_share($1::uuid)', [shareA]))).rejects.toMatchObject({
      code: 'P0002',
    });
    expect((await sharedAs(FAM)).map((r) => r.item_id)).toEqual([itemA]);
    await asActor(ALICE, (c) => c.query('select public.revoke_item_share($1::uuid)', [shareA]));
    expect(await sharedAs(FAM)).toEqual([]);
    expect((await sharedAs(FAM2)).map((r) => r.item_id)).toEqual([itemB]);
  });

  it('T31 revoking a membership ends every share of that member at once and leaves other members unchanged', async () => {
    shareA = await asActor(ALICE, async (c) =>
      (await c.query('select public.share_item_with_family($1::uuid, $2::uuid) as id', [itemA, FAM])).rows[0].id as string,
    );
    expect((await sharedAs(FAM)).map((r) => r.item_id)).toEqual([itemA]);
    const revoked = await asActor(ALICE, async (c) =>
      (await c.query('select public.revoke_family_membership($1::uuid) as n', [membershipFam])).rows[0].n,
    );
    expect(revoked).toBe(1);
    expect(await sharedAs(FAM)).toEqual([]);
    expect((await sharedAs(FAM2)).map((r) => r.item_id)).toEqual([itemB]);
    await expect(
      asActor(ALICE, async (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemA, FAM])),
    ).rejects.toMatchObject({ code: '42501' });
    expect(first(await adminRows('select count(*)::int as n from public.item_family_shares where member_user_id = $1 and revoked_at is null', [FAM]))).toEqual({
      n: 0,
    });
  });

  it('T31 after the owner asks for account deletion, the owner shares stop being readable and no new share is accepted', async () => {
    expect((await sharedAs(FAM2)).map((r) => r.item_id)).toEqual([itemB]);
    await asActor(ALICE, (c) => c.query('select public.request_account_deletion($1::text)', ['req-family-alice-0001']));
    expect(await sharedAs(FAM2)).toEqual([]);
    await expect(
      asActor(ALICE, async (c) => c.query('select public.share_item_with_family($1::uuid, $2::uuid)', [itemB, FAM2])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T31 after a member asks for account deletion, that member sees no shared item', async () => {
    await asActor(FAM2, (c) => c.query('select public.request_account_deletion($1::text)', ['req-family-fam2-0001']));
    expect(await sharedAs(FAM2)).toEqual([]);
  });
});

function first(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return row;
}
