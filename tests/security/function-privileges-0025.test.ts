import { beforeAll, describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';

// Follow-up to the audit of 06e9cc0 (migration 0025). record_reminder_delivery is server-only, and the listed trigger
// functions need no client EXECUTE. The local test database has no Supabase default privileges, so these checks verify
// the explicit state that the migration produces, not a deployed Supabase project.
const CLIENT_ROLES = ['anon', 'authenticated', 'public'] as const;
const SERVER_ONLY = 'public.record_reminder_delivery(uuid, text)';
const TRIGGER_FUNCTIONS = [
  'public.case_events_reason_out()',
  'public.enforce_sharing_kill_switch()',
  'public.export_bodies_expiry_guard()',
  'public.field_confirmation_values_consistent()',
  'public.forbid_append_only_mutation()',
  'public.forbid_audit_mutation()',
  'public.forbid_field_confirmation_mutation()',
  'public.handle_new_auth_user()',
  'public.refuse_writes_while_pending_deletion()',
] as const;

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows as T[];
  } finally {
    await admin.end();
  }
}

async function executable(role: string, signature: string): Promise<boolean> {
  const [row] = await query<{ ok: boolean }>("select has_function_privilege($1, $2, 'EXECUTE') as ok", [role, signature]);
  return row?.ok === true;
}

describe('migration 0025: server-only reminder delivery and trigger functions (explicit privileges on the local test database)', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it('record_reminder_delivery: no client role has EXECUTE, and service_role does', async () => {
    for (const role of CLIENT_ROLES) {
      expect(await executable(role, SERVER_ONLY), `${role} must not execute ${SERVER_ONLY}`).toBe(false);
    }
    expect(await executable('service_role', SERVER_ONLY)).toBe(true);
  });

  it.each(TRIGGER_FUNCTIONS)('%s returns trigger, and no client role has EXECUTE on it', async (signature) => {
    const [row] = await query<{ result: string }>('select pg_get_function_result($1::regprocedure) as result', [signature]);
    expect(row?.result).toBe('trigger');
    for (const role of CLIENT_ROLES) {
      expect(await executable(role, signature), `${role} must not execute ${signature}`).toBe(false);
    }
  });
});
