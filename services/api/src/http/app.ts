// API HTTP mỏng cho lát cắt P0 (WO04-04). Dùng node:http, không có thư viện phụ thuộc.
// Đăng nhập chỉ là GIẢ LẬP ở môi trường local/test (DEC-ENG-11). Mọi lỗi trả về mã chung, không lộ sự tồn tại của tổ chức.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type pg from 'pg';
import { normalizeItemFields, normalizeUploadTicket, type ItemFields } from '@aftervia/domain';
import { signHs256, verifyHs256 } from '../auth/jwt';
import { recordDenial, withUser } from '../db/session';
import { randomBytes, randomUUID } from 'node:crypto';
import { CASE_STATES, RESOLUTION_OUTCOMES } from '@aftervia/domain';
import { matchContract, type ContractMatch } from './contract';
import { logEvent } from '../observability/log';
import { buildExportBundle, sha256Hex, type ExportItem, type GrantedDocument } from '../export/bundle';

export interface AppConfig {
  pool: pg.Pool;
  jwtSecret: string;
  appEnv: string;
}

const DEV_ENVS = new Set(['local', 'test']);
const MAX_BODY_BYTES = 16 * 1024;
// Thời hạn phiên 15 phút (Q3, phương án C). Yêu cầu xóa tài khoản chỉ nhận phiên phát trong DELETION_REAUTH_SECONDS gần nhất.
const TOKEN_TTL_SECONDS = 900;
const DELETION_REAUTH_SECONDS = 300;
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

// Mốc cắt phiên: lần yêu cầu xóa tài khoản sớm nhất của người dùng, đọc qua RLS (người dùng chỉ thấy dòng của mình).
// Sau mốc đó, phiên phát trước hoặc đúng thời điểm đó, và phiên thiếu iat, bị từ chối ở mọi route.
async function deletionCutoff(pool: pg.Pool, userId: string): Promise<number | null> {
  return withUser(pool, userId, async (c) => {
    const row = (await c.query('select extract(epoch from min(requested_at))::bigint as cutoff from public.account_deletion_requests')).rows[0];
    return row?.cutoff === null || row?.cutoff === undefined ? null : Number(row.cutoff);
  });
}

async function authenticateSession(req: IncomingMessage, config: AppConfig): Promise<{ userId: string; simulated: boolean; issuedAt: number | null }> {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!match || !match[1]) throw new HttpError(401, 'unauthenticated');
  const result = verifyHs256(match[1], config.jwtSecret);
  if (!result.ok) throw new HttpError(401, 'unauthenticated');
  const { sub, iat } = result.claims;
  const cutoff = await deletionCutoff(config.pool, sub);
  if (cutoff !== null && (typeof iat !== 'number' || iat <= cutoff)) throw new HttpError(401, 'unauthenticated');
  return { userId: sub, simulated: result.claims.simulated === true, issuedAt: typeof iat === 'number' ? iat : null };
}

