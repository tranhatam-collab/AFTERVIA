-- WO11-01: xuất dữ liệu theo phạm vi quyền (T24). Gói xuất gồm JSON, CSV và manifest SHA-256 cho năm tệp.
-- Phạm vi: món đồ của chính người dùng, và tài liệu được grant còn hiệu lực trong case mà người tham gia còn hiệu lực.
-- Không có byte tệp trong gói: chưa có kho lưu trữ (DEC06). Gói chỉ chứa metadata và manifest.
-- Cơ sở dữ liệu kiểm phạm vi khi lưu gói: mọi món đồ và mọi grant trong gói phải thuộc người lưu, đủ số lượng.
-- Liên kết tạm: mã ngẫu nhiên chỉ lưu dạng băm, hết hạn sau 24 giờ, chỉ chủ gói đọc được.
-- Hạn chế: chưa có dọn dẹp tự động gói đã hết hạn và chưa có định tuyến HTTP (ghi trong evidence WO11-01).

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id),
  request_id text not null check (char_length(request_id) between 8 and 128),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (owner_user_id, request_id),
  constraint export_jobs_ttl check (expires_at = created_at + interval '24 hours')
);

create table public.export_files (
  job_id uuid not null references public.export_jobs (id),
  path text not null check (path in ('items.json', 'items.csv', 'granted_documents.json', 'granted_documents.csv', 'manifest.json')),
  content_type text not null check (content_type in ('application/json', 'text/csv; charset=utf-8')),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes >= 0),
  body text not null,
  primary key (job_id, path)
);

-- Gói và tệp chỉ được thêm, không sửa, không xóa.
create trigger export_jobs_append_only
  before update or delete on public.export_jobs
  for each row execute function public.forbid_append_only_mutation();
create trigger export_jobs_no_truncate
  before truncate on public.export_jobs
  for each statement execute function public.forbid_append_only_mutation();
create trigger export_files_append_only
  before update or delete on public.export_files
  for each row execute function public.forbid_append_only_mutation();
create trigger export_files_no_truncate
  before truncate on public.export_files
  for each statement execute function public.forbid_append_only_mutation();

alter table public.export_jobs enable row level security;
alter table public.export_files enable row level security;

-- Chủ gói chỉ thấy siêu dữ liệu của gói của mình. Nội dung tệp không có quyền đọc trực tiếp: chỉ qua hàm.
create policy export_jobs_select_owner on public.export_jobs
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on table public.export_jobs, public.export_files from public, anon, authenticated;
grant select (id, owner_user_id, request_id, created_at, expires_at) on public.export_jobs to authenticated;

