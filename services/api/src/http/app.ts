// API HTTP mỏng cho lát cắt P0 (WO04-04). Dùng node:http, không có thư viện phụ thuộc.
// Đăng nhập chỉ là GIẢ LẬP ở môi trường local/test (DEC-ENG-11). Mọi lỗi trả về mã chung, không lộ sự tồn tại của tổ chức.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type pg from 'pg';
import { signHs256, verifyHs256 } from '../auth/jwt';
import { recordDenial, withUser } from '../db/session';

export interface AppConfig {
  pool: pg.Pool;
  jwtSecret: string;
  appEnv: string;
}

const DEV_ENVS = new Set(['local', 'test']);
const MAX_BODY_BYTES = 16 * 1024;
const TOKEN_TTL_SECONDS = 3600;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new HttpError(400, 'invalid_body');
  return parsed as Record<string, unknown>;
}

function authenticate(req: IncomingMessage, config: AppConfig): { userId: string; simulated: boolean } {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!match || !match[1]) throw new HttpError(401, 'unauthenticated');
  const result = verifyHs256(match[1], config.jwtSecret);
  if (!result.ok) throw new HttpError(401, 'unauthenticated');
  return { userId: result.claims.sub, simulated: result.claims.simulated === true };
}

// Đổi lỗi cơ sở dữ liệu thành lỗi HTTP. Chỉ dùng mã SQLSTATE và thông điệp ổn định, không lộ chi tiết nội bộ.
function fromDbError(error: unknown): HttpError | null {
  const e = error as { code?: string; message?: string };
  switch (e.code) {
    case '42501':
      return new HttpError(403, 'forbidden');
    case 'P0002':
      return new HttpError(404, 'not_found');
    case '23505':
      return new HttpError(409, 'already_member');
    case '23514':
      return e.message?.includes('at least one active owner') ? new HttpError(409, 'last_owner') : new HttpError(400, 'invalid_input');
    case '22023':
      return new HttpError(400, 'invalid_input');
    default:
      return null;
  }
}

// Thao tác ghi: nếu bị từ chối (403) với tổ chức hợp lệ, ghi nhật ký authz.denied bằng kết nối riêng.
async function runWrite<T>(
  config: AppConfig,
  userId: string,
  operation: string,
  orgId: string,
  objectId: string,
  run: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  try {
    return await withUser(config.pool, userId, run);
  } catch (error) {
    const mapped = fromDbError(error);
    if (mapped?.status === 403 && UUID.test(orgId)) {
      await recordDenial(config.pool, { actorId: userId, orgId, operation, objectId, reason: 'forbidden' });
    }
    throw mapped ?? error;
  }
}

async function runRead<T>(config: AppConfig, userId: string, run: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  try {
    return await withUser(config.pool, userId, run);
  } catch (error) {
    throw fromDbError(error) ?? error;
  }
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || value.length === 0) throw new HttpError(400, 'invalid_input');
  return value;
}

function requireRole(body: Record<string, unknown>): string {
  const value = requireString(body, 'role');
  if (!['owner', 'manager', 'agent'].includes(value)) throw new HttpError(400, 'invalid_input');
  return value;
}

