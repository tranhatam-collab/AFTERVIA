-- WO07-03: nhắc việc chỉ từ ngày đã xác nhận, có nguồn, múi giờ IANA hợp lệ và thời điểm nằm trong đúng ngày đó.
-- Push bị từ chối hoặc không khả dụng: trạng thái là INBOX_ONLY, không bao giờ là trạng thái đã gửi.
-- Hộp thư trong app luôn có bản sao, kể cả khi push được nhà cung cấp nhận.
-- Chỉ dịch vụ (service_role) ghi kết quả gửi. Người dùng chỉ đọc nhắc việc và hộp thư của chính mình.
-- Hạn chế: chưa có bộ gửi push thật (cần thiết bị và nhà cung cấp, DEV-01); chưa có xóa tài khoản (khóa ngoại lịch sử không cascade).

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  confirmed_date date not null,
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now(),
  source text not null check (source in ('user_confirmed')),
  timezone text not null check (length(timezone) between 1 and 64),
  local_time time not null,
  remind_at timestamptz not null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'PUSH_ACCEPTED', 'INBOX_ONLY')),
  created_at timestamptz not null default now()
);

create index reminders_owner_due_idx on public.reminders (owner_user_id, remind_at);

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders (id),
  channel text not null check (channel in ('push')),
  outcome text not null check (outcome in ('accepted', 'refused', 'unavailable')),
  created_at timestamptz not null default now()
);

create table public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id),
  reminder_id uuid not null references public.reminders (id),
  message_key text not null check (message_key in ('reminder_due')),
  created_at timestamptz not null default now()
);

-- Lịch sử gửi và hộp thư chỉ được thêm. Không ai, kể cả chủ bảng, được sửa, xóa hay xóa toàn bộ.
create function public.forbid_append_only_mutation() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = '42501';
end;
$$;

create trigger reminder_deliveries_append_only
  before update or delete on public.reminder_deliveries
  for each row execute function public.forbid_append_only_mutation();
create trigger reminder_deliveries_no_truncate
  before truncate on public.reminder_deliveries
  for each statement execute function public.forbid_append_only_mutation();
create trigger inbox_messages_append_only
  before update or delete on public.inbox_messages
  for each row execute function public.forbid_append_only_mutation();
create trigger inbox_messages_no_truncate
  before truncate on public.inbox_messages
  for each statement execute function public.forbid_append_only_mutation();

revoke all on function public.forbid_append_only_mutation() from public;

alter table public.reminders enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.reminder_deliveries enable row level security;

create policy reminders_select_owner on public.reminders
  for select to authenticated
  using (owner_user_id = auth.uid());

create policy inbox_messages_select_owner on public.inbox_messages
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on table public.reminders, public.reminder_deliveries, public.inbox_messages from public, anon, authenticated;
grant select (id, owner_user_id, item_id, confirmed_date, confirmed_by, confirmed_at, source, timezone, local_time, remind_at, status, created_at)
  on public.reminders to authenticated;
grant select (id, owner_user_id, reminder_id, message_key, created_at)
  on public.inbox_messages to authenticated;

create function public.create_reminder(
  p_item_id uuid,
  p_confirmed_date date,
  p_source text,
  p_timezone text,
  p_local_time time,
  p_remind_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select owner_user_id into v_owner from public.items where id = p_item_id;
  if not found or v_owner <> v_uid then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if p_confirmed_date is null then
    raise exception 'reminder needs a confirmed date' using errcode = '22023';
  end if;
  if p_source is null or p_source <> 'user_confirmed' then
    raise exception 'reminder needs a known source' using errcode = '22023';
  end if;
  if p_timezone is null or not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'reminder needs a known IANA time zone' using errcode = '22023';
  end if;
  if p_local_time is null or p_remind_at is null then
    raise exception 'reminder needs a time' using errcode = '22023';
  end if;
  -- Thời điểm nhắc phải nằm trong đúng ngày đã xác nhận, theo chính múi giờ đó (date-only không đổi lệch).
  if (p_remind_at at time zone p_timezone)::date <> p_confirmed_date then
    raise exception 'reminder time is not on the confirmed date' using errcode = '22023';
  end if;

  insert into public.reminders (owner_user_id, item_id, confirmed_date, confirmed_by, source, timezone, local_time, remind_at)
  values (v_uid, p_item_id, p_confirmed_date, v_uid, p_source, p_timezone, p_local_time, p_remind_at)
  returning id into v_new;

  perform public.write_audit(null, 'reminder.create', 'reminder', v_new::text,
    jsonb_build_object('item', p_item_id));
  return v_new;
end;
$$;

revoke all on function public.create_reminder(uuid, date, text, text, time, timestamptz) from public;
grant execute on function public.create_reminder(uuid, date, text, text, time, timestamptz) to authenticated;

-- Dịch vụ gửi ghi kết quả. Từ chối hoặc không khả dụng: INBOX_ONLY. Được nhận: PUSH_ACCEPTED. Hộp thư luôn có bản sao.
create function public.record_reminder_delivery(p_reminder_id uuid, p_outcome text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_status text;
  v_next text;
begin
  if p_outcome is null or p_outcome not in ('accepted', 'refused', 'unavailable') then
    raise exception 'invalid push outcome' using errcode = '22023';
  end if;
  select owner_user_id, status into v_owner, v_status
    from public.reminders where id = p_reminder_id for update;
  if not found then
    raise exception 'reminder not found' using errcode = 'P0002';
  end if;
  if v_status <> 'SCHEDULED' then
    raise exception 'reminder already delivered' using errcode = '55000';
  end if;

  v_next := case when p_outcome = 'accepted' then 'PUSH_ACCEPTED' else 'INBOX_ONLY' end;

  insert into public.reminder_deliveries (reminder_id, channel, outcome)
  values (p_reminder_id, 'push', p_outcome);
  insert into public.inbox_messages (owner_user_id, reminder_id, message_key)
  values (v_owner, p_reminder_id, 'reminder_due');
  update public.reminders set status = v_next where id = p_reminder_id;

  perform public.write_audit(null, 'reminder.deliver', 'reminder', p_reminder_id::text,
    jsonb_build_object('outcome', p_outcome, 'status', v_next));
  return v_next;
end;
$$;

revoke all on function public.record_reminder_delivery(uuid, text) from public;
grant execute on function public.record_reminder_delivery(uuid, text) to service_role;
