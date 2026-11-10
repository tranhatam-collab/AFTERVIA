import { beforeAll, describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';

// Audit of 06e9cc0: AV-DB-01, AV-DB-02, AV-DB-03, API-F03 (fixed in migration 0024).
// The local test database is plain Postgres with a shim. It does not have Supabase's default privileges, which also
// grant EXECUTE on new public functions to anon and authenticated. So these checks verify the explicit state that the
// migrations produce (explicit revokes from public, anon and authenticated), not a Supabase project as deployed.
const ALICE = '00000000-0000-4000-8000-0000000003a1';
const EXTRACTION = '00000000-0000-4000-8000-0000000003e1';

const SERVER_ONLY = [
  'public.set_kill_switch(text, boolean, text)',
  'public.reapply_account_tombstones()',
  'public.write_audit(uuid, text, text, text, jsonb)',
  'public.record_field_confirmation(uuid, text, jsonb, jsonb, text)',
] as const;
const CLIENT_ROLES = ['anon', 'authenticated', 'public'] as const;

async function hasExecute(role: string, signature: string): Promise<boolean> {
  const admin = await connect();
  try {
    return (await admin.query("select has_function_privilege($1, $2, 'EXECUTE') as ok", [role, signature])).rows[0].ok as boolean;
  } finally {
    await admin.end();
  }
}

describe('migration 0024: server-only functions (explicit privileges on the local test database, without Supabase default privileges)', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2)', [ALICE, 'alice-fp@test.invalid']);
    } finally {
      await admin.end();
    }
  });

  for (const signature of SERVER_ONLY) {
    for (const role of CLIENT_ROLES) {
      it(`explicit state after migrations: ${role} has no EXECUTE on ${signature}`, async () => {
        expect(await hasExecute(role, signature)).toBe(false);
      });
    }
  }

  it('explicit state after migrations: service_role has EXECUTE on set_kill_switch, reapply_account_tombstones and record_field_confirmation', async () => {
    expect(await hasExecute('service_role', 'public.set_kill_switch(text, boolean, text)')).toBe(true);
    expect(await hasExecute('service_role', 'public.reapply_account_tombstones()')).toBe(true);
    expect(await hasExecute('service_role', 'public.record_field_confirmation(uuid, text, jsonb, jsonb, text)')).toBe(true);
  });

  it('defence in depth: even if Supabase default privileges grant EXECUTE back, anon and authenticated are refused inside the function', async () => {
    const calls = [
      "select public.set_kill_switch('sharing', false, 'probe')",
      'select public.reapply_account_tombstones()',
      `select public.record_field_confirmation('${EXTRACTION}'::uuid, 'purchase.amount', null, '1'::jsonb, null)`,
    ];
    for (const role of ['anon', 'authenticated'] as const) {
      for (const sql of calls) {
        const admin = await connect();
        try {
          await admin.query('begin');
          // Simulate the Supabase default privilege for this one transaction.
          await admin.query('grant execute on function public.set_kill_switch(text, boolean, text), public.reapply_account_tombstones(), public.record_field_confirmation(uuid, text, jsonb, jsonb, text) to anon, authenticated');
          const claims = role === 'anon' ? { role: 'anon' } : { sub: ALICE, role: 'authenticated' };
          await admin.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
          await admin.query(`set local role ${role}`);
          await expect(admin.query(sql)).rejects.toMatchObject({ code: '42501', message: 'server only' });
        } finally {
          await admin.query('rollback');
          await admin.end();
        }
      }
    }
    const sharing = await connect();
    try {
      expect((await sharing.query("select enabled from public.kill_switches where switch_key = 'sharing'")).rows[0].enabled).toBe(true);
    } finally {
      await sharing.end();
    }
  });

  it('the server path works: service_role changes a kill switch and records a field confirmation for the user in the claims', async () => {
    const client = await connect();
    try {
      await client.query('begin');
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ALICE, role: 'service_role' })]);
      await client.query('set local role service_role');
      await client.query("select public.set_kill_switch('sharing', true, 'probe from server')");
      const id = (
        await client.query("select public.record_field_confirmation($1::uuid, 'purchase.amount', null, '1'::jsonb, null) as id", [EXTRACTION])
      ).rows[0].id as string;
      await client.query('reset role');
      const actor = (await client.query('select actor_user_id from public.field_confirmations where id = $1', [id])).rows[0].actor_user_id;
      expect(actor).toBe(ALICE);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      await client.end();
    }
  });
});
