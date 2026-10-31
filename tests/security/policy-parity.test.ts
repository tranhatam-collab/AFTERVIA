import type pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import type { OrgRole } from '@aftervia/domain';
import {
  authorizeInvite,
  authorizeRevoke,
  authorizeRoleChange,
  type ActorState,
  type Decision,
} from '../../services/api/src/auth/authorize';
import { asActor, connect, resetTestDatabase } from '../support/db';

// Người dùng cố định. ALICE và OWNER2 luôn là owner, nên tổ chức không thiếu owner trong ma trận.
const ALICE = '00000000-0000-4000-8000-00000000000a';
const OWNER2 = '00000000-0000-4000-8000-00000000000b';
const MGR = '00000000-0000-4000-8000-00000000000c';
const AGT = '00000000-0000-4000-8000-00000000000d';
const OUT = '00000000-0000-4000-8000-00000000000e';
const TGT = '00000000-0000-4000-8000-00000000000f';

type ActorRole = OrgRole | 'outsider';
const ACTOR_ROLES: readonly ActorRole[] = ['owner', 'manager', 'agent', 'outsider'];
const ROLES: readonly OrgRole[] = ['owner', 'manager', 'agent'];
const USER_OF: Record<ActorRole, string> = { owner: ALICE, manager: MGR, agent: AGT, outsider: OUT };

let orgId = '';
let client: pg.Client;

// Trạng thái thành viên cho một ô ma trận. Dùng chung cho cả ghi vào DB lẫn tính quyết định TypeScript.
function planFor(actor: ActorRole, targetRole: OrgRole | null): Array<[string, OrgRole | null]> {
  return [
    [ALICE, 'owner'],
    [OWNER2, 'owner'],
    [MGR, actor === 'manager' ? 'manager' : null],
    [AGT, actor === 'agent' ? 'agent' : null],
    [OUT, null],
    [TGT, targetRole],
  ];
}

async function setRole(c: pg.Client, userId: string, role: OrgRole | null): Promise<void> {
  if (role === null) {
    await c.query(
      "update public.organization_members set status = 'REVOKED', revoked_at = now() where org_id = $1 and user_id = $2 and status = 'ACTIVE'",
      [orgId, userId],
    );
    return;
  }
  await c.query(
    `insert into public.organization_members (org_id, user_id, role, status, granted_by)
     values ($1, $2, $3, 'ACTIVE', $4)
     on conflict (org_id, user_id) do update set role = excluded.role, status = 'ACTIVE', revoked_at = null`,
    [orgId, userId, role, ALICE],
  );
}

type Outcome = { allowed: true } | { allowed: false; category: string; code: string };

// Mỗi ô là một transaction: ghi trạng thái, gọi hàm SQL như actor, rồi rollback. Ô không ảnh hưởng nhau.
async function probe(
  plan: Array<[string, OrgRole | null]>,
  actorId: string,
  sql: string,
  params: unknown[],
): Promise<Outcome> {
  await client.query('begin');
  try {
    for (const [userId, role] of plan) await setRole(client, userId, role);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: actorId, role: 'authenticated' })]);
    await client.query('set local role authenticated');
    try {
      await client.query(sql, params);
      return { allowed: true };
    } catch (error) {
      const e = error as { message?: string; code?: string };
      return { allowed: false, category: categoryOf(e.message ?? ''), code: e.code ?? '' };
    }
  } finally {
    await client.query('rollback');
  }
}

// Phân loại thông điệp SQL thành cùng nhãn với lý do của TypeScript.
function categoryOf(message: string): string {
  if (message.includes('cannot assign a role to yourself')) return 'self_assignment';
  if (message.includes('own role')) return 'self_role_change';
  if (message === 'forbidden') return 'forbidden';
  if (message === 'member not found') return 'target_not_member';
  if (message.startsWith('organization must keep')) return 'last_owner';
  if (message === 'invalid role') return 'invalid_role';
  if (message === 'target is required') return 'invalid_target';
  if (message === 'not authenticated') return 'not_authenticated';
  return `unmapped:${message}`;
}

function agree(ts: Decision, db: Outcome): boolean {
  if (ts.allowed) return db.allowed === true;
  return db.allowed === false && db.category === ts.reason;
}

function describeOutcome(o: Outcome | Decision): string {
  return o.allowed ? 'allowed' : `denied(${'category' in o ? o.category : o.reason})`;
}

function otherOwners(plan: Array<[string, OrgRole | null]>, targetId: string): number {
  return plan.filter(([id, role]) => role === 'owner' && id !== targetId).length;
}

beforeAll(async () => {
  await resetTestDatabase();
  const admin = await connect();
  try {
    for (const [id, email] of [
      [ALICE, 'alice@test.invalid'],
      [OWNER2, 'owner2@test.invalid'],
      [MGR, 'mgr@test.invalid'],
      [AGT, 'agt@test.invalid'],
      [OUT, 'out@test.invalid'],
      [TGT, 'tgt@test.invalid'],
    ] as const) {
      await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
    }
  } finally {
    await admin.end();
  }
  orgId = await asActor(ALICE, async (c) => {
    const { rows } = await c.query("select public.create_organization('Tổ chức đối chiếu', 'VN') as id");
    return rows[0].id as string;
  });
  await asActor(ALICE, (c) => c.query("select public.invite_member($1, $2, 'owner')", [orgId, OWNER2]));
  client = await connect();
});