// Yêu cầu xóa tài khoản chỉ nhận phiên phát trong DELETION_REAUTH_SECONDS gần nhất. Phiên thiếu iat bị từ chối.
function issuedRecently(issuedAt: number | null): boolean {
  return issuedAt !== null && Math.floor(Date.now() / 1000) - issuedAt <= DELETION_REAUTH_SECONDS;
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
    case '40001':
      return new HttpError(409, 'version_conflict');
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

  const contract = matchContract(method, path);
  if (contract && contract.route.implementedBy !== 'legacy') return handleContract(req, res, config, contract);

  const auth = await authenticateSession(req, config);

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

  if (path === '/v1/items') {
    if (method === 'GET') {
      const rows = await runRead(config, auth.userId, async (c) => (await c.query(
        'select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at, id',
      )).rows);
      return send(res, 200, { items: rows });
    }
    if (method === 'POST') {
      // Không có khóa: giữ hành vi cũ. Có khóa (8–128 ký tự): khử trùng ở máy chủ; gửi lại cùng nội dung trả cùng id.
      const key = req.headers['idempotency-key'] === undefined ? null : idempotencyKey(req);
      const body = await readJson(req);
      const parsed = normalizeItemFields(body);
      if (!parsed.ok) throw new HttpError(400, 'invalid_input');
      const f = parsed.value;
      try {
        if (key === null) {
          const id = await runRead(config, auth.userId, async (c) => (await c.query(
            'select public.create_item($1, $2, $3, $4, $5) as id',
            [f.title, f.brand, f.model, f.purchasedOn, f.currency],
          )).rows[0]?.id as string);
          return send(res, 201, { id });
        }
        const row = await withUser(config.pool, auth.userId, async (c) => (await c.query(
          'select out_item_id from public.create_item_keyed($1, $2, $3, $4, $5, $6)',
          [key, f.title, f.brand, f.model, f.purchasedOn, f.currency],
        )).rows[0]);
        return send(res, 201, { id: row?.out_item_id as string });
      } catch (error) {
        // Cùng khóa nhưng khác nội dung: 409. Các lỗi khác đi tiếp như cũ.
        if ((error as { code?: string }).code === '23505') throw new HttpError(409, 'conflict');
        throw error;
      }
    }
  }

  const item = /^\/v1\/items\/([^/]+)$/.exec(path);
  if (item) {
    const itemId = item[1] ?? '';
    if (!UUID.test(itemId)) return send(res, 404, { error: 'not_found' });
    if (method === 'GET') {
      const rows = await runRead(config, auth.userId, async (c) => (await c.query(
        'select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items where id = $1',
        [itemId],
      )).rows);
      if (rows.length === 0) return send(res, 404, { error: 'not_found' });
      return send(res, 200, { item: rows[0] });
    }
    if (method === 'PATCH') {
      const body = await readJson(req);
      const expected = body.version;
      if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 1) throw new HttpError(400, 'invalid_input');
      const version = await runRead(config, auth.userId, async (c) => {
        const current = (await c.query(
          'select title, brand, model, purchased_on, currency from public.items where id = $1',
          [itemId],
        )).rows[0];
        if (!current) throw new HttpError(404, 'not_found');
        const base: ItemFields = {
          title: current.title as string,
          brand: (current.brand as string | null) ?? null,
          model: (current.model as string | null) ?? null,
          purchasedOn: (current.purchased_on as string | null) ?? null,
          currency: (current.currency as string | null)?.trim() ?? null,
        };
        const merged = normalizeItemFields(body, base);
        if (!merged.ok) throw new HttpError(400, 'invalid_input');
        const f = merged.value;
        const result = await c.query(
          'select public.update_item($1, $2, $3, $4, $5, $6, $7) as version',
          [itemId, expected, f.title, f.brand, f.model, f.purchasedOn, f.currency],
        );
        return result.rows[0]?.version as number;
      });
      return send(res, 200, { version });
    }
  }

  if (path === '/v1/documents' || path === '/v1/documents/upload-ticket') {
    if (method === 'GET' && path === '/v1/documents') {
      const rows = await runRead(config, auth.userId, async (c) => (await c.query(
        'select id, declared_mime, size_bytes, scan_status, created_at, updated_at from public.documents order by created_at, id',
      )).rows);
      return send(res, 200, { documents: rows });
    }
    if (method === 'POST') {
      const body = await readJson(req);
      const parsed = normalizeUploadTicket(body);
      if (!parsed.ok) throw new HttpError(400, 'invalid_input');
      const ticket = await runRead(config, auth.userId, async (c) => (await c.query(
        'select out_document_id, out_ticket_id, out_expires_at from public.create_upload_ticket($1, $2)',
        [parsed.value.declaredMime, parsed.value.sizeBytes],
      )).rows[0]);
      return send(res, 201, {
        document_id: ticket.out_document_id,
        ticket_id: ticket.out_ticket_id,
        expires_at: ticket.out_expires_at,
      });
    }
  }

  const document = /^\/v1\/documents\/([^/]+)$/.exec(path);
  if (document && method === 'GET') {
    const docId = document[1] ?? '';
    if (!UUID.test(docId)) return send(res, 404, { error: 'not_found' });
    const rows = await runRead(config, auth.userId, async (c) => (await c.query(
      'select id, declared_mime, size_bytes, scan_status, created_at, updated_at from public.documents where id = $1',
      [docId],
    )).rows);
    if (rows.length === 0) return send(res, 404, { error: 'not_found' });
    return send(res, 200, { document: rows[0] });
  }

  return send(res, 404, { error: 'route_not_found' });
}

