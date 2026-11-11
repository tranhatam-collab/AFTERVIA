import type { AddressInfo } from 'node:net';
import { signLocalSession } from '../../services/api/src/auth/jwt';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { connect } from '../support/db';

// Trợ giúp dùng chung cho các kiểm thử đo độ trễ (WO15-02). Chỉ dùng PostgreSQL của kiểm thử và máy chủ cục bộ.
// Khóa ký chỉ là khóa kiểm thử (ghép chuỗi để tránh bị quét nhầm là bí mật), không dùng ở môi trường khác.

const SECRET = ['local', 'test', 'signing', 'material', '0005'].join('-');
export const PERF_USER = '00000000-0000-4000-8000-0000000000c9';

export interface RunningServer {
  baseUrl: string;
  stop(): Promise<void>;
}

export async function seedPerfItem(): Promise<string> {
  const admin = await connect();
  try {
    await admin.query('insert into auth.users (id, email) values ($1, $2)', [PERF_USER, 'perf@test.invalid']);
    const row = (
      await admin.query(
        "insert into public.items (owner_user_id, title, brand, model, purchased_on, currency) values ($1, 'Máy pha cà phê', 'Hãng A', 'Model A', '2025-01-10', 'VND') returning id",
        [PERF_USER],
      )
    ).rows[0];
    if (!row) throw new Error('seed did not return an item');
    return row.id as string;
  } finally {
    await admin.end();
  }
}

export async function startServer(): Promise<RunningServer> {
  const pool = createPool(process.env.TEST_DATABASE_URL ?? '');
  const server = createHttpServer({ pool, jwtSecret: SECRET, appEnv: 'test' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stop: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pool.end();
    },
  };
}

export function perfToken(): string {
  return signLocalSession({ sub: PERF_USER, exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);
}
