-- 0003_documents: tài liệu riêng tư và ticket tải lên (WO05-01).
-- Khóa lưu trữ là UUID ngẫu nhiên và KHÔNG được cấp quyền đọc cho client (T38).
-- Kiểm chữ ký nhị phân và quét mã độc thuộc WO05-02 và WO05-03. Lát cắt này chỉ tạo metadata và ticket.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  object_key text not null default gen_random_uuid()::text unique
    check (object_key ~ '^[0-9a-f-]{36}$'),
  declared_mime text not null check (declared_mime in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  sha256 text null check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  scan_status text not null default 'PENDING_UPLOAD'
    check (scan_status in ('PENDING_UPLOAD', 'QUARANTINED', 'CLEAN', 'REJECTED', 'SCANNER_UNAVAILABLE')),
  retention_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.upload_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.upload_tickets enable row level security;

create policy documents_select_owner on public.documents
  for select to authenticated
  using (owner_user_id = auth.uid());

create policy upload_tickets_select_owner on public.upload_tickets
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on public.documents from anon, authenticated;
revoke all on public.upload_tickets from anon, authenticated;
grant select (id, owner_user_id, declared_mime, size_bytes, sha256, scan_status, retention_until, created_at, updated_at)
  on public.documents to authenticated;
grant select (id, owner_user_id, document_id, expires_at, used_at, created_at)
  on public.upload_tickets to authenticated;

-- Ticket có hạn 15 phút. Không trả khóa lưu trữ về cho client.
create function public.create_upload_ticket(p_declared_mime text, p_size_bytes bigint)
returns table (out_document_id uuid, out_ticket_id uuid, out_expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_doc uuid;
  v_ticket uuid;
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.documents (owner_user_id, declared_mime, size_bytes)
  values (v_uid, p_declared_mime, p_size_bytes)
  returning id into v_doc;
  insert into public.upload_tickets (owner_user_id, document_id, expires_at)
  values (v_uid, v_doc, v_expires)
  returning id into v_ticket;
  perform public.write_audit(null, 'document.ticket', 'document', v_doc::text,
    jsonb_build_object('mime', p_declared_mime));
  return query select v_doc, v_ticket, v_expires;
end;
$$;

revoke all on function public.create_upload_ticket(text, bigint) from public;
grant execute on function public.create_upload_ticket(text, bigint) to authenticated;
