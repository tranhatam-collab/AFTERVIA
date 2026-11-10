-- OWN-A-09 (audit 10/11, D-03). store_export (0021) không giới hạn số gói xuất, nên một tài khoản có
-- thể tạo gói không ngừng; mỗi gói giữ nội dung năm tệp trong export_bodies suốt 24 giờ.
-- purge_expired_export_bodies() đã có và đã có kiểm thử, nhưng chỉ dọn phần ĐÃ hết hạn, nên không chặn
-- được việc tích lũy trong cửa sổ 24 giờ.
--
-- Lượt này thêm chặn trên 10 gói còn hiệu lực cho mỗi người. Thân hàm còn lại giữ nguyên văn bản của 0021.
--
-- Vẫn là việc của người: chọn nơi chạy purge_expired_export_bodies() theo lịch (không có lịch trong repo).

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
  v_live integer;
  v_live_limit constant integer := 10;
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

  -- D-03: chặn trên số gói xuất còn hiệu lực của mỗi người. Đặt SAU nhánh lặp lại, nên gọi lại cùng
  -- request_id vẫn trả gói cũ dù đã đạt giới hạn. Chỉ đếm gói chưa hết hạn: gói hết hạn đã bị
  -- purge_expired_export_bodies() dọn nội dung. 55000 được API ánh xạ sang 409 invalid_state.
  select count(*) into v_live from public.export_jobs
   where owner_user_id = v_uid and expires_at > now();
  if v_live >= v_live_limit then
    raise exception 'too many live exports' using errcode = '55000';
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
