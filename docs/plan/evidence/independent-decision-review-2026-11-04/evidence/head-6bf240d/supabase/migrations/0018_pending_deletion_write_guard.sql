-- WO11-02b (T25): tài khoản đang PENDING_DELETION không tạo hay đổi dữ liệu của chính mình.
-- Dùng trigger, không sửa hàm đã áp dụng. Chỉ chặn khi có phiên người dùng (auth.uid() khác null) và hồ sơ đang PENDING_DELETION.
-- Vẫn cho phép: thu hồi (revoked_at, revoked_by; status = REVOKED khi bảng có cột status). Không chặn: yêu cầu và tombstone xóa,
-- nhật ký kiểm toán, hồ sơ người dùng, xuất dữ liệu, và mọi ghi không có phiên (job hệ thống, khôi phục).
-- Chưa quyết định: chính sách xuất dữ liệu trong lúc chờ xóa, danh mục xóa và giữ lại (WO11-02d, HUMAN).

create function public.refuse_writes_while_pending_deletion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_new jsonb;
  v_old jsonb;
begin
  if v_uid is null then
    return new;
  end if;
  select deletion_status into v_status from public.profiles where id = v_uid;
  if v_status is distinct from 'PENDING_DELETION' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'account pending deletion' using errcode = '55000';
  end if;
  v_new := to_jsonb(new) - 'revoked_at' - 'revoked_by';
  v_old := to_jsonb(old) - 'revoked_at' - 'revoked_by';
  if v_new->>'status' = 'REVOKED' then
    v_new := v_new - 'status';
    v_old := v_old - 'status';
  end if;
  if v_new = v_old then
    return new;
  end if;
  raise exception 'account pending deletion' using errcode = '55000';
end;
$$;

revoke all on function public.refuse_writes_while_pending_deletion() from public;

create trigger items_refuse_pending_deletion before insert or update on public.items
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger documents_refuse_pending_deletion before insert or update on public.documents
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger reminders_refuse_pending_deletion before insert or update on public.reminders
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger field_confirmations_refuse_pending_deletion before insert on public.field_confirmations
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger cases_refuse_pending_deletion before insert or update on public.cases
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger case_events_refuse_pending_deletion before insert on public.case_events
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger case_evidence_refuse_pending_deletion before insert on public.case_evidence
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger case_participants_refuse_pending_deletion before insert or update on public.case_participants
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger case_document_grants_refuse_pending_deletion before insert or update on public.case_document_grants
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger item_family_shares_refuse_pending_deletion before insert or update on public.item_family_shares
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger family_memberships_refuse_pending_deletion before insert or update on public.family_memberships
  for each row execute function public.refuse_writes_while_pending_deletion();
create trigger organization_members_refuse_pending_deletion before insert or update on public.organization_members
  for each row execute function public.refuse_writes_while_pending_deletion();
