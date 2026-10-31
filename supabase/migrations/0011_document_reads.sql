-- WO09-02: proxy đọc tài liệu. Mỗi lần đọc đi qua read_case_document: kiểm grant tại thời điểm đọc,
-- ghi audit cho cả lần được phép lẫn lần bị từ chối. Không trả về URL hay khóa lưu trữ.
-- Đầu vào chỉ là mã UUID của case và tài liệu, nên không có đường đọc theo URL (chặn SSRF và URL độc).
-- Thu hồi chặn lượt đọc mới. Bản đã tải trước đó không thu hồi được: notice 'revocation_limits_copies'
-- để giao diện giải thích cho người dùng.
-- Hạn chế: chưa có bộ lưu byte (DEC06), nên chưa có luồng tải byte thật. Khi có, khóa lưu trữ chỉ được
-- dịch vụ đọc sau khi hàm này cho phép, không bao giờ trả về cho client.

create function public.read_case_document(p_case uuid, p_document uuid, p_mode text)
returns table (out_allowed boolean, out_reason text, out_notice text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_decision record;
  v_allowed boolean;
  v_reason text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('view', 'download') then
    raise exception 'unknown read mode' using errcode = '22023';
  end if;

  select c.org_id into v_org from public.cases c where c.id = p_case;

  select * into v_decision from public.check_document_access(p_case, p_document);
  v_allowed := v_decision.out_allowed;
  v_reason := v_decision.out_reason;
  if v_allowed and p_mode = 'download' and not v_decision.out_can_download then
    v_allowed := false;
    v_reason := 'download_not_permitted';
  end if;

  perform public.write_audit(v_org,
    case when v_allowed then 'document.read' else 'document.read.denied' end,
    'document', p_document::text,
    jsonb_build_object('case', p_case, 'mode', p_mode, 'reason', v_reason));

  return query select
    v_allowed,
    v_reason,
    case when v_allowed then 'revocation_limits_copies'::text else null::text end;
end;
$$;

revoke all on function public.read_case_document(uuid, uuid, text) from public;
grant execute on function public.read_case_document(uuid, uuid, text) to authenticated;
