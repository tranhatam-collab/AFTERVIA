-- WO11-02e-EXP (T25; Q2 đã QUYẾT, phương án C): nội dung các tệp của gói xuất chuyển sang bảng sửa được có hạn 24 giờ.
-- export_files (chỉ thêm) chỉ giữ khóa tham chiếu (job_id, path), băm, kích thước và kiểu nội dung.
-- Đã làm: bảng export_bodies (RLS, không có quyền cho người dùng cuối); sao chép nội dung hiện có và kiểm băm trước khi bỏ cột;
--   store_export và fetch_export_file đọc và ghi qua export_bodies; trigger không cho hạn nội dung vượt hạn liên kết;
--   purge_expired_export_bodies() xóa nội dung đã hết hạn và ghi audit số lượng.
-- Chưa làm: quyền xuất trong lúc chờ xóa (Q6, WO11-02d); lịch chạy hàm dọn là việc vận hành, cần tác vụ được duyệt.
-- Không sửa migration đã áp dụng: thay hàm bằng create or replace, bỏ cột body bằng alter table.

-- Nội dung tệp của gói. Chỉ hàm SECURITY DEFINER truy cập; không có chính sách và không có quyền cho người dùng cuối.
create table public.export_bodies (
  job_id uuid not null references public.export_jobs (id),
  path text not null check (path in ('items.json', 'items.csv', 'granted_documents.json', 'granted_documents.csv', 'manifest.json')),
  body text not null,
  expires_at timestamptz not null,
  primary key (job_id, path)
);

alter table public.export_bodies enable row level security;
revoke all on table public.export_bodies from public, anon, authenticated;

-- Nội dung không sống lâu hơn liên kết của gói: hạn chỉ được rút ngắn, không được kéo dài quá hạn gói.
create function public.export_bodies_expiry_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.expires_at > (select j.expires_at from public.export_jobs j where j.id = new.job_id) then
    raise exception 'export body cannot outlive its export link' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.export_bodies_expiry_guard() from public;

create trigger export_bodies_expiry_guard
  before insert or update of expires_at on public.export_bodies
  for each row execute function public.export_bodies_expiry_guard();

-- Sao chép nội dung hiện có, giữ nguyên hạn của gói, rồi kiểm: mọi tệp có nội dung khớp băm đã lưu.
insert into public.export_bodies (job_id, path, body, expires_at)
select f.job_id, f.path, f.body, j.expires_at
  from public.export_files f
  join public.export_jobs j on j.id = f.job_id;

do $$
begin
  if (select count(*) from public.export_bodies) <> (select count(*) from public.export_files) then
    raise exception 'export bodies were not copied for every file' using errcode = '22023';
  end if;
  if exists (
    select 1
      from public.export_files f
      join public.export_bodies b on b.job_id = f.job_id and b.path = f.path
     where encode(sha256(convert_to(b.body, 'UTF8')), 'hex') <> f.sha256
  ) then
    raise exception 'export body does not match its stored sha256' using errcode = '22023';
  end if;
end;
$$;

-- Lưu gói: kiểm năm tệp, băm, manifest, phạm vi món đồ và grant. Gửi lại cùng yêu cầu trả về gói cũ.
create or replace function public.store_export(p_request_id text, p_token_hash text, p_files jsonb)
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

  -- Tham chiếu, băm và kích thước vào bảng chỉ thêm; nội dung vào bảng có hạn.
  insert into public.export_files (job_id, path, content_type, sha256, size_bytes)
  select v_job, f.value ->> 'path', f.value ->> 'content_type', f.value ->> 'sha256',
         (f.value ->> 'size_bytes')::integer
    from jsonb_array_elements(p_files) f;

  insert into public.export_bodies (job_id, path, body, expires_at)
  select v_job, f.value ->> 'path', f.value ->> 'body', v_expires
    from jsonb_array_elements(p_files) f;

  perform public.write_audit(null, 'export.create', 'export_job', v_job::text, jsonb_build_object('files', 5));
  return query select v_job, v_expires, false;
end;
$$;

-- Đọc một tệp của gói: chỉ chủ gói, đúng mã, gói còn hạn và nội dung còn hạn. Sai mã, hết hạn, đã dọn hoặc không phải chủ đều là không tìm thấy.
create or replace function public.fetch_export_file(p_job uuid, p_token_hash text, p_path text)
returns table (out_content_type text, out_sha256 text, out_size_bytes integer, out_body text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_job public.export_jobs%rowtype;
  v_body text;
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
  select b.body into v_body from public.export_bodies b
   where b.job_id = p_job and b.path = p_path and b.expires_at > now();
  if not found then
    raise exception 'export not found' using errcode = 'P0002';
  end if;
  perform public.write_audit(null, 'export.download', 'export_job', p_job::text, jsonb_build_object('path', p_path));
  return query
    select f.content_type, f.sha256, f.size_bytes, v_body
      from public.export_files f
     where f.job_id = p_job and f.path = p_path;
end;
$$;

-- Xóa nội dung đã hết hạn. Tham chiếu, băm và kích thước trong export_files vẫn còn (chỉ thêm).
-- Chỉ tác vụ hệ thống hoặc chủ cơ sở dữ liệu gọi; người dùng cuối không có quyền thực thi.
create function public.purge_expired_export_bodies()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with gone as (
    delete from public.export_bodies where expires_at <= now() returning 1
  )
  select count(*)::integer into v_count from gone;
  perform public.write_audit(null, 'export.bodies_purged', 'export_bodies', 'batch', jsonb_build_object('count', v_count));
  return v_count;
end;
$$;

revoke all on function public.purge_expired_export_bodies() from public, anon, authenticated;
revoke all on function public.store_export(text, text, jsonb) from public;
grant execute on function public.store_export(text, text, jsonb) to authenticated;
revoke all on function public.fetch_export_file(uuid, text, text) from public;
grant execute on function public.fetch_export_file(uuid, text, text) to authenticated;

-- Bỏ nội dung khỏi bảng chỉ thêm. Nội dung đã nằm trong export_bodies và đã kiểm băm ở trên.
alter table public.export_files drop column body;
