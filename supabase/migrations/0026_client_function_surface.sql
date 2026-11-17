-- OWN-A-03 (audit 10/11, D-01 lớp rộng). Migration 0024 và 0025 đã xử lý từng hàm được nêu tên.
-- Lượt này đóng cả lớp: trên Supabase, quyền mặc định cấp EXECUTE cho anon và authenticated với mọi
-- hàm mới trong schema public, nên mọi hàm chỉ `revoke ... from public` vẫn gọi được qua RPC.
-- Đã đo trên DB thử dựng với quyền mặc định đó: 40 trong 57 hàm của schema public gọi được bởi cả
-- anon và authenticated, và cả 40 đều là SECURITY DEFINER.
--
-- Làm hai việc:
--   1. Thu EXECUTE của anon trên mọi hàm hiện có trong public. API không bao giờ kết nối bằng anon
--      (services/api/src/db/session.ts luôn đặt `set local role authenticated`), và anon không có
--      quyền bảng nào (0001), nên mọi hàm anon gọi được chỉ là bề mặt tấn công.
--   2. Thu EXECUTE của authenticated trên kill_switch_enabled: hàm này chỉ được gọi từ trong
--      enforce_sharing_kill_switch, là SECURITY DEFINER, nên chuỗi gọi không cần quyền của vai trò
--      client. Không policy nào tham chiếu nó. (0025 để ngỏ hàm này vì chưa kiểm được điểm đó.)
--
-- Giữ nguyên cho authenticated: bề mặt client đã rà, khóa trong tests/security/function-privileges-surface.test.ts.
-- is_org_member phải giữ vì được gọi trong RLS policy, nơi vai trò truy vấn cần EXECUTE.
--
-- Ghi chú triển khai: `alter default privileges` chỉ áp cho đối tượng do chính vai trò cấp tạo ra.
-- Trên Supabase thật, phải kiểm lại quyền hàm trên dự án đó trước lần deploy đầu tiên.

-- Không dùng `alter default privileges ... revoke execute on functions`: đã đo trên PostgreSQL 16 trong
-- lượt này, câu lệnh đó KHÔNG chặn được quyền EXECUTE tích hợp mà Postgres cấp cho PUBLIC trên hàm mới.
-- Kể cả khi bản ghi pg_default_acl còn lại không có mục PUBLIC, hàm tạo sau vẫn nhận `=X` (PUBLIC).
-- Vậy không có cách khai báo "hàm mới mặc định chỉ máy chủ gọi được". Chốt kiểm soát là
-- tests/security/function-privileges-surface.test.ts: hàm mới luôn hiện ra là client gọi được, nên test
-- đó đỏ cho tới khi có migration thu quyền tường minh, hoặc hàm được thêm vào bề mặt đã rà.

do $$
declare
  v_sig text;
  v_count integer := 0;
begin
  for v_sig in
    select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype <> 'trigger'::regtype
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
       )
  loop
    execute format('revoke execute on function %s from anon', v_sig);
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then
    raise exception 'no function found in schema public: the revoke did nothing' using errcode = '22023';
  end if;
end $$;

revoke execute on function public.kill_switch_enabled(text) from anon, authenticated;

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype <> 'trigger'::regtype
       and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'anon can still execute a function in schema public' using errcode = '22023';
  end if;
end $$;
