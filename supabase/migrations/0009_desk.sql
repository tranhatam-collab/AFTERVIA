-- WO08-03: inbox và phân công của Desk. Phạm vi là tổ chức; chỉ owner và manager phân công; mọi thay đổi có audit.
-- Từ chối vì quyền (agent phân công) không ném lỗi: server ghi audit rồi trả về out_refused = 'forbidden'.
-- Không phải thành viên của tổ chức: P0002, không tiết lộ case tồn tại hay không.
-- Hạn chế: chưa có lọc theo "chưa phân công", chưa có phân trang theo con trỏ, chưa có trạng thái lời mời.

alter table public.cases add column assigned_to uuid null references public.profiles (id);
create index cases_org_assignee_idx on public.cases (org_id, assigned_to);
grant select (assigned_to) on public.cases to authenticated;

alter table public.case_events drop constraint case_events_type_check;
alter table public.case_events add constraint case_events_type_check
  check (type in ('created', 'transition', 'reopen', 'assigned'));

-- Hộp thư Desk: mọi case của tổ chức mà người gọi là thành viên đang hoạt động.
create function public.desk_inbox(
  p_org uuid,
  p_status text default null,
  p_assigned_to uuid default null,
  p_limit integer default 50
)
returns table (
  out_case_id uuid,
  out_status text,
  out_outcome text,
  out_assigned_to uuid,
  out_version integer,
  out_item_id uuid,
  out_updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.is_org_member(p_org) then
    raise exception 'organization not found' using errcode = 'P0002';
  end if;
  if p_status is not null and p_status not in (
    'draft', 'submitted', 'triaged', 'waiting_customer', 'waiting_merchant', 'waiting_partner',
    'in_progress', 'resolved', 'closed', 'withdrawn') then
    raise exception 'unknown state' using errcode = '22023';
  end if;

  return query
    select c.id, c.status, c.outcome, c.assigned_to, c.version, c.item_id, c.updated_at
      from public.cases c
     where c.org_id = p_org
       and (p_status is null or c.status = p_status)
       and (p_assigned_to is null or c.assigned_to = p_assigned_to)
     order by c.updated_at desc, c.id
     limit v_limit;
end;
$$;

-- Phân công (hoặc bỏ phân công khi p_assignee là null). Phiên bản tăng một; sự kiện 'assigned' được ghi.
create function public.assign_case(
  p_case_id uuid,
  p_assignee uuid,
  p_expected_version integer,
  p_reason text,
  p_request_id text
)
returns table (out_version integer, out_assigned_to uuid, out_replayed boolean, out_refused text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
  v_event public.case_events%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_seq integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;

  select * into v_case from public.cases where id = p_case_id;
  if not found or not public.is_org_member(v_case.org_id) then
    raise exception 'case not found' using errcode = 'P0002';
  end if;

  select * into v_case from public.cases where id = p_case_id for update;

  -- Gửi lại cùng yêu cầu: trả về trạng thái hiện tại, không ghi thêm.
  select * into v_event from public.case_events where case_id = p_case_id and request_id = p_request_id;
  if found then
    if v_event.type <> 'assigned' then
      raise exception 'request id already used for another change' using errcode = '23505';
    end if;
    return query select v_case.version, v_case.assigned_to, true, null::text;
    return;
  end if;

  -- Chỉ owner và manager phân công. Agent bị từ chối; lần từ chối được ghi audit.
  if not public.is_org_member(v_case.org_id, array['owner', 'manager']) then
    perform public.write_audit(v_case.org_id, 'case.assign.denied', 'case', p_case_id::text,
      jsonb_build_object('requested_assignee', p_assignee, 'version', v_case.version));
    return query select v_case.version, v_case.assigned_to, false, 'forbidden'::text;
    return;
  end if;

  if p_expected_version is null or p_expected_version <> v_case.version then
    raise exception 'version conflict' using errcode = '40001';
  end if;
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'reason is required' using errcode = '22023';
  end if;
  if p_assignee is not null and not exists (
    select 1 from public.organization_members m
     where m.org_id = v_case.org_id and m.user_id = p_assignee and m.status = 'ACTIVE'
  ) then
    raise exception 'assignee not found in organization' using errcode = 'P0002';
  end if;

  select coalesce(max(sequence), 0) + 1 into v_seq from public.case_events where case_id = p_case_id;

  update public.cases
     set assigned_to = p_assignee,
         version = v_case.version + 1,
         updated_at = now()
   where id = p_case_id;

  insert into public.case_events (case_id, sequence, version, actor_user_id, actor_role, type, from_state, to_state, reason, outcome_after, request_id)
  values (p_case_id, v_seq, v_case.version + 1, v_uid, 'merchant', 'assigned',
          v_case.status, v_case.status, v_reason, v_case.outcome, p_request_id);

  perform public.write_audit(v_case.org_id, 'case.assign', 'case', p_case_id::text,
    jsonb_build_object('assignee', p_assignee, 'version', v_case.version + 1));
  return query select v_case.version + 1, p_assignee, false, null::text;
end;
$$;

revoke all on function public.desk_inbox(uuid, text, uuid, integer) from public;
grant execute on function public.desk_inbox(uuid, text, uuid, integer) to authenticated;
revoke all on function public.assign_case(uuid, uuid, integer, text, text) from public;
grant execute on function public.assign_case(uuid, uuid, integer, text, text) to authenticated;
