import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

// OWN-A-04 (audit 10/11, D-02). invite_member and invite_case_participant checked only that the profile
// existed, so an account that had already asked to be deleted could be invited again and its membership
// reactivated to ACTIVE. The 0018 trigger blocks the CALLER while pending deletion, not the invitee, and
// 0020 revokes memberships at deletion time without refusing a later invite. Synthetic data only.
const OWNER = '00000000-0000-4000-8000-0000000004c1';
const TARGET = '00000000-0000-4000-8000-0000000004c2'; // asks for deletion, then gets invited to the org
const HEALTHY = '00000000-0000-4000-8000-0000000004c3'; // control: never asks for deletion
const CUSTOMER = '00000000-0000-4000-8000-0000000004c4';
const PARTNER = '00000000-0000-4000-8000-0000000004c5'; // asks for deletion, then gets invited to a case

let orgId = '';
let caseId = '';

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function count(sql: string, params: unknown[]): Promise<number> {
  const row = (await adminRows(sql, params))[0];
  if (!row) throw new Error('expected one row');
  return Number(row.n);
}

describe('OWN-A-04 invitations refuse an account that asked to be deleted', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await adminRows('insert into auth.users (id, email) values ($1,$2),($3,$4),($5,$6),($7,$8),($9,$10)', [
      OWNER, 'owner-inv@test.invalid',
      TARGET, 'target-inv@test.invalid',
      HEALTHY, 'healthy-inv@test.invalid',
      CUSTOMER, 'customer-inv@test.invalid',
      PARTNER, 'partner-inv@test.invalid',
    ]);
    orgId = (await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng INV', 'VN') as id")).rows[0].id)) as string;
    const item = (await asActor(CUSTOMER, async (c) => (await c.query("select public.create_item('Máy INV', null, null, null, 'VND') as id")).rows[0].id)) as string;
    caseId = (await asActor(CUSTOMER, async (c) =>
      (await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [item, orgId, 'Không lên nguồn', 'case-inv-0001'])).rows[0]
        .out_case_id,
    )) as string;
    // Both accounts ask to be deleted. The request itself is the existing, tested path.
    await asActor(TARGET, (c) => c.query('select public.request_account_deletion($1::text)', ['req-inv-target-0001']));
    await asActor(PARTNER, (c) => c.query('select public.request_account_deletion($1::text)', ['req-inv-partner-0001']));
  });

  it('D-02 the organization cannot invite an account that asked to be deleted, and no membership row appears', async () => {
    await expect(asActor(OWNER, (c) => c.query('select public.invite_member($1::uuid, $2::uuid, $3::text)', [orgId, TARGET, 'agent']))).rejects.toMatchObject({
      code: '42501',
      message: 'account deletion requested',
    });
    expect(await count('select count(*)::int as n from public.organization_members where org_id = $1 and user_id = $2', [orgId, TARGET])).toBe(0);
  });

  it('D-02 a case owner cannot invite a partner that asked to be deleted, and no participant row appears', async () => {
    const expires = new Date(Date.now() + 86_400_000).toISOString();
    await expect(
      asActor(CUSTOMER, (c) => c.query('select public.invite_case_participant($1::uuid, $2::uuid, $3::timestamptz)', [caseId, PARTNER, expires])),
    ).rejects.toMatchObject({ code: '42501', message: 'account deletion requested' });
    expect(await count('select count(*)::int as n from public.case_participants where case_id = $1 and actor_id = $2', [caseId, PARTNER])).toBe(0);
  });

  it('D-02 an account in good standing is still invited normally, to both the organization and the case', async () => {
    const memberId = (await asActor(OWNER, async (c) =>
      (await c.query('select public.invite_member($1::uuid, $2::uuid, $3::text) as id', [orgId, HEALTHY, 'agent'])).rows[0].id,
    )) as string;
    expect(memberId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await count("select count(*)::int as n from public.organization_members where id = $1 and status = 'ACTIVE'", [memberId])).toBe(1);
    const expires = new Date(Date.now() + 86_400_000).toISOString();
    const partId = (await asActor(CUSTOMER, async (c) =>
      (await c.query('select public.invite_case_participant($1::uuid, $2::uuid, $3::timestamptz) as id', [caseId, HEALTHY, expires])).rows[0].id,
    )) as string;
    expect(partId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('D-02 a revoked member that never asked for deletion can be invited again', async () => {
    await asActor(OWNER, (c) => c.query('select public.revoke_member($1::uuid, $2::uuid)', [orgId, HEALTHY]));
    expect(await count("select count(*)::int as n from public.organization_members where org_id = $1 and user_id = $2 and status = 'REVOKED'", [orgId, HEALTHY])).toBe(1);
    await asActor(OWNER, (c) => c.query('select public.invite_member($1::uuid, $2::uuid, $3::text)', [orgId, HEALTHY, 'manager']));
    expect(
      await count("select count(*)::int as n from public.organization_members where org_id = $1 and user_id = $2 and status = 'ACTIVE' and role = 'manager'", [orgId, HEALTHY]),
    ).toBe(1);
  });
});