describe('T06 policy parity: TypeScript authorize matches the SQL functions cell by cell', () => {
  it('T06 invite decisions agree for every actor, self/other and invited role', async () => {
    const mismatches: string[] = [];
    const seen = new Set<string>();
    let cells = 0;
    for (const actor of ACTOR_ROLES) {
      for (const self of [false, true]) {
        for (const role of ROLES) {
          cells += 1;
          const actorId = USER_OF[actor];
          const targetId = self ? actorId : TGT;
          const actorState: ActorState = { userId: actorId, role: actor === 'outsider' ? null : actor };
          const ts = authorizeInvite({ actor: actorState, targetId, role });
          const db = await probe(planFor(actor, null), actorId, 'select public.invite_member($1, $2, $3)', [orgId, targetId, role]);
          seen.add(describeOutcome(db));
          if (!agree(ts, db)) mismatches.push(`invite actor=${actor} self=${self} role=${role}: ts=${describeOutcome(ts)} db=${describeOutcome(db)}`);
        }
      }
    }
    expect(cells).toBe(24);
    expect([...seen].sort()).toEqual(['allowed', 'denied(forbidden)', 'denied(self_assignment)']);
    expect(mismatches).toEqual([]);
  });

  it('T06 role-change decisions agree for every actor, target role and new role', async () => {
    const mismatches: string[] = [];
    const seen = new Set<string>();
    let cells = 0;
    for (const actor of ACTOR_ROLES) {
      const actorDbRole = actor === 'outsider' ? null : actor;
      // Đích khác người thực hiện: đích có thể là không thành viên, owner, manager hoặc agent.
      for (const targetRole of [null, ...ROLES] as const) {
        for (const newRole of ROLES) {
          cells += 1;
          const actorId = USER_OF[actor];
          const plan = planFor(actor, targetRole);
          const ts = authorizeRoleChange({
            actor: { userId: actorId, role: actorDbRole },
            target: { userId: TGT, role: targetRole },
            newRole,
            otherActiveOwners: otherOwners(plan, TGT),
          });
          const db = await probe(plan, actorId, 'select public.change_member_role($1, $2, $3)', [orgId, TGT, newRole]);
          seen.add(describeOutcome(db));
          if (!agree(ts, db)) mismatches.push(`change actor=${actor} target=${targetRole} new=${newRole}: ts=${describeOutcome(ts)} db=${describeOutcome(db)}`);
        }
      }
      // Tự đổi vai trò: đích là chính actor, vai trò đích là vai trò của actor.
      for (const newRole of ROLES) {
        cells += 1;
        const actorId = USER_OF[actor];
        const plan = planFor(actor, null);
        const ts = authorizeRoleChange({
          actor: { userId: actorId, role: actorDbRole },
          target: { userId: actorId, role: actorDbRole },
          newRole,
          otherActiveOwners: otherOwners(plan, actorId),
        });
        const db = await probe(plan, actorId, 'select public.change_member_role($1, $2, $3)', [orgId, actorId, newRole]);
        seen.add(describeOutcome(db));
        if (!agree(ts, db)) mismatches.push(`change-self actor=${actor} new=${newRole}: ts=${describeOutcome(ts)} db=${describeOutcome(db)}`);
      }
    }
    expect(cells).toBe(60);
    expect([...seen].sort()).toEqual(['allowed', 'denied(forbidden)', 'denied(self_role_change)', 'denied(target_not_member)']);
    expect(mismatches).toEqual([]);
  });

  it('T06 revoke decisions agree for every actor, target role, and self-leave', async () => {
    const mismatches: string[] = [];
    const seen = new Set<string>();
    let cells = 0;
    for (const actor of ACTOR_ROLES) {
      const actorDbRole = actor === 'outsider' ? null : actor;
      for (const targetRole of [null, ...ROLES] as const) {
        cells += 1;
        const actorId = USER_OF[actor];
        const plan = planFor(actor, targetRole);
        const ts = authorizeRevoke({
          actor: { userId: actorId, role: actorDbRole },
          target: { userId: TGT, role: targetRole },
          otherActiveOwners: otherOwners(plan, TGT),
        });
        const db = await probe(plan, actorId, 'select public.revoke_member($1, $2)', [orgId, TGT]);
        seen.add(describeOutcome(db));
        if (!agree(ts, db)) mismatches.push(`revoke actor=${actor} target=${targetRole}: ts=${describeOutcome(ts)} db=${describeOutcome(db)}`);
      }
      cells += 1;
      const actorId = USER_OF[actor];
      const plan = planFor(actor, null);
      const ts = authorizeRevoke({
        actor: { userId: actorId, role: actorDbRole },
        target: { userId: actorId, role: actorDbRole },
        otherActiveOwners: otherOwners(plan, actorId),
      });
      const db = await probe(plan, actorId, 'select public.revoke_member($1, $2)', [orgId, actorId]);
      seen.add(describeOutcome(db));
      if (!agree(ts, db)) mismatches.push(`revoke-self actor=${actor}: ts=${describeOutcome(ts)} db=${describeOutcome(db)}`);
    }
    expect(cells).toBe(20);
    expect([...seen].sort()).toEqual(['allowed', 'denied(forbidden)', 'denied(target_not_member)']);
    expect(mismatches).toEqual([]);
  });
});
