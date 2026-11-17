// Truy cập DB cho API. Mỗi yêu cầu chạy trong một transaction với vai trò authenticated và claims của người dùng,
// giống PostgREST, để RLS và hàm SECURITY DEFINER áp dụng đúng.
import pg from 'pg';

// Giữ ngày theo lịch dưới dạng chuỗi YYYY-MM-DD (OID 1082), không chuyển sang Date theo múi giờ (T22).
pg.types.setTypeParser(1082, (value: string) => value);

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 4 });
}

// extraClaims đi vào request.jwt.claims cùng sub và role. Dùng cho thao tác mà hàm SQL cần biết thêm về
// phiên, ví dụ iat để kiểm xác thực lại trước khi xóa tài khoản (D-05).
export async function withUser<T>(
  pool: pg.Pool,
  userId: string,
  run: (client: pg.PoolClient) => Promise<T>,
  extraClaims: Record<string, unknown> = {},
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: 'authenticated', ...extraClaims }),
    ]);
    await client.query('set local role authenticated');
    try {
      const result = await run(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  } finally {
    client.release();
  }
}

// Ghi nhật ký lần từ chối trong kết nối riêng, sau khi transaction đã rollback, để bản ghi không mất.
// Kết nối này phải là vai trò dịch vụ có quyền INSERT vào audit_events và không có quyền ghi bảng nghiệp vụ.
export async function recordDenial(
  pool: pg.Pool,
  input: { actorId: string; orgId: string; operation: string; objectId: string; reason: string },
): Promise<void> {
  await pool.query(
    `insert into public.audit_events (actor_user_id, org_id, action, object_type, object_id, details)
     values ($1, $2, 'authz.denied', 'organization', $3, $4::jsonb)`,
    [input.actorId, input.orgId, input.objectId, JSON.stringify({ operation: input.operation, reason: input.reason })],
  );
}
