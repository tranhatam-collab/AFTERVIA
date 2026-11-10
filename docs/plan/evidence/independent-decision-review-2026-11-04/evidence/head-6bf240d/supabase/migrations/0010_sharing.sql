-- WO09-01: người tham gia case (partner) và grant tài liệu cụ thể. Mọi thay đổi đi qua hàm của server, có audit.
-- Không có ký tự đại diện: mỗi grant gắn một tài liệu, một người nhận, một thời hạn không quá 30 ngày.
-- Tài liệu phải là bằng chứng của đúng case đó. Người tham gia chỉ thấy case được mời, khi còn hiệu lực.
-- Thu hồi có hiệu lực ở lần gọi kế tiếp. Người không phải chủ case và không tham gia nhận cùng một lý do 'not_allowed'.
-- Hạn chế: bản đã tải hợp lệ không thu hồi được (WO09-02 phải ghi rõ); proxy đọc tài liệu thuộc WO09-02; chỉ role 'partner'.

create table public.case_participants (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  actor_id uuid not null references public.profiles (id),
  role text not null check (role in ('partner')),
  scope text not null default 'case_detail' check (scope in ('case_detail')),
  invited_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles (id),
  constraint case_participants_revoke_consistent check ((revoked_at is null) = (revoked_by is null))
);

create unique index case_participants_one_active_idx
  on public.case_participants (case_id, actor_id) where revoked_at is null;

create table public.case_document_grants (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  document_id uuid not null references public.documents (id),
  recipient_id uuid not null references public.profiles (id),
  can_download boolean not null default false,
  granted_by uuid not null references public.profiles (id),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles (id),
  constraint case_document_grants_revoke_consistent check ((revoked_at is null) = (revoked_by is null))
);

create unique index case_document_grants_one_active_idx
  on public.case_document_grants (case_id, document_id, recipient_id) where revoked_at is null;
create index case_document_grants_recipient_idx on public.case_document_grants (recipient_id, case_id);

alter table public.case_participants enable row level security;
alter table public.case_document_grants enable row level security;

-- Người mời hoặc chính người tham gia thấy dòng tham gia; người cấp hoặc người nhận thấy grant.
-- Hai chính sách này không tham chiếu bảng case, nên không đệ quy với chính sách của cases.
create policy case_participants_select_involved on public.case_participants
  for select to authenticated
  using (invited_by = auth.uid() or actor_id = auth.uid());

create policy case_document_grants_select_involved on public.case_document_grants
  for select to authenticated
  using (granted_by = auth.uid() or recipient_id = auth.uid());

-- Người tham gia còn hiệu lực được thấy đúng case mình được mời và timeline của case đó.
drop policy cases_select_visible on public.cases;
create policy cases_select_visible on public.cases
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_org_member(org_id)
    or exists (
      select 1 from public.case_participants p
      where p.case_id = cases.id and p.actor_id = auth.uid()
        and p.revoked_at is null and p.expires_at > now()
    )
  );

drop policy case_events_select_visible on public.case_events;
create policy case_events_select_visible on public.case_events
  for select to authenticated
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_events.case_id and (c.created_by = auth.uid() or public.is_org_member(c.org_id))
    )
    or exists (
      select 1 from public.case_participants p
      where p.case_id = case_events.case_id and p.actor_id = auth.uid()
        and p.revoked_at is null and p.expires_at > now()
    )
  );

revoke all on table public.case_participants, public.case_document_grants from public, anon, authenticated;
grant select (id, case_id, actor_id, role, scope, invited_by, created_at, expires_at, revoked_at, revoked_by)
  on public.case_participants to authenticated;
grant select (id, case_id, document_id, recipient_id, can_download, granted_by, granted_at, expires_at, revoked_at, revoked_by)
  on public.case_document_grants to authenticated;

create function public.invite_case_participant(p_case uuid, p_actor uuid, p_expires_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case;
  if not found or v_case.created_by <> v_uid then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if v_case.status in ('closed', 'withdrawn') then
    raise exception 'case is not open' using errcode = '55000';
  end if;
  if p_actor is null or p_actor = v_uid then
    raise exception 'invalid participant' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor) then
    raise exception 'partner not found' using errcode = 'P0002';
  end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'expiry must be within 30 days' using errcode = '22023';
  end if;

  insert into public.case_participants (case_id, actor_id, role, invited_by, expires_at)
  values (p_case, p_actor, 'partner', v_uid, p_expires_at)
  returning id into v_new;

  perform public.write_audit(v_case.org_id, 'case.participant.invite', 'case', p_case::text,
    jsonb_build_object('participant', v_new, 'actor', p_actor, 'expires_at', p_expires_at));
  return v_new;
end;
$$;