// Thao tác theo hợp đồng (WO09-03). Lỗi dùng đúng hình dạng Error của hợp đồng: { code, message, request_id }.
const CONTRACT_MESSAGES: Record<string, string> = {
  unauthenticated: 'Authentication is required.',
  forbidden: 'You do not have permission for this action.',
  not_found: 'Not found.',
  conflict: 'The request conflicts with an existing record.',
  version_conflict: 'The record was changed by someone else. Reload and try again.',
  invalid_state: 'This action is not allowed in the current state.',
  invalid_input: 'The request is invalid.',
  not_implemented: 'This operation is not available yet.',
  internal_error: 'An internal error occurred.',
};
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function sendContractError(res: ServerResponse, status: number, code: string, requestId: string): void {
  const key = code in CONTRACT_MESSAGES ? code : status >= 500 ? 'internal_error' : 'invalid_input';
  send(res, status, { code: key, message: CONTRACT_MESSAGES[key], request_id: requestId });
}

// Đổi lỗi cơ sở dữ liệu thành mã của hợp đồng. Không tiết lộ đối tượng: thiếu quyền và không tồn tại cho cùng 404.
function contractDbError(error: unknown): { status: number; code: string } | null {
  switch ((error as { code?: string }).code) {
    case '42501':
      return { status: 403, code: 'forbidden' };
    case 'P0002':
      return { status: 404, code: 'not_found' };
    case '23505':
      return { status: 409, code: 'conflict' };
    case '40001':
      return { status: 409, code: 'version_conflict' };
    case '55000':
      return { status: 409, code: 'invalid_state' };
    case '22023':
    case '22P02':
    case '23514':
      return { status: 400, code: 'invalid_input' };
    default:
      return null;
  }
}

function contractUuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new HttpError(400, 'invalid_input');
  return value;
}

// Tham số đường dẫn sai định dạng được coi là không tìm thấy, như mọi đối tượng khác.
function pathUuid(value: string): string {
  if (!UUID.test(value)) throw new HttpError(404, 'not_found');
  return value;
}

function contractBody(body: Record<string, unknown>, required: string[], optional: string[]): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(body)) if (!allowed.has(key)) throw new HttpError(400, 'invalid_input');
  for (const key of required) if (!(key in body)) throw new HttpError(400, 'invalid_input');
}

function idempotencyKey(req: IncomingMessage): string {
  const value = req.headers['idempotency-key'];
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) throw new HttpError(400, 'invalid_input');
  return value;
}

function boundedText(value: unknown, max: number): string {
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_input');
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) throw new HttpError(400, 'invalid_input');
  return trimmed;
}

function uuidList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 20) throw new HttpError(400, 'invalid_input');
  return value.map((item) => contractUuid(item));
}

function dateTime(value: unknown): string {
  if (typeof value !== 'string' || !DATE_TIME.test(value) || Number.isNaN(Date.parse(value))) throw new HttpError(400, 'invalid_input');
  return value;
}

async function caseSummary(client: pg.PoolClient, caseId: string): Promise<Record<string, unknown>> {
  const row = (await client.query('select id, status, version, outcome from public.cases where id = $1', [caseId])).rows[0];
  if (!row) throw new HttpError(404, 'not_found');
  return { id: row.id, status: row.status, version: row.version, outcome: row.outcome };
}

