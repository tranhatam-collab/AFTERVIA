import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// WO11-02g (T25, T26; Q4 đã QUYẾT): yêu cầu xóa tài khoản thu hồi thành viên tổ chức của chính người đó.
// Owner duy nhất của một tổ chức bị từ chối (55000) trước mọi thay đổi, và có thể gửi lại sau khi chỉ định owner khác.
// Dữ liệu tổng hợp.
const SOLE = '00000000-0000-4000-8000-000000000101'; // owner duy nhất của một tổ chức
const NEW_OWNER = '00000000-0000-4000-8000-000000000102'; // owner được chỉ định sau khi bị từ chối
const OWNER_A = '00000000-0000-4000-8000-000000000103'; // owner, còn owner khác
const OWNER_B = '00000000-0000-4000-8000-000000000104'; // owner, còn owner khác, xin xóa
const AGENT = '00000000-0000-4000-8000-000000000105'; // agent, xin xóa
const RACE_1 = '00000000-0000-4000-8000-000000000106'; // một trong hai owner xin xóa cùng lúc
const RACE_2 = '00000000-0000-4000-8000-000000000107'; // owner còn lại xin xóa cùng lúc

let orgShared = '';
let orgSolo = '';
let orgRace = '';
let agentReceipt: Record<string, unknown> = {};

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

function first(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return row;
}

async function countOf(sql: string, params: unknown[]): Promise<number> {
  return first(await adminRows(sql, params)).n as number;
}

async function requestDeletion(actor: string, requestId: string): Promise<Record<string, unknown>> {
  return asActor(actor, async (c) => (await c.query('select public.request_account_deletion($1::text) as r', [requestId])).rows[0].r as Record<string, unknown>);
}

// Tổ chức mà người gọi thấy qua RLS (organizations_select_member).
async function visibleOrgs(actor: string): Promise<string[]> {
  return asActor(actor, async (c) => (await c.query('select id from public.organizations order by id')).rows.map((r) => r.id as string));
}

async function membership(org: string, user: string): Promise<{ status: string; revoked: boolean }> {
  const row = first(
    await adminRows('select status, revoked_at is not null as revoked from public.organization_members where org_id = $1 and user_id = $2', [org, user]),
  );
  return { status: row.status as string, revoked: row.revoked as boolean };
}

async function profileStatus(user: string): Promise<string> {
  return first(await adminRows('select deletion_status from public.profiles where id = $1', [user])).deletion_status as string;
}

