import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// OWN-A-06 (audit 10/11, D-06). change_member_role and revoke_member locked only the target row, then counted
// the other active owners. Two owners revoking each other at the same time each saw the other as active, so
// both succeeded and the organization was left with no owner. Migration 0029 locks the whole active-owner set
// in id order first. Synthetic data only.
const A = '00000000-0000-4000-8000-0000000006a1';
const B = '00000000-0000-4000-8000-0000000006a2';
const C = '00000000-0000-4000-8000-0000000006a3';

let orgRevoke = '';
let orgDemote = '';

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function activeOwners(orgId: string): Promise<number> {
  const row = (await adminRows("select count(*)::int as n from public.organization_members where org_id = $1 and role = 'owner' and status = 'ACTIVE'", [orgId]))[0];
  if (!row) throw new Error('expected one row');
  return Number(row.n);
}

// A client parked inside a transaction as one user, so two of them can race.
async function openAs(userId: string): Promise<import('pg').Client> {
  const c = await connect();
  await c.query('begin');
  await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated', iat: Math.floor(Date.now() / 1000) })]);
  await c.query('set local role authenticated');
  await c.query("set local statement_timeout = '15s'");
  return c;
}

async function twoOwnerOrg(name: string, second: string): Promise<string> {
  const id = (await asActor(A, async (c) => (await c.query('select public.create_organization($1::text, $2::char(2)) as id', [name, 'VN'])).rows[0].id)) as string;
  await asActor(A, (c) => c.query('select public.invite_member($1::uuid, $2::uuid, $3::text)', [id, second, 'owner']));
  return id;
}

describe('OWN-A-06 an organization cannot be left without an owner by two concurrent calls', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await adminRows('insert into auth.users (id, email) values ($1,$2),($3,$4),($5,$6)', [
      A, 'owner-a-race@test.invalid',
      B, 'owner-b-race@test.invalid',
      C, 'owner-c-race@test.invalid',
    ]);
    orgRevoke = await twoOwnerOrg('Cửa hàng RACE-REVOKE', B);
    orgDemote = await twoOwnerOrg('Cửa hàng RACE-DEMOTE', C);
  });

  it('D-06 two owners revoking each other at the same time: exactly one succeeds and an owner remains', async () => {
    expect(await activeOwners(orgRevoke)).toBe(2);
    const first = await openAs(A);
    const second = await openAs(B);
    try {
      // A revokes B and holds the transaction open; B's call must wait for the owner-set lock.
      await first.query('select public.revoke_member($1::uuid, $2::uuid)', [orgRevoke, B]);
      const blocked = second.query('select public.revoke_member($1::uuid, $2::uuid)', [orgRevoke, A]);
      const loser = blocked.then(() => ({ ok: true }) as const).catch((error: { code?: string }) => ({ ok: false, code: error.code }) as const);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await first.query('commit');
      const outcome = await loser;
      // The loser is refused. Either it is no longer an active owner once it reads committed state (42501),
      // or it is the last owner and the invariant refuses the revoke (23514). Both keep an owner in place.
      // Narrow for TypeScript and fail loudly when the race is open: both calls succeeding is the bug.
      if (outcome.ok) throw new Error('both concurrent calls succeeded, so the organization was left without an owner');
      expect(['42501', '23514']).toContain(outcome.code);
    } finally {
      await second.query('rollback').catch(() => undefined);
      await second.end();
      await first.end();
    }
    expect(await activeOwners(orgRevoke)).toBe(1);
  });

  it('D-06 one owner revoking while the other demotes themselves to manager: an owner remains', async () => {
    expect(await activeOwners(orgDemote)).toBe(2);
    const first = await openAs(A);
    const second = await openAs(C);
    try {
      await first.query('select public.change_member_role($1::uuid, $2::uuid, $3::text)', [orgDemote, C, 'manager']);
      const blocked = second.query('select public.revoke_member($1::uuid, $2::uuid)', [orgDemote, A]);
      const loser = blocked.then(() => ({ ok: true }) as const).catch((error: { code?: string }) => ({ ok: false, code: error.code }) as const);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await first.query('commit');
      const outcome = await loser;
      // Narrow for TypeScript and fail loudly when the race is open: both calls succeeding is the bug.
      if (outcome.ok) throw new Error('both concurrent calls succeeded, so the organization was left without an owner');
      expect(['42501', '23514']).toContain(outcome.code);
    } finally {
      await second.query('rollback').catch(() => undefined);
      await second.end();
      await first.end();
    }
    expect(await activeOwners(orgDemote)).toBe(1);
  });
});