-- Thu hồi người tham gia thì thu hồi luôn mọi grant của người đó trong case. Trả về số grant bị thu hồi.
create function public.revoke_case_participant(p_participant uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_part public.case_participants%rowtype;
  v_case public.cases%rowtype;
  v_grants integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_part from public.case_participants where id = p_participant for update;
  if not found then
    raise exception 'participant not found' using errcode = 'P0002';
  end if;
  select * into v_case from public.cases where id = v_part.case_id;
  if v_case.created_by <> v_uid then
    raise exception 'participant not found' using errcode = 'P0002';
  end if;
  if v_part.revoked_at is not null then
    return 0;
  end if;

  update public.case_participants set revoked_at = now(), revoked_by = v_uid where id = p_participant;
  update public.case_document_grants set revoked_at = now(), revoked_by = v_uid
   where case_id = v_part.case_id and recipient_id = v_part.actor_id and revoked_at is null;
  get diagnostics v_grants = row_count;

  perform public.write_audit(v_case.org_id, 'case.participant.revoke', 'case', v_part.case_id::text,
    jsonb_build_object('participant', p_participant, 'grants_revoked', v_grants));
  return v_grants;
end;
$$;

-- Grant một tài liệu cụ thể cho một người tham gia còn hiệu lực. Tài liệu phải là bằng chứng của đúng case.
create function public.grant_case_document(
  p_case uuid,
  p_document uuid,
  p_recipient uuid,
  p_can_download boolean,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_part public.case_participants%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case;
  if not found or v_case.created_by <> v_uid then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if v_case.status in ('closed', 'withdrawn') then
    raise exception 'case is not open' using errcode = '55000';
  end if;
  if p_can_download is null then
    raise exception 'download flag is required' using errcode = '22023';
  end if;
  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
    raise exception 'expiry must be within 30 days' using errcode = '22023';
  end if;
  if not exists (select 1 from public.case_evidence e where e.case_id = p_case and e.document_id = p_document) then
    raise exception 'document is not evidence of this case' using errcode = '22023';
  end if;
  select * into v_part from public.case_participants
   where case_id = p_case and actor_id = p_recipient and revoked_at is null
   order by created_at desc limit 1;
  if not found or v_part.expires_at <= now() then
    raise exception 'recipient is not an active participant' using errcode = '55000';
  end if;

  insert into public.case_document_grants (case_id, document_id, recipient_id, can_download, granted_by, expires_at)
  values (p_case, p_document, p_recipient, p_can_download, v_uid, p_expires_at)
  returning id into v_new;

  perform public.write_audit(v_case.org_id, 'case.grant.create', 'case', p_case::text,
    jsonb_build_object('grant', v_new, 'document', p_document, 'recipient', p_recipient,
                       'can_download', p_can_download, 'expires_at', p_expires_at));
  return v_new;
end;
$$;

create function public.revoke_case_document_grant(p_grant uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_grant public.case_document_grants%rowtype;
  v_case public.cases%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_grant from public.case_document_grants where id = p_grant for update;
  if not found then
    raise exception 'grant not found' using errcode = 'P0002';
  end if;
  select * into v_case from public.cases where id = v_grant.case_id;
  if v_case.created_by <> v_uid then
    raise exception 'grant not found' using errcode = 'P0002';
  end if;
  if v_grant.revoked_at is not null then
    return;
  end if;

  update public.case_document_grants set revoked_at = now(), revoked_by = v_uid where id = p_grant;
  perform public.write_audit(v_case.org_id, 'case.grant.revoke', 'case', v_grant.case_id::text,
    jsonb_build_object('grant', p_grant, 'document', v_grant.document_id, 'recipient', v_grant.recipient_id));
end;
$$;

-- Quyết định truy cập cho proxy đọc tài liệu (WO09-02). Người không phải chủ case và không tham gia
-- luôn nhận 'not_allowed', kể cả khi case không tồn tại, để không dò được case.
create function public.check_document_access(p_case uuid, p_document uuid)
returns table (out_allowed boolean, out_can_download boolean, out_reason text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_part public.case_participants%rowtype;
  v_grant public.case_document_grants%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into v_case from public.cases where id = p_case;
  if not found then
    return query select false, false, 'not_allowed'::text;
    return;
  end if;

  if v_case.created_by = v_uid then
    if not exists (select 1 from public.case_evidence e where e.case_id = p_case and e.document_id = p_document) then
      return query select false, false, 'document_not_in_case'::text;
      return;
    end if;
    return query select true, true, 'owner'::text;
    return;
  end if;

  select * into v_part from public.case_participants p
   where p.case_id = p_case and p.actor_id = v_uid
   order by p.created_at desc limit 1;
  if not found then
    return query select false, false, 'not_allowed'::text;
    return;
  end if;
  if v_part.revoked_at is not null then
    return query select false, false, 'participant_revoked'::text;
    return;
  end if;
  if v_part.expires_at <= now() then
    return query select false, false, 'participant_expired'::text;
    return;
  end if;

  if not exists (select 1 from public.case_evidence e where e.case_id = p_case and e.document_id = p_document) then
    return query select false, false, 'document_not_in_case'::text;
    return;
  end if;

  select * into v_grant from public.case_document_grants g
   where g.case_id = p_case and g.document_id = p_document and g.recipient_id = v_uid
   order by g.granted_at desc limit 1;
  if not found then
    return query select false, false, 'no_grant'::text;
    return;
  end if;
  if v_grant.revoked_at is not null then
    return query select false, false, 'grant_revoked'::text;
    return;
  end if;
  if v_grant.expires_at <= now() then
    return query select false, false, 'grant_expired'::text;
    return;
  end if;
  return query select true, v_grant.can_download, 'granted'::text;
end;
$$;

revoke all on function public.invite_case_participant(uuid, uuid, timestamptz) from public;
grant execute on function public.invite_case_participant(uuid, uuid, timestamptz) to authenticated;
revoke all on function public.revoke_case_participant(uuid) from public;
grant execute on function public.revoke_case_participant(uuid) to authenticated;
revoke all on function public.grant_case_document(uuid, uuid, uuid, boolean, timestamptz) from public;
grant execute on function public.grant_case_document(uuid, uuid, uuid, boolean, timestamptz) to authenticated;
revoke all on function public.revoke_case_document_grant(uuid) from public;
grant execute on function public.revoke_case_document_grant(uuid) to authenticated;
revoke all on function public.check_document_access(uuid, uuid) from public;
grant execute on function public.check_document_access(uuid, uuid) to authenticated;
