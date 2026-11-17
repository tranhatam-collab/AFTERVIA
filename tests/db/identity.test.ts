import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-00000000000a';
const BOB = '00000000-0000-4000-8000-00000000000b';
const CAROL = '00000000-0000-4000-8000-00000000000c';
const DAVE = '00000000-0000-4000-8000-00000000000d';
const ERIN = '00000000-0000-4000-8000-00000000000e';

let orgId = '';

describe('T03 and T06 identity, membership and audit on Postgres 16', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      const users: Array<[string, string]> = [
        [ALICE, 'alice@test.invalid'],
        [BOB, 'bob@test.invalid'],
        [CAROL, 'carol@test.invalid'],
        [DAVE, 'dave@test.invalid'],
        [ERIN, 'erin@test.invalid'],
      ];
      for (const [id, email] of users) {
        await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
      }
    } finally {
      await admin.end();
    }
    orgId = await asActor(ALICE, async (c) => {
      const { rows } = await c.query("select public.create_organization('Cửa hàng An Phú', 'VN') as id");
      return rows[0].id as string;
    });
    await asActor(ALICE, (c) => c.query("select public.invite_member($1, $2, 'agent')", [orgId, BOB]));
    await asActor(ALICE, (c) => c.query("select public.invite_member($1, $2, 'manager')", [orgId, CAROL]));
  });

  it('T03 an organization created by its owner is still there from a new connection', async () => {
    const admin = await connect();
    try {
      const org = await admin.query('select legal_name, country from public.organizations where id = $1', [orgId]);
      const owner = await admin.query(
        'select role, status from public.organization_members where org_id = $1 and user_id = $2',
        [orgId, ALICE],
      );
      expect(org.rows).toEqual([{ legal_name: 'Cửa hàng An Phú', country: 'VN' }]);
      expect(owner.rows).toEqual([{ role: 'owner', status: 'ACTIVE' }]);
    } finally {
      await admin.end();
    }
  });

  it('T06 an authenticated user cannot insert an organization directly', async () => {
    await expect(
      asActor(ALICE, (c) =>
        c.query("insert into public.organizations (legal_name, country, created_by) values ('Giả mạo', 'VN', $1)", [ALICE]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T06 a user without membership sees no members of the organization', async () => {
    const rows = await asActor(ERIN, async (c) => {
      const result = await c.query('select user_id from public.organization_members where org_id = $1', [orgId]);
      return result.rows;
    });
    expect(rows).toEqual([]);
  });

  it('T06 an agent cannot promote itself with a direct update', async () => {
    await expect(
      asActor(BOB, (c) =>
        c.query("update public.organization_members set role = 'owner' where org_id = $1 and user_id = $2", [orgId, BOB]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T06 a manager cannot invite an owner, but may invite an agent', async () => {
    await expect(
      asActor(CAROL, (c) => c.query("select public.invite_member($1, $2, 'owner')", [orgId, DAVE])),
    ).rejects.toMatchObject({ code: '42501' });
    await asActor(CAROL, (c) => c.query("select public.invite_member($1, $2, 'agent')", [orgId, DAVE]));
    const role = await asActor(ALICE, async (c) => {
      const result = await c.query('select role from public.organization_members where org_id = $1 and user_id = $2', [orgId, DAVE]);
      return result.rows[0]?.role;
    });
    expect(role).toBe('agent');
  });

  it('T06 an owner cannot change their own role', async () => {
    await expect(
      asActor(ALICE, (c) => c.query("select public.change_member_role($1, $2, 'manager')", [orgId, ALICE])),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T06 the last active owner cannot leave the organization', async () => {
    await expect(
      asActor(ALICE, (c) => c.query('select public.revoke_member($1, $2)', [orgId, ALICE])),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('T06 an owner can promote an agent, and the change is written to the audit log', async () => {
    await asActor(ALICE, (c) => c.query("select public.change_member_role($1, $2, 'manager')", [orgId, BOB]));
    const admin = await connect();
    try {
      const audit = await admin.query(
        "select count(*)::int as n from public.audit_events where action = 'member.role_change' and org_id = $1 and object_id = $2",
        [orgId, BOB],
      );
      expect(audit.rows[0].n).toBe(1);
    } finally {
      await admin.end();
    }
  });

  it('T06 a revoked member loses read access at the next statement', async () => {
    await asActor(ALICE, (c) => c.query('select public.revoke_member($1, $2)', [orgId, DAVE]));
    const visible = await asActor(DAVE, async (c) => {
      const result = await c.query('select id from public.organizations where id = $1', [orgId]);
      return result.rows;
    });
    expect(visible).toEqual([]);
  });

  it('T06 audit events cannot be updated or deleted, even by a superuser', async () => {
    const admin = await connect();
    try {
      await expect(admin.query("update public.audit_events set action = 'tampered'")).rejects.toMatchObject({ code: '42501' });
      await expect(admin.query('delete from public.audit_events')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await admin.end();
    }
  });

  it('T06 a user can change locale but cannot change their own deletion status', async () => {
    await expect(
      asActor(ALICE, (c) => c.query("update public.profiles set deletion_status = 'DELETED' where id = $1", [ALICE])),
    ).rejects.toMatchObject({ code: '42501' });
    const updated = await asActor(ALICE, async (c) => {
      const result = await c.query("update public.profiles set locale = 'en' where id = $1", [ALICE]);
      return result.rowCount;
    });
    expect(updated).toBe(1);
  });

  it('T06 anonymous requests cannot read organizations', async () => {
    await expect(asActor(null, (c) => c.query('select id from public.organizations'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T06 a user cannot read another user profile', async () => {
    const rows = await asActor(BOB, async (c) => {
      const result = await c.query('select id from public.profiles where id = $1', [ALICE]);
      return result.rows;
    });
    expect(rows).toEqual([]);
  });
});
