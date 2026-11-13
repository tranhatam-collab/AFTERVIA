// D5 (06_DECISION_QUEUE): vai trò kết nối API cho production — `aftervia_api`.
//
// Thiết kế được kiểm ở đây, không chỉ "role tồn tại":
// 1. KHÔNG superuser, KHÔNG bypassrls: quên RLS không bao giờ là âm thầm thấy hết.
// 2. NOINHERIT + chỉ là thành viên của authenticated: kết nối mặc định không đọc được bảng
//    nghiệp vụ nào; mọi request phải đi qua đúng luồng withUser (claims + SET ROLE).
//    Quên SET ROLE thì truy vấn LỖI to, không trả dữ liệu.
// 3. Không là thành viên service_role: đường lên "service" chỉ qua hàm SECURITY DEFINER
//    có assert_server_caller, không qua SET ROLE.
// 4. Quyền trực tiếp đúng ba việc máy chủ làm ngoài withUser:
//    - recordDenial: INSERT audit_events, và CHỈ hàng action = 'authz.denied' (policy riêng);
//    - đăng nhập dev: SELECT đúng cột id của auth.users;
//    - ingest webhook billing: EXECUTE record_billing_event (assert_server_caller chấp nhận
//      vì vai trò hiện tại không phải anon/authenticated và không có claims).
//
// Mật khẩu KHÔNG nằm trong migration: test đặt mật khẩu ngẫu nhiên lúc chạy (ALTER ROLE)
// rồi mở một KẾT NỐI THẬT bằng vai trò này — không dùng SET ROLE từ superuser, vì superuser
// set role được mọi vai trò và sẽ làm các phép thử membership thành vô nghĩa.

import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connect, resetTestDatabase, testDatabaseUrl } from '../support/db';

const USER_A = randomUUID();
const USER_B = randomUUID();

function apiConnectionString(password: string): string {
  const url = new URL(testDatabaseUrl());
  url.username = 'aftervia_api';
  url.password = password;
  return url.toString();
}

async function codeOf(run: Promise<unknown>): Promise<string> {
  try {
    await run;
    return 'NO_ERROR';
  } catch (error) {
    return (error as { code?: string }).code ?? 'NO_CODE';
  }
}

