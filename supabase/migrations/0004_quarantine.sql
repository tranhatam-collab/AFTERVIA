-- WO05-02: ghi kết quả kiểm tra chữ ký và chuyển sang quarantine, từ chối, hoặc chờ scanner.
-- Chỉ chủ sở hữu gọi được, và chỉ khi tài liệu còn PENDING_UPLOAD (một lần duy nhất).
-- Không có đường nào sang CLEAN: CLEAN chỉ đến từ scanner đã duyệt (INFRA, WO05-03).
-- Quarantine và từ chối giữ 7 ngày theo đặc tả (legal/04_DATA_RETENTION_AND_DELETION.md).
-- declared_mime_not_allowed không đi vào DB: create_upload_ticket đã chặn MIME ngoài danh sách.

create function public.record_upload_inspection(
  p_document_id uuid,
  p_scan_status text,
  p_reason text,
  p_detected_mime text,
  p_actual_size bigint
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_declared text;
  v_current text;
  v_size_ok boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_reason not in ('size_out_of_range', 'unknown_signature', 'mime_mismatch', 'scanner_unavailable') then
    raise exception 'invalid inspection reason' using errcode = '22023';
  end if;
  if p_detected_mime is not null and p_detected_mime not in ('image/jpeg', 'image/png', 'application/pdf') then
    raise exception 'invalid detected mime' using errcode = '22023';
  end if;
  if (p_reason = 'size_out_of_range' and p_scan_status <> 'REJECTED')
     or (p_reason in ('unknown_signature', 'mime_mismatch') and p_scan_status <> 'QUARANTINED')
     or (p_reason = 'scanner_unavailable' and p_scan_status <> 'SCANNER_UNAVAILABLE') then
    raise exception 'status does not match reason' using errcode = '22023';
  end if;
  if p_actual_size is null then
    raise exception 'actual size is required' using errcode = '22023';
  end if;
  v_size_ok := p_actual_size between 1 and 10485760;
  if (p_reason = 'size_out_of_range') = v_size_ok then
    raise exception 'actual size does not match reason' using errcode = '22023';
  end if;

  select owner_user_id, declared_mime, scan_status into v_owner, v_declared, v_current
  from public.documents where id = p_document_id for update;
  if not found or v_owner <> v_uid then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
  if v_current <> 'PENDING_UPLOAD' then
    raise exception 'document already inspected' using errcode = '55000';
  end if;
  if p_reason = 'size_out_of_range' and p_detected_mime is not null then
    raise exception 'size failure has no detected mime' using errcode = '22023';
  end if;
  if p_reason = 'unknown_signature' and p_detected_mime is not null then
    raise exception 'unknown signature has no detected mime' using errcode = '22023';
  end if;
  if p_reason = 'mime_mismatch' and (p_detected_mime is null or p_detected_mime = v_declared) then
    raise exception 'mime mismatch needs a different detected mime' using errcode = '22023';
  end if;
  if p_reason = 'scanner_unavailable' and p_detected_mime is distinct from v_declared then
    raise exception 'valid signature must match declared mime' using errcode = '22023';
  end if;

  update public.documents
     set scan_status = p_scan_status,
         retention_until = case when p_scan_status = 'SCANNER_UNAVAILABLE' then null else now() + interval '7 days' end,
         updated_at = now()
   where id = p_document_id;

  perform public.write_audit(null, 'document.inspect', 'document', p_document_id::text,
    jsonb_build_object('status', p_scan_status, 'reason', p_reason, 'detected_mime', p_detected_mime));
end;
$$;

revoke all on function public.record_upload_inspection(uuid, text, text, text, bigint) from public;
grant execute on function public.record_upload_inspection(uuid, text, text, text, bigint) to authenticated;
