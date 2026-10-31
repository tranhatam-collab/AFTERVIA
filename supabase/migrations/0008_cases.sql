-- WO08-02: case và sự kiện chỉ thêm, kiểm phiên bản (409) và quy tắc chuyển trạng thái trong cơ sở dữ liệu.
-- Bảng quy tắc phải khớp allowlist của packages/domain/src/case-state.ts (được kiểm bằng test).
-- Khách tạo case cho món đồ của mình. Thành viên tổ chức (owner, manager, agent) của cửa hàng xử lý case.
-- Mọi chuyển trạng thái đi qua transition_case: khóa dòng, kiểm phiên bản, ghi trạng thái và sự kiện trong cùng giao dịch.
-- Hạn chế: chưa có gán nhân viên (assigned_to), chưa chia sẻ tài liệu theo case (case_document_grants), chưa có ghi không đồng ý.

create table public.case_transition_rules (
  from_state text not null,
  to_state text not null,
  actor_role text not null check (actor_role in ('customer', 'merchant')),
  reopen boolean not null default false,
  primary key (from_state, to_state)
);

insert into public.case_transition_rules (from_state, to_state, actor_role, reopen) values
  ('draft', 'submitted', 'customer', false),
  ('draft', 'withdrawn', 'customer', false),
  ('submitted', 'triaged', 'merchant', false),
  ('submitted', 'withdrawn', 'customer', false),
  ('triaged', 'waiting_customer', 'merchant', false),
  ('triaged', 'waiting_partner', 'merchant', false),
  ('triaged', 'in_progress', 'merchant', false),
  ('triaged', 'withdrawn', 'customer', false),
  ('waiting_customer', 'waiting_merchant', 'customer', false),
  ('waiting_customer', 'withdrawn', 'customer', false),
  ('waiting_merchant', 'in_progress', 'merchant', false),
  ('waiting_merchant', 'withdrawn', 'customer', false),
  ('waiting_partner', 'in_progress', 'merchant', false),
  ('waiting_partner', 'withdrawn', 'customer', false),
  ('in_progress', 'waiting_customer', 'merchant', false),
  ('in_progress', 'waiting_partner', 'merchant', false),
  ('in_progress', 'resolved', 'merchant', false),
  ('in_progress', 'withdrawn', 'customer', false),
  ('resolved', 'closed', 'merchant', false),
  ('resolved', 'triaged', 'customer', true);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  item_id uuid not null references public.items (id),
  created_by uuid not null references public.profiles (id),
  create_request_id text not null check (char_length(create_request_id) between 8 and 128),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'triaged', 'waiting_customer', 'waiting_merchant', 'waiting_partner',
    'in_progress', 'resolved', 'closed', 'withdrawn')),
  outcome text null check (outcome is null or outcome in ('repaired', 'replaced', 'refunded', 'credited', 'no_remedy')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, create_request_id)
);

create index cases_org_status_idx on public.cases (org_id, status);

create table public.case_evidence (
  case_id uuid not null references public.cases (id),
  document_id uuid not null references public.documents (id),
  attached_by uuid not null references public.profiles (id),
  attached_at timestamptz not null default now(),
  primary key (case_id, document_id)
);

create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  sequence integer not null check (sequence >= 1),
  version integer not null check (version >= 1),
  actor_user_id uuid not null references public.profiles (id),
  actor_role text not null check (actor_role in ('customer', 'merchant')),
  type text not null check (type in ('created', 'transition', 'reopen')),
  from_state text null,
  to_state text not null check (to_state in (
    'draft', 'submitted', 'triaged', 'waiting_customer', 'waiting_merchant', 'waiting_partner',
    'in_progress', 'resolved', 'closed', 'withdrawn')),
  reason text not null check (char_length(reason) between 1 and 500),
  outcome_after text null check (outcome_after is null or outcome_after in ('repaired', 'replaced', 'refunded', 'credited', 'no_remedy')),
  request_id text not null check (char_length(request_id) between 8 and 128),
  created_at timestamptz not null default now(),
  unique (case_id, sequence),
  unique (case_id, request_id)
);

-- Sự kiện và bằng chứng chỉ được thêm. Không ai, kể cả chủ bảng, được sửa, xóa hay xóa toàn bộ.
create trigger case_events_append_only
  before update or delete on public.case_events
  for each row execute function public.forbid_append_only_mutation();
create trigger case_events_no_truncate
  before truncate on public.case_events
  for each statement execute function public.forbid_append_only_mutation();
