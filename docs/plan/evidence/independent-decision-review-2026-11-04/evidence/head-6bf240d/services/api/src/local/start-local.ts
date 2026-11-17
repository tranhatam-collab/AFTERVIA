// Khởi động API cục bộ (WO26-02). Không phải production, không dùng dữ liệu thật.
// Ràng buộc: cấu hình chỉ đọc từ biến môi trường AFTERVIA_LOCAL_*; chỉ nối DB có tên kết thúc bằng _test và chỉ tới máy này;
// luôn chạy ở chế độ kiểm thử, nên đăng nhập giả lập (DEC-ENG-11) chỉ có ở chế độ này; không in secret hay URL ra log.
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { createPool } from '../db/session';
import { createHttpServer } from '../http/app';

export const LOCAL_HOST = '127.0.0.1';
export const LOCAL_APP_ENV = 'test';
export const DEFAULT_LOCAL_PORT = 8787;
export const MIN_JWT_SECRET_LENGTH = 32;

export const LOCAL_ENV = {
  databaseUrl: 'AFTERVIA_LOCAL_DATABASE_URL',
  jwtSecret: 'AFTERVIA_LOCAL_JWT_SECRET',
  port: 'AFTERVIA_LOCAL_PORT',
  appEnv: 'AFTERVIA_LOCAL_APP_ENV',
} as const;

const LOOPBACK_NAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const HOST_MESSAGE = `${LOCAL_ENV.databaseUrl} must point to this machine only (localhost, 127.0.0.1, ::1 or a Unix socket path)`;

export type LocalEnv = Readonly<Record<string, string | undefined>>;

export interface LocalConfig {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
}

export type LocalConfigResult = { ok: true; config: LocalConfig } | { ok: false; error: string };

export interface LocalApi {
  address: string;
  port: number;
  close(): Promise<void>;
}

export interface LocalApiDeps {
  createPool?: (connectionString: string) => pg.Pool;
}

function isLocalTarget(value: string): boolean {
  return value.split(',').every((part) => part.startsWith('/') || LOOPBACK_NAMES.has(part));
}

// Trả về lý do từ chối, hoặc null nếu URL được chấp nhận. Không bao giờ in URL vì có thể chứa mật khẩu.
export function checkLocalDatabaseUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `${LOCAL_ENV.databaseUrl} is not a valid URL`;
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    return `${LOCAL_ENV.databaseUrl} must use the postgres:// or postgresql:// scheme`;
  }
  // Tham số dbname có thể đổi DB đích; tên DB chỉ lấy từ đường dẫn để kiểm được.
  if (url.searchParams.has('dbname')) {
    return `${LOCAL_ENV.databaseUrl} must not use a dbname parameter; the name comes from the path`;
  }
  let name: string;
  try {
    name = decodeURIComponent(url.pathname.replace(/^\//, ''));
  } catch {
    return `${LOCAL_ENV.databaseUrl} has an invalid database name`;
  }
  if (!name.endsWith('_test')) {
    return `refusing to use database "${name}": its name must end with _test`;
  }
  const targets = [url.hostname, url.searchParams.get('host'), url.searchParams.get('hostaddr')];
  for (const target of targets) {
    if (target !== null && target !== '' && !isLocalTarget(target)) return HOST_MESSAGE;
  }
  return null;
}

export function readLocalConfig(env: LocalEnv): LocalConfigResult {
  const fail = (error: string): LocalConfigResult => ({ ok: false, error });
  if (env[LOCAL_ENV.appEnv] !== undefined) {
    return fail(`${LOCAL_ENV.appEnv} must not be set: the local API always runs in test mode`);
  }
  const databaseUrl = env[LOCAL_ENV.databaseUrl] ?? '';
  if (databaseUrl === '') return fail(`${LOCAL_ENV.databaseUrl} is not set`);
  const problem = checkLocalDatabaseUrl(databaseUrl);
  if (problem !== null) return fail(problem);

  const jwtSecret = env[LOCAL_ENV.jwtSecret] ?? '';
  if (jwtSecret === '') return fail(`${LOCAL_ENV.jwtSecret} is not set`);
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    return fail(`${LOCAL_ENV.jwtSecret} must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  let port = DEFAULT_LOCAL_PORT;
  const rawPort = env[LOCAL_ENV.port];
  if (rawPort !== undefined && rawPort !== '') {
    const parsed = /^\d{1,5}$/.test(rawPort) ? Number(rawPort) : Number.NaN;
    if (!(parsed >= 1024 && parsed <= 65535)) {
      return fail(`${LOCAL_ENV.port} must be a whole number from 1024 to 65535`);
    }
    port = parsed;
  }
  return { ok: true, config: { databaseUrl, jwtSecret, port } };
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => reject(error);
    server.once('error', onError);
    server.listen(port, LOCAL_HOST, () => {
      server.off('error', onError);
      resolve();
    });
  });
}

// Nối DB, kiểm tên DB thật trên kết nối (phòng URL và máy chủ không khớp), rồi mở cổng trên 127.0.0.1.
// Nếu bất kỳ bước nào lỗi thì đóng pool trước khi báo lỗi.
export async function startLocalApi(config: LocalConfig, deps: LocalApiDeps = {}): Promise<LocalApi> {
  const problem = checkLocalDatabaseUrl(config.databaseUrl);
  if (problem !== null) throw new Error(problem);
  const pool = (deps.createPool ?? createPool)(config.databaseUrl);
  try {
    const { rows } = await pool.query<{ name: string }>('select current_database() as name');
    const connected = rows[0]?.name ?? '';
    if (!connected.endsWith('_test')) {
      throw new Error(`refusing to serve database "${connected}": its name must end with _test`);
    }
    const server = createHttpServer({ pool, jwtSecret: config.jwtSecret, appEnv: LOCAL_APP_ENV });
    await listen(server, config.port);
    const { address, port } = server.address() as AddressInfo;
    let closing: Promise<void> | null = null;
    return {
      address,
      port,
      close() {
        closing ??= (async () => {
          server.closeAllConnections();
          await new Promise<void>((resolve) => server.close(() => resolve()));
          await pool.end();
        })();
        return closing;
      },
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
