import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signHs256 } from '../../services/api/src/auth/jwt';
import { createHttpServer } from '../../services/api/src/http/app';
import { createPool } from '../../services/api/src/db/session';
import { connect, resetTestDatabase } from '../support/db';

// D-09 (kiểm toán 10/11), mức HTTP: một token ký đúng khóa nhưng thiếu iss/aud không được coi là phiên.
// Hôm nay mọi token ký đúng khóa đều được nhận. Test này đỏ cho đến khi máy chủ kiểm iss và aud.
const SECRET = ['issuer', 'test', 'signing', 'material', '0001'].join('-');
const ISSUER = 'aftervia-local';
const AUDIENCE = 'authenticated';
const USER = '00000000-0000-4000-8000-0000000000d1';

let server: Server;
let pool: pg.Pool;
let base = '';

async function get(token: string | null): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${base}/v1/items`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function decodePayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

beforeAll(async () => {
  await resetTestDatabase();
  const admin = await connect();
  try {
    await admin.query('insert into auth.users (id, email) values ($1, $2)', [USER, 'issuer-http@test.invalid']);
  } finally {
    await admin.end();
  }
  pool = createPool(process.env.TEST_DATABASE_URL ?? '');
  server = createHttpServer({ pool, jwtSecret: SECRET, appEnv: 'test' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool?.end();
});

describe('D-09 the server accepts only tokens that name its issuer and audience', () => {
  it('D-09 a validly signed token with no issuer or audience is refused as a session', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256({ sub: USER, role: 'authenticated', iat: now, exp: now + 900 }, SECRET);
    expect((await get(token)).status).toBe(401);
  });

  it('D-09 a token from another issuer is refused even though the signature is correct', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256({ sub: USER, role: 'authenticated', iat: now, exp: now + 900, iss: 'other', aud: AUDIENCE }, SECRET);
    expect((await get(token)).status).toBe(401);
  });

  it('D-09 a token for the wrong audience is refused', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256({ sub: USER, role: 'authenticated', iat: now, exp: now + 900, iss: ISSUER, aud: 'anon' }, SECRET);
    expect((await get(token)).status).toBe(401);
  });

  it('D-09 a token with the right issuer and audience is accepted', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signHs256({ sub: USER, role: 'authenticated', iat: now, exp: now + 900, iss: ISSUER, aud: AUDIENCE }, SECRET);
    expect((await get(token)).status).toBe(200);
  });

  it('D-09 the dev sign-in endpoint issues tokens that carry the issuer and audience', async () => {
    const res = await fetch(`${base}/v1/dev/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: USER }),
    });
    const body = (await res.json()) as { access_token: string };
    expect(res.status).toBe(200);
    expect(decodePayload(body.access_token)).toMatchObject({ iss: ISSUER, aud: AUDIENCE, sub: USER });
  });
});