create trigger case_evidence_append_only
  before update or delete on public.case_evidence
  for each row execute function public.forbid_append_only_mutation();
create trigger case_evidence_no_truncate
  before truncate on public.case_evidence
  for each statement execute function public.forbid_append_only_mutation();

alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.case_evidence enable row level security;

-- Chỉ khách tạo case và thành viên tổ chức của cửa hàng được thấy case. Tổ chức khác không thấy gì.
create policy cases_select_visible on public.cases
  for select to authenticated
  using (created_by = auth.uid() or public.is_org_member(org_id));

create policy case_events_select_visible on public.case_events
  for select to authenticated
  using (exists (
    select 1 from public.cases c
    where c.id = case_events.case_id and (c.created_by = auth.uid() or public.is_org_member(c.org_id))
  ));

create policy case_evidence_select_visible on public.case_evidence
  for select to authenticated
  using (exists (
    select 1 from public.cases c
    where c.id = case_evidence.case_id and (c.created_by = auth.uid() or public.is_org_member(c.org_id))
  ));

revoke all on table public.case_transition_rules, public.cases, public.case_events, public.case_evidence
  from public, anon, authenticated;
grant select (id, org_id, item_id, created_by, status, outcome, version, created_at, updated_at)
  on public.cases to authenticated;
grant select (id, case_id, sequence, version, actor_user_id, actor_role, type, from_state, to_state, reason, outcome_after, request_id, created_at)
  on public.case_events to authenticated;
grant select (case_id, document_id, attached_by, attached_at)
  on public.case_evidence to authenticated;

create function public.create_case(p_item_id uuid, p_org_id uuid, p_reason text, p_request_id text)
returns table (out_case_id uuid, out_replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_existing public.cases%rowtype;
  v_new uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'reason is required' using errcode = '22023';
  end if;

  -- Gửi lại cùng yêu cầu của cùng khách: trả về case cũ, không tạo thêm.
  select * into v_existing from public.cases where created_by = v_uid and create_request_id = p_request_id;
  if found then
    if v_existing.item_id <> p_item_id or v_existing.org_id <> p_org_id then
      raise exception 'request id already used for another case' using errcode = '23505';
    end if;
    return query select v_existing.id, true;
    return;
  end if;

  select owner_user_id into v_owner from public.items where id = p_item_id;
  if not found or v_owner <> v_uid then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.organizations where id = p_org_id and status = 'ACTIVE') then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;

  insert into public.cases (org_id, item_id, created_by, create_request_id, status, version)
  values (p_org_id, p_item_id, v_uid, p_request_id, 'draft', 1)
  returning id into v_new;

  insert into public.case_events (case_id, sequence, version, actor_user_id, actor_role, type, from_state, to_state, reason, request_id)
  values (v_new, 1, 1, v_uid, 'customer', 'created', null, 'draft', v_reason, p_request_id);

  perform public.write_audit(p_org_id, 'case.create', 'case', v_new::text, jsonb_build_object('item', p_item_id));
  return query select v_new, false;
end;
$$;