async function runContract(req: IncomingMessage, config: AppConfig, userId: string, match: ContractMatch): Promise<unknown> {
  const { params, route } = match;
  switch (route.operationId) {
    case 'createCase': {
      const key = idempotencyKey(req);
      const body = await readJson(req);
      contractBody(body, ['item_id', 'organization_id', 'description', 'shared_document_ids'], []);
      const itemId = contractUuid(body.item_id);
      const orgId = contractUuid(body.organization_id);
      const description = boundedText(body.description, 4000);
      // Giới hạn lý do của cơ sở dữ liệu là 500 ký tự; hợp đồng cho phép 4000. Sai khác được ghi trong evidence.
      if (description.length > 500) throw new HttpError(400, 'invalid_input');
      const shared = uuidList(body.shared_document_ids);
      return withUser(config.pool, userId, async (c) => {
        const created = (await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [
          itemId,
          orgId,
          description,
          key,
        ])).rows[0];
        const caseId = created?.out_case_id as string;
        for (const doc of shared) await c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseId, doc]);
        return caseSummary(c, caseId);
      });
    }
    case 'getCase': {
      const caseId = pathUuid(params.case_id ?? '');
      return withUser(config.pool, userId, (c) => caseSummary(c, caseId));
    }
    case 'transitionCase': {
      const caseId = pathUuid(params.case_id ?? '');
      const key = idempotencyKey(req);
      const body = await readJson(req);
      contractBody(body, ['next_state', 'reason', 'expected_version'], ['evidence_document_ids', 'outcome']);
      const next = body.next_state;
      if (typeof next !== 'string' || !(CASE_STATES as readonly string[]).includes(next)) throw new HttpError(400, 'invalid_input');
      const reason = boundedText(body.reason, 500);
      const expected = body.expected_version;
      if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 1) throw new HttpError(400, 'invalid_input');
      const evidence = body.evidence_document_ids === undefined ? [] : uuidList(body.evidence_document_ids);
      // Trường outcome không có trong docs/spec/.../03_API_CONTRACT.openapi.yaml (bundle gốc, chỉ đọc, có checksum);
      // đây là mở rộng thêm trường tùy chọn, không đổi operationId/method/path đã có trong hợp đồng gốc.
      // Xem docs/plan/evidence/WO25-01.md. DB (transition_case) đòi outcome khác null khi next_state là resolved/closed.
      let outcome: string | null = null;
      if (body.outcome !== undefined) {
        if (typeof body.outcome !== 'string' || !(RESOLUTION_OUTCOMES as readonly string[]).includes(body.outcome)) {
          throw new HttpError(400, 'invalid_input');
        }
        outcome = body.outcome;
      }
      return withUser(config.pool, userId, async (c) => {
        for (const doc of evidence) await c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseId, doc]);
        const row = (await c.query(
          'select out_version, out_status, out_outcome from public.transition_case($1::uuid, $2::text, $3::integer, $4::text, $5::text, $6::text)',
          [caseId, next, expected, reason, key, outcome],
        )).rows[0];
        return { id: caseId, status: row?.out_status, version: row?.out_version, outcome: row?.out_outcome ?? null };
      });
    }
    case 'grantDocument': {
      const caseId = pathUuid(params.case_id ?? '');
      const key = idempotencyKey(req);
      const body = await readJson(req);
      contractBody(body, ['document_id', 'recipient_id', 'expires_at', 'can_download'], []);
      const doc = contractUuid(body.document_id);
      const recipient = contractUuid(body.recipient_id);
      const expires = dateTime(body.expires_at);
      const canDownload = body.can_download;
      if (typeof canDownload !== 'boolean') throw new HttpError(400, 'invalid_input');
      return withUser(config.pool, userId, async (c) => {
        // Khóa lặp: gửi lại cùng nội dung trả grant cũ với trạng thái hiện tại; khác nội dung thì 409 (23505 → conflict).
        const row = (await c.query(
          'select out_grant_id, out_status from public.grant_case_document_keyed($1, $2::uuid, $3::uuid, $4::uuid, $5::boolean, $6::timestamptz)',
          [key, caseId, doc, recipient, canDownload, expires],
        )).rows[0];
        return { id: row?.out_grant_id as string, status: row?.out_status as string };
      });
    }
    case 'revokeGrant': {
      const caseId = pathUuid(params.case_id ?? '');
      const grantId = pathUuid(params.grant_id ?? '');
      return withUser(config.pool, userId, async (c) => {
        // Grant phải thuộc đúng case trong đường dẫn. Không thuộc, hoặc không thấy được, đều là 404.
        const found = await c.query('select id from public.case_document_grants where id = $1 and case_id = $2', [grantId, caseId]);
        if (found.rowCount === 0) throw new HttpError(404, 'not_found');
        await c.query('select public.revoke_case_document_grant($1::uuid)', [grantId]);
        return { id: grantId, status: 'revoked' };
      });
    }
    case 'requestDeletion': {
      // Xóa tài khoản: chỉ người đã đăng nhập, cho chính mình. Lặp cùng mã trả cùng receipt (hàm SQL xử lý).
      const body = await readJson(req);
      contractBody(body, ['request_id'], []);
      const requestId = boundedText(body.request_id, 128);
      return withUser(config.pool, userId, async (c) => (await c.query('select public.request_account_deletion($1::text) as receipt', [requestId])).rows[0]?.receipt);
    }
    case 'createExport': {
      // Xuất gói: chỉ món đồ của người gọi và tài liệu có grant còn hiệu lực. store_export kiểm phạm vi và băm khi lưu.
      // Mã truy cập của gói chỉ được băm và lưu. Thao tác tải gói chưa có trong đặc tả nên mã không được trả ra ngoài.
      const key = idempotencyKey(req);
      contractBody(await readJson(req), [], []);
      return withUser(config.pool, userId, async (c) => {
        const itemRows = (
          await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at, id')
        ).rows;
        const grantRows = (
          await c.query(
            'select out_grant_id, out_case_id, out_document_id, out_declared_mime, out_size_bytes, out_scan_status, out_can_download, out_expires_at from public.export_granted_documents()',
          )
        ).rows;
        const items: ExportItem[] = itemRows.map((r) => ({
          id: r.id as string,
          title: r.title as string,
          brand: (r.brand as string | null) ?? null,
          model: (r.model as string | null) ?? null,
          purchased_on: (r.purchased_on as string | null) ?? null,
          currency: (r.currency as string | null)?.trim() ?? null,
          version: Number(r.version),
          created_at: new Date(r.created_at as Date).toISOString(),
          updated_at: new Date(r.updated_at as Date).toISOString(),
        }));
        const grants: GrantedDocument[] = grantRows.map((r) => ({
          grant_id: r.out_grant_id as string,
          case_id: r.out_case_id as string,
          document_id: r.out_document_id as string,
          declared_mime: r.out_declared_mime as string,
          size_bytes: Number(r.out_size_bytes),
          scan_status: r.out_scan_status as string,
          can_download: r.out_can_download as boolean,
          expires_at: new Date(r.out_expires_at as Date).toISOString(),
        }));
        const bundle = buildExportBundle({ items, grants, exportedAt: new Date().toISOString() });
        const accessHash = sha256Hex(randomBytes(32).toString('hex'));
        const stored = (
          await c.query('select out_job_id from public.store_export($1::text, $2::text, $3::jsonb)', [key, accessHash, JSON.stringify(bundle)])
        ).rows[0];
        return { id: stored?.out_job_id as string, status: 'succeeded' };
      });
    }
    case 'getJob': {
      const jobId = pathUuid(params.job_id ?? '');
      return withUser(config.pool, userId, async (c) => {
        const row = (await c.query('select id from public.export_jobs where id = $1::uuid', [jobId])).rows[0];
        if (!row) throw new HttpError(404, 'not_found');
        return { id: row.id as string, status: 'succeeded' };
      });
    }
    case 'extractDocument':
    case 'reviewExtraction':
      throw new HttpError(501, 'not_implemented');
    default:
      throw new HttpError(404, 'not_found');
  }
}

