-- Follow-up to the audit of 06e9cc0 (migration 0024 covered the four server-only functions).
--
-- 1. record_reminder_delivery (0007) is server-only. It revoked EXECUTE from PUBLIC only, so on Supabase anon and
--    authenticated could still reach it through the default grants. Only service_role may call it. No server code
--    calls it yet; its tests use an admin connection and expect 42501 for a signed-in user.
-- 2. Trigger functions never need client EXECUTE. PostgreSQL fires a trigger without an EXECUTE check (the check is at
--    CREATE TRIGGER time), and PostgREST cannot call a trigger function as RPC. Revoking is hardening with no change in
--    behaviour. The test checks that each function returns trigger, so this list cannot take in an ordinary function.
--
-- Not changed here: kill_switch_enabled. Policies and other functions may read it as the client role, so its callers
-- must be checked before EXECUTE is revoked.

revoke all on function public.record_reminder_delivery(uuid, text) from public, anon, authenticated;
grant execute on function public.record_reminder_delivery(uuid, text) to service_role;

revoke all on function public.case_events_reason_out() from public, anon, authenticated;
revoke all on function public.enforce_sharing_kill_switch() from public, anon, authenticated;
revoke all on function public.export_bodies_expiry_guard() from public, anon, authenticated;
revoke all on function public.field_confirmation_values_consistent() from public, anon, authenticated;
revoke all on function public.forbid_append_only_mutation() from public, anon, authenticated;
revoke all on function public.forbid_audit_mutation() from public, anon, authenticated;
revoke all on function public.forbid_field_confirmation_mutation() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.refuse_writes_while_pending_deletion() from public, anon, authenticated;