describe('WO11-02g account deletion: membership is revoked, and an active sole owner is refused', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10), ($11, $12), ($13, $14)', [
        SOLE,
        'sole@test.invalid',
        NEW_OWNER,
        'newowner@test.invalid',
        OWNER_A,
        'ownera@test.invalid',
        OWNER_B,
        'ownerb@test.invalid',
        AGENT,
        'agent@test.invalid',
        RACE_1,
        'race1@test.invalid',
        RACE_2,
        'race2@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    orgShared = await asActor(OWNER_A, async (c) => (await c.query("select public.create_organization('Cửa hàng chung', 'VN') as id")).rows[0].id as string);
    await asActor(OWNER_A, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'owner')", [orgShared, OWNER_B]));
    await asActor(OWNER_A, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'agent')", [orgShared, AGENT]));
    orgSolo = await asActor(SOLE, async (c) => (await c.query("select public.create_organization('Cửa hàng một chủ', 'VN') as id")).rows[0].id as string);
    orgRace = await asActor(RACE_1, async (c) => (await c.query("select public.create_organization('Cửa hàng đua', 'VN') as id")).rows[0].id as string);
    await asActor(RACE_1, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'owner')", [orgRace, RACE_2]));
  });

  it('T25 the sole active owner of an organization is refused with 55000, and nothing of the account changes', async () => {
    await expect(requestDeletion(SOLE, 'req-mem-sole-0001')).rejects.toMatchObject({ code: '55000' });
    expect(await membership(orgSolo, SOLE)).toEqual({ status: 'ACTIVE', revoked: false });
    expect(await profileStatus(SOLE)).toBe('ACTIVE');
    expect(await countOf('select count(*)::int as n from public.account_deletion_requests where user_id = $1', [SOLE])).toBe(0);
    expect(await countOf('select count(*)::int as n from public.account_tombstones where user_id = $1', [SOLE])).toBe(0);
    expect(await countOf("select count(*)::int as n from public.audit_events where action = 'account.delete.requested' and object_id = $1", [SOLE])).toBe(0);
    expect(await visibleOrgs(SOLE)).toEqual([orgSolo]);
  });

  it('T25 an owner who shares ownership with another active owner may ask for deletion: the membership is revoked and counted, and the other owner keeps the organization', async () => {
    const receipt = await requestDeletion(OWNER_B, 'req-mem-ownerb-0001');
    expect(receipt).toMatchObject({
      request_id: 'req-mem-ownerb-0001',
      status: 'PENDING_POLICY',
      access_revoked: { grants: 0, participants: 0, memberships: 1 },
    });
    expect(receipt.pending).not.toContain('organization_membership');
    expect(await membership(orgShared, OWNER_B)).toEqual({ status: 'REVOKED', revoked: true });
    expect(await visibleOrgs(OWNER_B)).toEqual([]);
    expect(await membership(orgShared, OWNER_A)).toEqual({ status: 'ACTIVE', revoked: false });
    expect(await visibleOrgs(OWNER_A)).toEqual([orgShared]);
  });

  it('T25 an agent who asks for deletion loses the membership at once, sees no organization, and leaves the other members untouched', async () => {
    agentReceipt = await requestDeletion(AGENT, 'req-mem-agent-0001');
    expect(agentReceipt).toMatchObject({ access_revoked: { memberships: 1 } });
    expect(await membership(orgShared, AGENT)).toEqual({ status: 'REVOKED', revoked: true });
    expect(await visibleOrgs(AGENT)).toEqual([]);
    expect(await visibleOrgs(OWNER_A)).toEqual([orgShared]);
  });

  it('T25 the same request ID returns the same receipt and writes no second audit record', async () => {
    expect(await requestDeletion(AGENT, 'req-mem-agent-0001')).toEqual(agentReceipt);
    expect(await countOf("select count(*)::int as n from public.audit_events where action = 'account.delete.requested' and object_id = $1", [AGENT])).toBe(1);
  });

  it('T25 a refused sole owner asks again after appointing another active owner, and the organization keeps that owner', async () => {
    await asActor(SOLE, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'owner')", [orgSolo, NEW_OWNER]));
    const receipt = await requestDeletion(SOLE, 'req-mem-sole-0001');
    expect(receipt).toMatchObject({ status: 'PENDING_POLICY', access_revoked: { memberships: 1 } });
    expect(await membership(orgSolo, NEW_OWNER)).toEqual({ status: 'ACTIVE', revoked: false });
    expect(await visibleOrgs(NEW_OWNER)).toEqual([orgSolo]);
  });

  it('T25 two owners of one organization who ask at the same time: exactly one is refused, and the organization keeps an active owner', async () => {
    const attempts: Array<[string, string]> = [
      [RACE_1, 'req-mem-race-0001'],
      [RACE_2, 'req-mem-race-0002'],
    ];
    const outcomes = await Promise.all(
      attempts.map(([actor, requestId]) =>
        requestDeletion(actor, requestId).then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        ),
      ),
    );
    const refused = outcomes.filter((o) => !o.ok);
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ error: { code: '55000' } });
    expect(
      await countOf("select count(*)::int as n from public.organization_members where org_id = $1 and role = 'owner' and status = 'ACTIVE'", [orgRace]),
    ).toBe(1);
  });

  it('T26 restoring a backup taken before the deletion does not bring the membership back: the tombstone revokes it again', async () => {
    // Mô phỏng khôi phục backup cũ: đưa lại hồ sơ và thành viên như trước yêu cầu xóa.
    await adminRows("update public.profiles set deletion_status = 'ACTIVE' where id = $1", [AGENT]);
    await adminRows('update public.organization_members set status = $1, revoked_at = null where org_id = $2 and user_id = $3', ['ACTIVE', orgShared, AGENT]);
    expect(await visibleOrgs(AGENT)).toEqual([orgShared]);
    const applied = first(await adminRows('select public.reapply_account_tombstones() as n'));
    expect(applied.n).toBeGreaterThanOrEqual(1);
    expect(await membership(orgShared, AGENT)).toEqual({ status: 'REVOKED', revoked: true });
    expect(await visibleOrgs(AGENT)).toEqual([]);
    expect(await profileStatus(AGENT)).toBe('PENDING_DELETION');
  });

  it('T26 the reapply audit record counts the memberships it revoked and the organizations left without an active owner', async () => {
    const row = first(await adminRows("select details from public.audit_events where action = 'account.tombstone.reapplied' order by id desc limit 1"));
    expect(row.details).toMatchObject({ memberships_revoked: 1, organizations_without_active_owner: 0 });
  });
});
