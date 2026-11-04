-- SEC-IDEM-01: khử trùng ở máy chủ theo khóa yêu cầu cho tạo món (items) và cấp grant (case_document_grants).
-- Cùng mẫu với create_case (0008): khóa lưu trên dòng; gửi lại đúng nội dung thì trả về kết quả cũ (replayed = true);
-- khác nội dung thì báo 23505. Khóa được lấy bằng advisory lock theo (người dùng, khóa) để hai yêu cầu song song
-- cùng khóa không tạo hai dòng. Hàm cũ create_item và grant_case_document được giữ nguyên, để không đổi chữ ký đang dùng.

alter table public.items
  add column create_request_id text null
    check (create_request_id is null or char_length(create_request_id) between 8 and 128);
create unique index items_owner_request_idx on public.items (owner_user_id, create_request_id);

alter table public.case_document_grants
  add column create_request_id text null
    check (create_request_id is null or char_length(create_request_id) between 8 and 128);
create unique index case_document_grants_granter_request_idx on public.case_document_grants (granted_by, create_request_id);

create function public.create_item_keyed(
  p_request_id text,
  p_title text,
  p_brand text,
  p_model text,
  p_purchased_on date,
  p_currency text
)
returns table (out_item_id uuid, out_replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := btrim(coalesce(p_title, ''));
  v_existing public.items%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':item:' || p_request_id, 0));

  select * into v_existing from public.items where owner_user_id = v_uid and create_request_id = p_request_id;
  if found then
    if v_existing.title <> v_title
       or v_existing.brand is distinct from p_brand
       or v_existing.model is distinct from p_model
       or v_existing.purchased_on is distinct from p_purchased_on
       or v_existing.currency is distinct from p_currency then
      raise exception 'request id already used for another item' using errcode = '23505';
    end if;
    return query select v_existing.id, true;
    return;
  end if;

  insert into public.items (owner_user_id, title, brand, model, purchased_on, currency, create_request_id)
  values (v_uid, v_title, p_brand, p_model, p_purchased_on, p_currency, p_request_id)
  returning id into v_new;
  perform public.write_audit(null, 'item.create', 'item', v_new::text, '{}'::jsonb);
  return query select v_new, false;
end;
$$;

create function public.grant_case_document_keyed(
  p_request_id text,
  p_case uuid,
  p_document uuid,
  p_recipient uuid,
  p_can_download boolean,
  p_expires_at timestamptz
)
returns table (out_grant_id uuid, out_replayed boolean, out_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.case_document_grants%rowtype;
  v_case public.cases%rowtype;
  v_part public.case_participants%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;
  if p_can_download is null then
    raise exception 'download flag is required' using errcode = '22023';
  end if;
  if p_expires_at is null then
    raise exception 'expiry is required' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':grant:' || p_request_id, 0));

  -- Gửi lại cùng yêu cầu: trả grant cũ kèm trạng thái hiện tại (có thể đã thu hồi; không kích hoạt lại).
  select * into v_existing from public.case_document_grants where granted_by = v_uid and create_request_id = p_request_id;
  if found then
    if v_existing.case_id <> p_case or v_existing.document_id <> p_document or v_existing.recipient_id <> p_recipient
       or v_existing.can_download <> p_can_download or v_existing.expires_at <> p_expires_at then
      raise exception 'request id already used for another grant' using errcode = '23505';
    end if;
    return query select v_existing.id, true, (case when v_existing.revoked_at is null then 'active' else 'revoked' end)::text;
    return;
  end if;

  -- Từ đây giống grant_case_document: case, thời hạn, bằng chứng, người tham gia còn hiệu lực.
  select * into v_case from public.cases where id = p_case;
  if not found or v_case.created_by <> v_uid then
    raise exception 'case not found' using errcode = 'P0002';
  end if;
  if v_case.status in ('closed', 'withdrawn') then
    raise exception 'case is not open' using errcode = '55000';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '30 days' then
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

  insert into public.case_document_grants (case_id, document_id, recipient_id, can_download, granted_by, expires_at, create_request_id)
  values (p_case, p_document, p_recipient, p_can_download, v_uid, p_expires_at, p_request_id)
  returning id into v_new;

  perform public.write_audit(v_case.org_id, 'case.grant.create', 'case', p_case::text,
    jsonb_build_object('grant', v_new, 'document', p_document, 'recipient', p_recipient,
                       'can_download', p_can_download, 'expires_at', p_expires_at));
  return query select v_new, false, 'active'::text;
end;
$$;

revoke all on function public.create_item_keyed(text, text, text, text, date, text) from public;
grant execute on function public.create_item_keyed(text, text, text, text, date, text) to authenticated;
revoke all on function public.grant_case_document_keyed(text, uuid, uuid, uuid, boolean, timestamptz) from public;
grant execute on function public.grant_case_document_keyed(text, uuid, uuid, uuid, boolean, timestamptz) to authenticated;