describe('D5: vai trò kết nối API aftervia_api', () => {
  let admin: pg.Client;
  let api: pg.Client;

  beforeAll(async () => {
    await resetTestDatabase();
    admin = await connect();
    await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
      USER_A,
      'd5-a@test.invalid',
      USER_B,
      'd5-b@test.invalid',
    ]);
    await admin.query('insert into public.profiles (id) values ($1), ($2) on conflict (id) do nothing', [USER_A, USER_B]);
    const password = randomBytes(24).toString('hex');
    await admin.query(`alter role aftervia_api password '${password}'`);
    api = new pg.Client({ connectionString: apiConnectionString(password) });
    await api.connect();
  });

  afterAll(async () => {
    await api?.end();
    await admin?.end();
  });

  it('có các thuộc tính an toàn: login, không superuser, không bypassrls, không inherit, không create', async () => {
    const { rows } = await admin.query(
      `select rolcanlogin, rolsuper, rolbypassrls, rolinherit, rolcreatedb, rolcreaterole
         from pg_roles where rolname = 'aftervia_api'`,
    );
    expect(rows).toEqual([
      {
        rolcanlogin: true,
        rolsuper: false,
        rolbypassrls: false,
        rolinherit: false,
        rolcreatedb: false,
        rolcreaterole: false,
      },
    ]);
  });

  it('là thành viên của đúng một vai trò: authenticated (không service_role, không anon)', async () => {
    const { rows } = await admin.query(
      `select r.rolname
         from pg_auth_members m
         join pg_roles r on r.oid = m.roleid
         join pg_roles mem on mem.oid = m.member
        where mem.rolname = 'aftervia_api'
        order by r.rolname`,
    );
    expect(rows.map((r) => r.rolname)).toEqual(['authenticated']);
  });

  it('kết nối mặc định không đọc được bảng nghiệp vụ: quên SET ROLE là lỗi, không phải thấy hết', async () => {
    expect(await codeOf(api.query('select count(*) from public.profiles'))).toBe('42501');
    expect(await codeOf(api.query('select count(*) from public.audit_events'))).toBe('42501');
    expect(await codeOf(api.query('select count(*) from public.billing_events'))).toBe('42501');
  });

  it('không leo thang được: không SET ROLE service_role, không tạo bảng', async () => {
    expect(await codeOf(api.query('set role service_role'))).toBe('42501');
    expect(await codeOf(api.query('create table public.d5_probe (x int)'))).toBe('42501');
  });

  it('auth.users chỉ lộ đúng cột id (cho kiểm tra đăng nhập dev), không lộ email', async () => {
    const ok = await api.query('select id from auth.users where id = $1', [USER_A]);
    expect(ok.rows).toEqual([{ id: USER_A }]);
    expect(await codeOf(api.query('select email from auth.users limit 1'))).toBe('42501');
  });

  it('luồng withUser chạy trọn vẹn qua kết nối này, và RLS cắt đúng theo người dùng', async () => {
    await api.query('begin');
    try {
      await api.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: USER_A, role: 'authenticated' }),
      ]);
      await api.query('set local role authenticated');
      const { rows } = await api.query('select id from public.profiles order by id');
      expect(rows).toEqual([{ id: USER_A }]);
    } finally {
      await api.query('rollback');
    }
  });

  it('ghi được từ chối (authz.denied) trực tiếp, nhưng KHÔNG ghi được action nào khác', async () => {
    // Không RETURNING: recordDenial thật cũng không dùng, và vai trò này cố ý KHÔNG có SELECT
    // trên audit_events. Xác nhận hàng đã ghi bằng kết nối admin.
    await api.query(
      `insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
       values ($1, null, 'authz.denied', 'organization', 'd5-test', '{}'::jsonb)`,
      [USER_A],
    );
    const seen = await admin.query(`select action from public.audit_events where object_id = 'd5-test'`);
    expect(seen.rows).toEqual([{ action: 'authz.denied' }]);
    expect(
      await codeOf(
        api.query(
          `insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
           values ($1, null, 'case.update', 'organization', 'd5-test', '{}'::jsonb)`,
          [USER_A],
        ),
      ),
    ).toBe('42501');
  });

  it('gọi được record_billing_event như máy chủ (assert_server_caller chấp nhận vai trò kết nối)', async () => {
    const eventId = `d5-${randomUUID()}`;
    const { rows } = await api.query(
      `select public.record_billing_event('sandbox_b2b', $1, $2, 'purchase', 'active', now(), 1, '{}'::jsonb) as receipt`,
      [eventId, USER_A],
    );
    expect(rows[0].receipt.recorded).toBe(true);
  });

  it('nhưng sau SET ROLE authenticated thì record_billing_event bị chặn', async () => {
    await api.query('begin');
    try {
      await api.query('set local role authenticated');
      expect(
        await codeOf(
          api.query(`select public.record_billing_event('sandbox_b2b', 'd5-blocked', $1, 'purchase', 'active', now(), 1, '{}'::jsonb)`, [
            USER_A,
          ]),
        ),
      ).toBe('42501');
    } finally {
      await api.query('rollback');
    }
  });

  it('migration lặp lại được: reset lần nữa không lỗi (role đã tồn tại), quyền được cấp lại', async () => {
    await resetTestDatabase();
    await admin.query('insert into auth.users (id, email) values ($1, $2)', [USER_A, 'd5-a@test.invalid']);
    await api.query(
      `insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
       values ($1, null, 'authz.denied', 'organization', 'd5-reset', '{}'::jsonb)`,
      [USER_A],
    );
    const seen = await admin.query(`select action from public.audit_events where object_id = 'd5-reset'`);
    expect(seen.rows).toEqual([{ action: 'authz.denied' }]);
  });
});
