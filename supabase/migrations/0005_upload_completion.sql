-- WO05-03: hoàn tất upload idempotent. Ghi sha256 đúng một lần và một bản ghi hoàn tất.
-- Tài liệu phải đã qua kiểm tra chữ ký (WO05-02) và đang ở SCANNER_UNAVAILABLE hoặc CLEAN.
-- Không có scanner đã duyệt thì tài liệu vẫn SCANNER_UNAVAILABLE: BLOCKED cho upload thật (INFRA).
-- Hàm này không đổi scan_status, không có đường nào sang CLEAN từ client.
-- Gửi lại cùng yêu cầu chỉ trả về bản ghi cũ: không ghi thêm, không audit thêm, không tạo item hay charge.

create table public.upload_completions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  document_id uuid not null unique references public.documents (id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_user_id, idempotency_key)
);

alter table public.upload_completions enable row level security;

create policy upload_completions_select_owner on public.upload_completions
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on table public.upload_completions from public, anon, authenticated;
grant select (id, owner_user_id, document_id, idempotency_key, sha256, created_at)
  on public.upload_completions to authenticated;

create function public.complete_upload(
  p_document_id uuid,
  p_idempotency_key text,
  p_sha256 text,
  p_actual_size bigint
)
returns table (out_completion_id uuid, out_replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_declared bigint;
  v_doc_sha text;
  v_done public.upload_completions%rowtype;
  v_new uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 128 then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid sha256' using errcode = '22023';
  end if;

  select owner_user_id, scan_status, size_bytes, sha256
    into v_owner, v_status, v_declared, v_doc_sha
  from public.documents
  where id = p_document_id
  for update;
  if not found or v_owner <> v_uid then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
  if p_actual_size is null or p_actual_size <> v_declared then
    raise exception 'size does not match the upload ticket' using errcode = '22023';
  end if;

  -- Gửi lại cho cùng tài liệu: trả về bản ghi cũ nếu sha256 khớp, từ chối nếu khác.
  select * into v_done from public.upload_completions where document_id = p_document_id;
  if found then
    if v_done.sha256 <> p_sha256 then
      raise exception 'document already completed with different content' using errcode = '23505';
    end if;
    return query select v_done.id, true;
    return;
  end if;

  -- Khóa idempotency thuộc về chủ sở hữu; dùng lại cho tài liệu khác là xung đột.
  if exists (
    select 1 from public.upload_completions
    where owner_user_id = v_uid and idempotency_key = p_idempotency_key
  ) then
    raise exception 'idempotency key already used for another document' using errcode = '23505';
  end if;

  if v_status not in ('SCANNER_UNAVAILABLE', 'CLEAN') then
    raise exception 'document is not ready for completion' using errcode = '55000';
  end if;
  if v_doc_sha is not null and v_doc_sha <> p_sha256 then
    raise exception 'document already has different content' using errcode = '23505';
  end if;

  insert into public.upload_completions (owner_user_id, document_id, idempotency_key, sha256)
  values (v_uid, p_document_id, p_idempotency_key, p_sha256)
  returning id into v_new;

  update public.documents
     set sha256 = p_sha256,
         updated_at = now()
   where id = p_document_id;

  perform public.write_audit(null, 'document.complete', 'document', p_document_id::text,
    jsonb_build_object('completion', v_new, 'sha256', p_sha256));
  return query select v_new, false;
end;
$$;

revoke all on function public.complete_upload(uuid, text, text, bigint) from public;
grant execute on function public.complete_upload(uuid, text, text, bigint) to authenticated;
