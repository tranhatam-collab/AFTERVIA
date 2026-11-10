import { beforeAll, describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';

// OWN-A-03 (audit 10/11, D-01). The shim now grants EXECUTE to anon and authenticated on every new public
// function, exactly as a Supabase project does. This test enumerates the whole schema and locks the surface:
// anon may execute nothing, and authenticated may execute only the reviewed client surface below. A function
// added later arrives with the Supabase default grant, so it fails this test until it is either revoked in a
// migration or added to the allowlist on purpose.
//
// The client surface is what the app calls as the signed-in role: services/api/src/db/session.ts sets
// `set local role authenticated`, so these functions must stay reachable. is_org_member is also evaluated
// inside RLS policies, where the querying role needs EXECUTE.
const AUTHENTICATED_SURFACE = [
  'accept_family_invitation',
  'approve_break_glass',
  'assign_case',
  'attach_case_evidence',
  'case_outcome_kpis',
  'change_member_role',
  'check_document_access',
  'complete_upload',
  'create_case',
  'create_item',
  'create_item_keyed',
  'create_organization',
  'create_reminder',
  'create_upload_ticket',
  'desk_inbox',
  'export_granted_documents',
  'family_shared_items',
  'fetch_export_file',
  'grant_case_document',
  'grant_case_document_keyed',
  'invite_case_participant',
  'invite_family_member',
  'invite_member',
  'is_org_member',
  'read_case_document',
  'read_case_for_break_glass',
  'record_upload_inspection',
  'request_account_deletion',
  'request_break_glass',
  'revoke_case_document_grant',
  'revoke_case_participant',
  'revoke_family_membership',
  'revoke_item_share',
  'revoke_member',
  'share_item_with_family',
  'store_export',
  'transition_case',
  'update_item',
  'update_organization_legal_name',
] as const;

async function reachableBy(role: string): Promise<string[]> {
  const admin = await connect();
  try {
    const { rows } = await admin.query(
      `select distinct p.proname as name
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.prorettype <> 'trigger'::regtype
          and has_function_privilege($1, p.oid, 'EXECUTE')
        order by 1`,
      [role],
    );
    return rows.map((r) => r.name as string);
  } finally {
    await admin.end();
  }
}

describe('OWN-A-03 function privilege surface under Supabase default privileges', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it('anon can execute no function in the public schema', async () => {
    expect(await reachableBy('anon')).toEqual([]);
  });

  it('authenticated can execute exactly the reviewed client surface, and nothing else', async () => {
    expect(await reachableBy('authenticated')).toEqual([...AUTHENTICATED_SURFACE].sort());
  });

  it('a function added without an explicit revoke arrives client-callable, which is why this test is the control', async () => {
    // Measured on PostgreSQL 16: ALTER DEFAULT PRIVILEGES cannot suppress the built-in EXECUTE grant that
    // Postgres gives PUBLIC on a new function, so there is no way to declare "new functions are server-only".
    // The tripwire is this file: a function added by a later migration shows up in the enumeration above and
    // fails it until a migration revokes it or it is added to the reviewed surface on purpose.
    const admin = await connect();
    try {
      await admin.query('begin');
      await admin.query('create function public.own_a_03_probe() returns integer language sql as $$ select 1 $$');
      const { rows } = await admin.query(
        `select has_function_privilege('anon', 'public.own_a_03_probe()', 'EXECUTE') as anon,
                has_function_privilege('authenticated', 'public.own_a_03_probe()', 'EXECUTE') as auth`,
      );
      expect(rows[0]).toEqual({ anon: true, auth: true });
    } finally {
      await admin.query('rollback');
      await admin.end();
    }
  });
});