async function handle(req: IncomingMessage, res: ServerResponse, config: AppConfig): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';

  if (method === 'GET' && path === '/healthz') return send(res, 200, { ok: true });

  if (method === 'POST' && path === '/v1/dev/sign-in') {
    if (!DEV_ENVS.has(config.appEnv)) return send(res, 404, { error: 'not_found' });
    const body = await readJson(req);
    const userId = requireString(body, 'user_id');
    if (!UUID.test(userId)) throw new HttpError(400, 'invalid_input');
    const exists = await config.pool.query('select 1 from auth.users where id = $1', [userId]);
    if (exists.rowCount === 0) throw new HttpError(404, 'not_found');
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256({ sub: userId, role: 'authenticated', iat: now, exp: now + TOKEN_TTL_SECONDS, simulated: true }, config.jwtSecret);
    return send(res, 200, { access_token: token, token_type: 'Bearer', expires_in: TOKEN_TTL_SECONDS, simulated: true });
  }

  const auth = authenticate(req, config);

  if (method === 'GET' && path === '/v1/session') {
    return send(res, 200, { user_id: auth.userId, simulated: auth.simulated });
  }

  if (path === '/v1/organizations') {
    if (method === 'GET') {
      const rows = await runRead(config, auth.userId, async (c) => (await c.query(
        'select id, legal_name, country, status, created_at from public.organizations order by created_at, id',
      )).rows);
      return send(res, 200, { organizations: rows });
    }
    if (method === 'POST') {
      const body = await readJson(req);
      const legalName = requireString(body, 'legal_name');
      const country = requireString(body, 'country');
      const id = await runRead(config, auth.userId, async (c) => (await c.query(
        'select public.create_organization($1, $2) as id',
        [legalName, country],
      )).rows[0]?.id as string);
      return send(res, 201, { id });
    }
  }

  const detail = /^\/v1\/organizations\/([^/]+)$/.exec(path);
  if (detail && method === 'GET') {
    const id = detail[1] ?? '';
    if (!UUID.test(id)) return send(res, 404, { error: 'not_found' });
    const rows = await runRead(config, auth.userId, async (c) => (await c.query(
      'select id, legal_name, country, status, created_at from public.organizations where id = $1',
      [id],
    )).rows);
    if (rows.length === 0) return send(res, 404, { error: 'not_found' });
    return send(res, 200, { organization: rows[0] });
  }

  const members = /^\/v1\/organizations\/([^/]+)\/members$/.exec(path);
  if (members) {
    const orgId = members[1] ?? '';
    if (!UUID.test(orgId)) return send(res, 404, { error: 'not_found' });
    if (method === 'GET') {
      const rows = await runRead(config, auth.userId, async (c) => (await c.query(
        'select user_id, role, status, granted_at from public.organization_members where org_id = $1 order by granted_at, user_id',
        [orgId],
      )).rows);
      return send(res, 200, { members: rows });
    }
    if (method === 'POST') {
      const body = await readJson(req);
      const targetId = requireString(body, 'user_id');
      const role = requireRole(body);
      if (!UUID.test(targetId)) throw new HttpError(400, 'invalid_input');
      const id = await runWrite(config, auth.userId, 'member.invite', orgId, targetId, async (c) => (await c.query(
        'select public.invite_member($1, $2, $3) as id',
        [orgId, targetId, role],
      )).rows[0]?.id as string);
      return send(res, 201, { membership_id: id });
    }
  }

  const member = /^\/v1\/organizations\/([^/]+)\/members\/([^/]+)$/.exec(path);
  if (member) {
    const orgId = member[1] ?? '';
    const targetId = member[2] ?? '';
    if (!UUID.test(orgId) || !UUID.test(targetId)) return send(res, 404, { error: 'not_found' });
    if (method === 'PATCH') {
      const body = await readJson(req);
      const role = requireRole(body);
      await runWrite(config, auth.userId, 'member.role_change', orgId, targetId, (c) => c.query(
        'select public.change_member_role($1, $2, $3)',
        [orgId, targetId, role],
      ));
      return send(res, 200, { ok: true });
    }
    if (method === 'DELETE') {
      await runWrite(config, auth.userId, 'member.revoke', orgId, targetId, (c) => c.query(
        'select public.revoke_member($1, $2)',
        [orgId, targetId],
      ));
      return send(res, 200, { ok: true });
    }
  }

  return send(res, 404, { error: 'not_found' });
}

export function createHttpServer(config: AppConfig): Server {
  return createServer((req, res) => {
    handle(req, res, config).catch((error: unknown) => {
      if (error instanceof HttpError) return send(res, error.status, { error: error.code });
      return send(res, 500, { error: 'internal_error' });
    });
  });
}
