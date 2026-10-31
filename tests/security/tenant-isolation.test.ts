import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// Hai tổ chức A và B, mỗi bên có owner và thành viên. Mọi kịch bản xâm nhập đi qua vai trò authenticated
// với claims của người thực hiện, giống PostgREST. Mỗi nhóm có kiểm chứng dương để tránh pass giả.
const A_OWNER = '00000000-0000-4000-8000-0000000000a1';
const A_MGR = '00000000-0000-4000-8000-0000000000a2';
const A_AGENT = '00000000-0000-4000-8000-0000000000a3';
const B_OWNER = '00000000-0000-4000-8000-0000000000b1';
const B_AGENT = '00000000-0000-4000-8000-0000000000b2';
const OUTSIDER = '00000000-0000-4000-8000-0000000000c1';

let orgA = '';
let orgB = '';

async function ids(sqlText: string, params: unknown[], actor: string | null): Promise<string[]> {
  return asActor(actor, async (c) => (await c.query(sqlText, params)).rows.map((r) => r.id as string));
}

async function count(sqlText: string, params: unknown[], actor: string | null): Promise<number> {
  return asActor(actor, async (c) => (await c.query(sqlText, params)).rows[0].n as number);
}

describe('T04 and T05 tenant isolation across every database path', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      for (const [id, email] of [
        [A_OWNER, 'a-owner@test.invalid'],
        [A_MGR, 'a-mgr@test.invalid'],
        [A_AGENT, 'a-agent@test.invalid'],
        [B_OWNER, 'b-owner@test.invalid'],
        [B_AGENT, 'b-agent@test.invalid'],
        [OUTSIDER, 'outsider@test.invalid'],
      ] as const) {
        await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
      }
    } finally {
      await admin.end();
    }
    orgA = (await ids("select public.create_organization('Tổ chức A', 'VN') as id", [], A_OWNER))[0] ?? '';
    orgB = (await ids("select public.create_organization('Tổ chức B', 'VN') as id", [], B_OWNER))[0] ?? '';
    await asActor(A_OWNER, (c) => c.query("select public.invite_member($1, $2, 'manager')", [orgA, A_MGR]));
    await asActor(A_OWNER, (c) => c.query("select public.invite_member($1, $2, 'agent')", [orgA, A_AGENT]));
    await asActor(B_OWNER, (c) => c.query("select public.invite_member($1, $2, 'agent')", [orgB, B_AGENT]));
  });

  it('T04 each owner sees only its own organization in a plain list', async () => {
    expect(await ids('select id from public.organizations', [], A_OWNER)).toEqual([orgA]);
    expect(await ids('select id from public.organizations', [], B_OWNER)).toEqual([orgB]);
  });

  it('T04 a detail lookup by identifier does not reveal another tenant', async () => {
    expect(await ids('select id from public.organizations where id = $1', [orgB], A_OWNER)).toEqual([]);
    expect(await ids('select id from public.organizations where id = $1', [orgA], A_OWNER)).toEqual([orgA]);
  });

  it('T04 a name search does not reveal another tenant', async () => {
    expect(await ids("select id from public.organizations where legal_name ilike '%Tổ chức B%'", [], A_OWNER)).toEqual([]);
    expect(await ids("select id from public.organizations where legal_name ilike '%Tổ chức A%'", [], A_OWNER)).toEqual([orgA]);
  });

  it('T04 counts and member lists of another tenant are empty', async () => {
    expect(await count('select count(*)::int as n from public.organization_members where org_id = $1', [orgB], A_OWNER)).toBe(0);
    expect(await count('select count(*)::int as n from public.organization_members where org_id = $1', [orgA], A_OWNER)).toBe(3);
    expect(await count('select count(*)::int as n from public.organization_members', [], A_OWNER)).toBe(3);
    expect(await count('select count(*)::int as n from public.profiles', [], A_OWNER)).toBe(1);
  });

  it('T05 a join from memberships into another tenant returns nothing', async () => {
    const rows = await asActor(A_AGENT, async (c) => {
      const result = await c.query(
        'select m.user_id from public.organization_members m join public.organizations o on o.id = m.org_id where o.id = $1',
        [orgB],
      );
      return result.rows;
    });
    expect(rows).toEqual([]);
  });

  it('T05 the audit trail of tenant B is invisible to tenant A, while A still sees its own trail', async () => {
    expect(await count('select count(*)::int as n from public.audit_events where org_id = $1', [orgB], A_OWNER)).toBe(0);
    expect(await count('select count(*)::int as n from public.audit_events where org_id = $1', [orgA], A_OWNER)).toBeGreaterThan(0);
  });

  it('T05 an agent cannot read the audit trail even of its own organization', async () => {
    expect(await count('select count(*)::int as n from public.audit_events where org_id = $1', [orgA], A_AGENT)).toBe(0);
  });

  it('T05 a manager of tenant A cannot invite into tenant B, and an owner of A cannot change B roles', async () => {
    await expect(
      asActor(A_MGR, (c) => c.query("select public.invite_member($1, $2, 'agent')", [orgB, OUTSIDER])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(A_OWNER, (c) => c.query("select public.change_member_role($1, $2, 'manager')", [orgB, B_AGENT])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(A_OWNER, (c) => c.query('select public.revoke_member($1, $2)', [orgB, B_AGENT])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(A_OWNER, (c) => c.query('select public.update_organization_legal_name($1, $2)', [orgB, 'Bị đổi tên'])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T05 direct writes into another tenant are refused for every client', async () => {
    await expect(
      asActor(A_OWNER, (c) =>
        c.query("insert into public.organization_members (org_id, user_id, role) values ($1, $2, 'owner')", [orgB, A_OWNER]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(A_OWNER, (c) => c.query("update public.organizations set legal_name = 'Bị đổi' where id = $1", [orgB])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(A_OWNER, (c) => c.query("update public.organization_members set role = 'owner' where org_id = $1", [orgB])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T05 an outsider and an anonymous caller see no tenant data at all', async () => {
    expect(await ids('select id from public.organizations', [], OUTSIDER)).toEqual([]);
    expect(await count('select count(*)::int as n from public.organization_members', [], OUTSIDER)).toBe(0);
    await expect(asActor(null, (c) => c.query('select id from public.organizations'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T05 another user profile is invisible across tenants', async () => {
    expect(await ids('select id from public.profiles where id = $1', [B_OWNER], A_OWNER)).toEqual([]);
    expect(await ids('select id from public.profiles where id = $1', [A_OWNER], A_OWNER)).toEqual([A_OWNER]);
  });

  it('T04 a revoked member loses every read path into its former organization', async () => {
    await asActor(A_OWNER, (c) => c.query('select public.revoke_member($1, $2)', [orgA, A_AGENT]));
    expect(await ids('select id from public.organizations', [], A_AGENT)).toEqual([]);
    expect(await count('select count(*)::int as n from public.organization_members where org_id = $1', [orgA], A_AGENT)).toBe(0);
  });

  it('T05 tenant B is unchanged after every cross-tenant attempt', async () => {
    const admin = await connect();
    try {
      const org = await admin.query('select legal_name from public.organizations where id = $1', [orgB]);
      const members = await admin.query(
        "select user_id, role from public.organization_members where org_id = $1 and status = 'ACTIVE' order by role",
        [orgB],
      );
      expect(org.rows).toEqual([{ legal_name: 'Tổ chức B' }]);
      expect(members.rows.map((r) => r.role).sort()).toEqual(['agent', 'owner']);
    } finally {
      await admin.end();
    }
  });
});