-- Bằng chứng: chỉ khách sở hữu case đính kèm, và chỉ tài liệu của chính khách đã tải lên xong.
create function public.attach_case_evidence(p_case_id uuid, p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_doc_owner uuid;
  v_doc_status text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case_id;
  if not found or v_case.created_by <> v_uid then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  select * into v_case from public.cases where id = p_case_id for update;
  if v_case.status in ('resolved', 'closed', 'withdrawn') then
    raise exception 'case is not open' using errcode = '55000';
  end if;

  select owner_user_id, scan_status into v_doc_owner, v_doc_status from public.documents where id = p_document_id;
  if not found or v_doc_owner <> v_uid then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
  if v_doc_status not in ('SCANNER_UNAVAILABLE', 'CLEAN') then
    raise exception 'document is not usable as evidence' using errcode = '55000';
  end if;
  if not exists (select 1 from public.upload_completions where document_id = p_document_id) then
    raise exception 'document upload is not complete' using errcode = '55000';
  end if;

  insert into public.case_evidence (case_id, document_id, attached_by)
  values (p_case_id, p_document_id, v_uid)
  on conflict (case_id, document_id) do nothing;

  perform public.write_audit(v_case.org_id, 'case.evidence', 'case', p_case_id::text,
    jsonb_build_object('document', p_document_id));
end;
$$;

-- Chuyển trạng thái: khóa case, kiểm phiên bản (40001 nếu lệch), kiểm allowlist và vai trò, kiểm outcome và bằng chứng.
-- Cùng request_id và cùng đích thì trả về kết quả cũ, không ghi thêm.
create function public.transition_case(
  p_case_id uuid,
  p_to text,
  p_expected_version integer,
  p_reason text,
  p_request_id text,
  p_outcome text default null
)
returns table (out_version integer, out_status text, out_outcome text, out_replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_role text;
  v_rule public.case_transition_rules%rowtype;
  v_event public.case_events%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_outcome text;
  v_evidence integer;
  v_seq integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;
  if p_to is null or p_to not in (
    'draft', 'submitted', 'triaged', 'waiting_customer', 'waiting_merchant', 'waiting_partner',
    'in_progress', 'resolved', 'closed', 'withdrawn') then
    raise exception 'unknown state' using errcode = '22023';
  end if;

  select * into v_case from public.cases where id = p_case_id;
  if not found then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if v_case.created_by = v_uid then
    v_role := 'customer';
  elsif public.is_org_member(v_case.org_id, array['owner', 'manager', 'agent']) then
    v_role := 'merchant';
  else
    raise exception 'case not found' using errcode = 'P0002';
  end if;

  select * into v_case from public.cases where id = p_case_id for update;

  select * into v_event from public.case_events where case_id = p_case_id and request_id = p_request_id;
  if found then
    if v_event.to_state <> p_to or v_event.actor_role <> v_role then
      raise exception 'request id already used for another transition' using errcode = '23505';
    end if;
    return query select v_case.version, v_case.status, v_case.outcome, true;
    return;
  end if;

  if p_expected_version is null or p_expected_version <> v_case.version then
    raise exception 'version conflict' using errcode = '40001';
  end if;
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'reason is required' using errcode = '22023';
  end if;

  select * into v_rule from public.case_transition_rules
    where from_state = v_case.status and to_state = p_to;
  if not found then
    raise exception 'transition not allowed from %', v_case.status using errcode = '55000';
  end if;
  if v_rule.actor_role <> v_role then
    raise exception 'not allowed for this actor' using errcode = '42501';
  end if;

  v_outcome := v_case.outcome;
  select count(*)::integer into v_evidence from public.case_evidence where case_id = p_case_id;
  if p_to = 'resolved' then
    if p_outcome is null then
      raise exception 'outcome is required' using errcode = '22023';
    end if;
    if p_outcome not in ('repaired', 'replaced', 'refunded', 'credited', 'no_remedy') then
      raise exception 'unknown outcome' using errcode = '22023';
    end if;
    if v_evidence = 0 then
      raise exception 'evidence is required' using errcode = '22023';
    end if;
    v_outcome := p_outcome;
  end if;
  if p_to = 'closed' then
    if v_outcome is null then
      raise exception 'outcome is required' using errcode = '22023';
    end if;
    if v_evidence = 0 then
      raise exception 'evidence is required' using errcode = '22023';
    end if;
  end if;

  select coalesce(max(sequence), 0) + 1 into v_seq from public.case_events where case_id = p_case_id;

  update public.cases
     set status = p_to,
         outcome = v_outcome,
         version = v_case.version + 1,
         updated_at = now()
   where id = p_case_id;

  insert into public.case_events (case_id, sequence, version, actor_user_id, actor_role, type, from_state, to_state, reason, outcome_after, request_id)
  values (p_case_id, v_seq, v_case.version + 1, v_uid, v_role,
          case when v_rule.reopen then 'reopen' else 'transition' end,
          v_case.status, p_to, v_reason, v_outcome, p_request_id);

  perform public.write_audit(v_case.org_id, 'case.transition', 'case', p_case_id::text,
    jsonb_build_object('from', v_case.status, 'to', p_to, 'version', v_case.version + 1));
  return query select v_case.version + 1, p_to, v_outcome, false;
end;
$$;

revoke all on function public.create_case(uuid, uuid, text, text) from public;
grant execute on function public.create_case(uuid, uuid, text, text) to authenticated;
revoke all on function public.attach_case_evidence(uuid, uuid) from public;
grant execute on function public.attach_case_evidence(uuid, uuid) to authenticated;
revoke all on function public.transition_case(uuid, text, integer, text, text, text) from public;
grant execute on function public.transition_case(uuid, text, integer, text, text, text) to authenticated;