-- Tài liệu được grant còn hiệu lực cho chính người gọi, trong case có người tham gia còn hiệu lực.
create function public.export_granted_documents()
returns table (
  out_grant_id uuid,
  out_case_id uuid,
  out_document_id uuid,
  out_declared_mime text,
  out_size_bytes bigint,
  out_scan_status text,
  out_can_download boolean,
  out_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return query
    select g.id, g.case_id, d.id, d.declared_mime, d.size_bytes, d.scan_status, g.can_download, g.expires_at
      from public.case_document_grants g
      join public.documents d on d.id = g.document_id
      join public.case_evidence e on e.case_id = g.case_id and e.document_id = g.document_id
      join public.case_participants p on p.case_id = g.case_id and p.actor_id = g.recipient_id
                                     and p.revoked_at is null and p.expires_at > now()
     where g.recipient_id = auth.uid()
       and g.revoked_at is null
       and g.expires_at > now()
       and d.scan_status in ('SCANNER_UNAVAILABLE', 'CLEAN')
     order by g.granted_at, g.id;
end;
$$;

-- Lưu gói: kiểm năm tệp, băm, manifest, phạm vi món đồ và grant. Gửi lại cùng yêu cầu trả về gói cũ.
create function public.store_export(p_request_id text, p_token_hash text, p_files jsonb)
returns table (out_job_id uuid, out_expires_at timestamptz, out_replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.export_jobs%rowtype;
  v_job uuid;
  v_expires timestamptz := now() + interval '24 hours';
  v_required text[] := array['items.json', 'items.csv', 'granted_documents.json', 'granted_documents.csv', 'manifest.json'];
  v_file jsonb;
  v_path text;
  v_body text;
  v_items_body text;
  v_grants_body text;
  v_manifest_body text;
  v_items jsonb;
  v_grants jsonb;
  v_manifest jsonb;
  v_elem jsonb;
  v_expected_items integer;
  v_expected_grants integer;
  v_manifest_sha text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then
    raise exception 'invalid request id' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid token hash' using errcode = '22023';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array' then
    raise exception 'files must be an array' using errcode = '22023';
  end if;

  select * into v_existing from public.export_jobs
   where owner_user_id = v_uid and request_id = p_request_id;
  if found then
    return query select v_existing.id, v_existing.expires_at, true;
    return;
  end if;

  if jsonb_array_length(p_files) <> 5
     or (select count(distinct f.value ->> 'path') from jsonb_array_elements(p_files) f) <> 5 then
    raise exception 'export must contain exactly the five files, once each' using errcode = '22023';
  end if;

  for v_file in select f.value from jsonb_array_elements(p_files) f loop
    v_path := v_file ->> 'path';
    if v_path is null or not (v_path = any (v_required)) then
      raise exception 'unknown export file' using errcode = '22023';
    end if;
    v_body := v_file ->> 'body';
    if v_body is null then
      raise exception 'missing body' using errcode = '22023';
    end if;
    if (v_file ->> 'size_bytes')::integer <> octet_length(convert_to(v_body, 'UTF8')) then
      raise exception 'size does not match body' using errcode = '22023';
    end if;
    if encode(sha256(convert_to(v_body, 'UTF8')), 'hex') <> (v_file ->> 'sha256') then
      raise exception 'sha256 does not match body' using errcode = '22023';
    end if;
  end loop;

  -- Phạm vi món đồ: đúng toàn bộ món đồ của người lưu, không có món của người khác.
  select f.value ->> 'body' into v_items_body from jsonb_array_elements(p_files) f where f.value ->> 'path' = 'items.json';
  v_items := (v_items_body::jsonb) -> 'items';
  if v_items is null or jsonb_typeof(v_items) <> 'array' then
    raise exception 'items.json must hold an items array' using errcode = '22023';
  end if;
  select count(*) into v_expected_items from public.items where owner_user_id = v_uid;
  if jsonb_array_length(v_items) <> v_expected_items then
    raise exception 'items do not match the owner''s items' using errcode = '42501';
  end if;
  for v_elem in select e.value from jsonb_array_elements(v_items) e loop
    if not exists (
      select 1 from public.items i where i.id = (v_elem ->> 'id')::uuid and i.owner_user_id = v_uid
    ) then
      raise exception 'item is outside the export scope' using errcode = '42501';
    end if;
  end loop;

  -- Phạm vi tài liệu: đúng các grant còn hiệu lực của người lưu.
  select f.value ->> 'body' into v_grants_body from jsonb_array_elements(p_files) f where f.value ->> 'path' = 'granted_documents.json';
  v_grants := (v_grants_body::jsonb) -> 'documents';
  if v_grants is null or jsonb_typeof(v_grants) <> 'array' then
    raise exception 'granted_documents.json must hold a documents array' using errcode = '22023';
  end if;
  select count(*) into v_expected_grants from public.export_granted_documents();
  if jsonb_array_length(v_grants) <> v_expected_grants then
    raise exception 'granted documents do not match the active grants' using errcode = '42501';
  end if;
  for v_elem in select e.value from jsonb_array_elements(v_grants) e loop
    if not exists (
      select 1 from public.export_granted_documents() g where g.out_grant_id = (v_elem ->> 'grant_id')::uuid
    ) then
      raise exception 'granted document is outside the export scope' using errcode = '42501';
    end if;
  end loop;

  -- Manifest: liệt kê đúng bốn tệp còn lại, với băm và kích thước khớp.
  select f.value ->> 'body' into v_manifest_body from jsonb_array_elements(p_files) f where f.value ->> 'path' = 'manifest.json';
  v_manifest := v_manifest_body::jsonb;
  if v_manifest -> 'files' is null or jsonb_typeof(v_manifest -> 'files') <> 'array'
     or jsonb_array_length(v_manifest -> 'files') <> 4 then
    raise exception 'manifest must list the other four files' using errcode = '22023';
  end if;
  for v_elem in select e.value from jsonb_array_elements(v_manifest -> 'files') e loop
    if not exists (
      select 1 from jsonb_array_elements(p_files) f
       where f.value ->> 'path' = v_elem ->> 'path'
         and f.value ->> 'sha256' = v_elem ->> 'sha256'
         and (f.value ->> 'size_bytes')::integer = (v_elem ->> 'size_bytes')::integer
    ) then
      raise exception 'manifest does not match the files' using errcode = '22023';
    end if;
  end loop;
  v_manifest_sha := encode(sha256(convert_to(v_manifest_body, 'UTF8')), 'hex');

  insert into public.export_jobs (owner_user_id, request_id, token_hash, manifest_sha256, expires_at)
  values (v_uid, p_request_id, p_token_hash, v_manifest_sha, v_expires)
  returning id into v_job;

  insert into public.export_files (job_id, path, content_type, sha256, size_bytes, body)
  select v_job, f.value ->> 'path', f.value ->> 'content_type', f.value ->> 'sha256',
         (f.value ->> 'size_bytes')::integer, f.value ->> 'body'
    from jsonb_array_elements(p_files) f;

  perform public.write_audit(null, 'export.create', 'export_job', v_job::text, jsonb_build_object('files', 5));
  return query select v_job, v_expires, false;
end;
$$;

-- Đọc một tệp của gói: chỉ chủ gói, đúng mã, còn hạn. Sai mã, hết hạn hoặc không phải chủ đều là không tìm thấy.
create function public.fetch_export_file(p_job uuid, p_token_hash text, p_path text)
returns table (out_content_type text, out_sha256 text, out_size_bytes integer, out_body text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.export_jobs%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_path is null or p_path not in ('items.json', 'items.csv', 'granted_documents.json', 'granted_documents.csv', 'manifest.json') then
    raise exception 'unknown export file' using errcode = '22023';
  end if;
  select * into v_job from public.export_jobs where id = p_job;
  if not found or v_job.owner_user_id <> v_uid or v_job.token_hash <> p_token_hash or v_job.expires_at <= now() then
    raise exception 'export not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.export_files f where f.job_id = p_job and f.path = p_path) then
    raise exception 'export not found' using errcode = 'P0002';
  end if;
  perform public.write_audit(null, 'export.download', 'export_job', p_job::text, jsonb_build_object('path', p_path));
  return query
    select f.content_type, f.sha256, f.size_bytes, f.body
      from public.export_files f
     where f.job_id = p_job and f.path = p_path;
end;
$$;

revoke all on function public.export_granted_documents() from public;
grant execute on function public.export_granted_documents() to authenticated;
revoke all on function public.store_export(text, text, jsonb) from public;
grant execute on function public.store_export(text, text, jsonb) to authenticated;
revoke all on function public.fetch_export_file(uuid, text, text) from public;
grant execute on function public.fetch_export_file(uuid, text, text) to authenticated;
