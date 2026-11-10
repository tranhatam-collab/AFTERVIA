import { beforeAll, describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';

// OWN-A-05 (audit 10/11, D-05). The 300-second re-authentication rule lived only in the API
// (app.ts: issuedRecently). request_account_deletion is granted to authenticated, so a direct RPC with a
// signed-in role skipped it. Migration 0028 puts the rule inside the function. These tests call the function
// the way a direct RPC would: role authenticated with claims we choose. Synthetic data only.
const USERS = {
  noIat: '00000000-0000-4000-8000-0000000005a1',
  stale: '00000000-0000-4000-8000-0000000005a2',
  fresh: '00000000-0000-4000-8000-0000000005a3',
  future: '00000000-0000-4000-8000-0000000005a4',
} as const;

// One transaction as role authenticated with exactly these claims, rolled back unless it is asked to commit.
async function asClaims<T>(claims: Record<string, unknown>, run: (c: import('pg').Client) => Promise<T>): Promise<T> {
  const client = await connect();
  try {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await client.query('set local role authenticated');
    try {
      return await run(client);
    } finally {
      await client.query('rollback');
    }
  } finally {
    await client.end();
  }
}

const nowSeconds = (): number => Math.floor(Date.now() / 1000);
const deletion = (c: import('pg').Client, requestId: string) =>
  c.query('select public.request_account_deletion($1::text) as receipt', [requestId]);

describe('OWN-A-05 account deletion requires a recent session inside the database', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1,$2),($3,$4),($5,$6),($7,$8)', [
        USERS.noIat, 'noiat-reauth@test.invalid',
        USERS.stale, 'stale-reauth@test.invalid',
        USERS.fresh, 'fresh-reauth@test.invalid',
        USERS.future, 'future-reauth@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
  });

  it('D-05 a direct RPC whose session carries no iat is refused', async () => {
    await asClaims({ sub: USERS.noIat, role: 'authenticated' }, async (c) => {
      await expect(deletion(c, 'req-reauth-noiat-01')).rejects.toMatchObject({ code: '42501', message: 'reauthentication required' });
    });
  });

  it('D-05 a direct RPC whose session is older than the re-authentication window is refused', async () => {
    await asClaims({ sub: USERS.stale, role: 'authenticated', iat: nowSeconds() - 400 }, async (c) => {
      await expect(deletion(c, 'req-reauth-stale-01')).rejects.toMatchObject({ code: '42501', message: 'reauthentication required' });
    });
  });

  it('D-05 a session dated in the future is refused, so a wrong clock cannot buy a longer window', async () => {
    await asClaims({ sub: USERS.future, role: 'authenticated', iat: nowSeconds() + 600 }, async (c) => {
      await expect(deletion(c, 'req-reauth-future-01')).rejects.toMatchObject({ code: '42501', message: 'reauthentication required' });
    });
  });

  it('D-05 a session inside the window still works, and no tombstone is left by the refused calls', async () => {
    await asClaims({ sub: USERS.fresh, role: 'authenticated', iat: nowSeconds() - 60 }, async (c) => {
      const receipt = (await deletion(c, 'req-reauth-fresh-01')).rows[0].receipt as Record<string, unknown>;
      expect(receipt).toMatchObject({ request_id: 'req-reauth-fresh-01' });
    });
    const admin = await connect();
    try {
      const { rows } = await admin.query('select count(*)::int as n from public.account_tombstones where user_id = any($1::uuid[])', [
        [USERS.noIat, USERS.stale, USERS.future, USERS.fresh],
      ]);
      // Every call above ran in a rolled-back transaction, so nothing persists either way.
      expect(rows[0]?.n).toBe(0);
    } finally {
      await admin.end();
    }
  });
});
