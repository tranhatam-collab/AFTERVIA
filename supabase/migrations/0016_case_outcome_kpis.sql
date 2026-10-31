-- WO14-01: KPI hậu mãi tách bạch (T43, US17). Bốn số đo: resolved, closed, withdrawn, reopened.
-- Mỗi số đo đếm số case phân biệt có sự kiện tương ứng trong khoảng [p_from, p_to). Không cộng các số đo với nhau.
-- resolved đếm case có chuyển sang resolved (một case resolved hai lần chỉ đếm một lần); closed không được tính vào resolved;
--   withdrawn không phải kết quả đã giải quyết; reopened đếm case có sự kiện mở lại.
-- Mọi số đo có basis 'actual', lấy từ lịch sử sự kiện chỉ thêm của case. Hàm không trả số mô hình; số tài chính mô hình (WO12)
--   phải là dòng riêng với basis 'model', không lẫn vào đây.
-- Chỉ chủ cửa hàng và quản lý của tổ chức đọc được. Nhân viên, khách và tổ chức khác nhận 42501.

create function public.case_outcome_kpis(p_org uuid, p_from timestamptz, p_to timestamptz)
returns table (metric text, basis text, value integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_from >= p_to then
    raise exception 'invalid period' using errcode = '22023';
  end if;
  if not public.is_org_member(p_org, array['owner', 'manager']) then
    raise exception 'not allowed for this organization' using errcode = '42501';
  end if;

  return query
  select 'resolved'::text, 'actual'::text, count(distinct e.case_id)::integer
    from public.case_events e
    join public.cases c on c.id = e.case_id
   where c.org_id = p_org and e.type = 'transition' and e.to_state = 'resolved'
     and e.created_at >= p_from and e.created_at < p_to
  union all
  select 'closed'::text, 'actual'::text, count(distinct e.case_id)::integer
    from public.case_events e
    join public.cases c on c.id = e.case_id
   where c.org_id = p_org and e.type = 'transition' and e.to_state = 'closed'
     and e.created_at >= p_from and e.created_at < p_to
  union all
  select 'withdrawn'::text, 'actual'::text, count(distinct e.case_id)::integer
    from public.case_events e
    join public.cases c on c.id = e.case_id
   where c.org_id = p_org and e.type = 'transition' and e.to_state = 'withdrawn'
     and e.created_at >= p_from and e.created_at < p_to
  union all
  select 'reopened'::text, 'actual'::text, count(distinct e.case_id)::integer
    from public.case_events e
    join public.cases c on c.id = e.case_id
   where c.org_id = p_org and e.type = 'reopen'
     and e.created_at >= p_from and e.created_at < p_to;
end;
$$;

revoke all on function public.case_outcome_kpis(uuid, timestamptz, timestamptz) from public;
grant execute on function public.case_outcome_kpis(uuid, timestamptz, timestamptz) to authenticated;