async function handleContract(req: IncomingMessage, res: ServerResponse, config: AppConfig, match: ContractMatch): Promise<void> {
  const requestId = randomUUID();
  res.setHeader('x-request-id', requestId);
  let session: { userId: string; issuedAt: number | null };
  try {
    session = await authenticateSession(req, config);
  } catch {
    return sendContractError(res, 401, 'unauthenticated', requestId);
  }
  // Xóa tài khoản là thao tác nhạy cảm: phải có phiên phát trong 5 phút gần nhất (xác thực lại trước khi xóa, Q3-C).
  if (match.route.operationId === 'requestDeletion' && !issuedRecently(session.issuedAt)) {
    return sendContractError(res, 401, 'unauthenticated', requestId);
  }
  try {
    return send(res, 200, await runContract(req, config, session.userId, match));
  } catch (error) {
    if (error instanceof HttpError) return sendContractError(res, error.status, error.code, requestId);
    const mapped = contractDbError(error);
    if (mapped) return sendContractError(res, mapped.status, mapped.code, requestId);
    logEvent('request.internal_error', { request_id: requestId, error_class: error instanceof Error ? error.name : 'unknown' });
    return sendContractError(res, 500, 'internal_error', requestId);
  }
}

export function createHttpServer(config: AppConfig): Server {
  return createServer((req, res) => {
    handle(req, res, config).catch((error: unknown) => {
      if (error instanceof HttpError) return send(res, error.status, { error: error.code });
      logEvent('request.internal_error', { error_class: error instanceof Error ? error.name : 'unknown' });
      return send(res, 500, { error: 'internal_error' });
    });
  });
}
