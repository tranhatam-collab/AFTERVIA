import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../services/api/src/db/session';
import { createHttpServer } from '../../services/api/src/http/app';
import { MIN_JWT_SECRET_LENGTH, signHs256, signLocalSession, verifyHs256 } from '../../services/api/src/auth/jwt';
import { asActor, connect, resetTestDatabase } from '../support/db';
import { AFTER_CUTOFF_SECONDS, SESSION_TTL_SECONDS, sessionAfterCutoff } from '../support/session-fixtures';

// OWN-A-08 (audit 10/11, D-08 and D-09). Error mapping on the legacy path and the gaps in the JWT verifier.
const SECRET = ['local', 'test', 'signing', 'material', 'own', 'a', '08'].join('-');
const PENDING = '00000000-0000-4000-8000-0000000008a1';
const CLEAN = '00000000-0000-4000-8000-0000000008a2';
const NOW = 1_800_000_000;

interface Harness {
  server: Server;
  pool: pg.Pool;
  url: string;
}

async function startHarness(): Promise<Harness> {
  const pool = createPool(process.env.TEST_DATABASE_URL ?? '');
  const server = createHttpServer({ pool, jwtSecret: SECRET, appEnv: 'test' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, pool, url: `http://127.0.0.1:${port}` };
}

async function api(url: string, method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

describe('OWN-A-08 the JWT verifier closes its gaps (D-09)', () => {
  it('a token whose nbf is in the future is refused', () => {
    const token = signHs256({ sub: 'u', exp: NOW + 600, nbf: NOW + 600 }, SECRET);
    expect(verifyHs256(token, SECRET, NOW)).toEqual({ ok: false, reason: 'not_yet_valid' });
  });

  it('a token whose iat is in the future is refused', () => {
    const token = signHs256({ sub: 'u', iat: NOW + 600, exp: NOW + 1200 }, SECRET);
    expect(verifyHs256(token, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_iat' });
  });

  it('a lifetime over the cap is refused when the caller sets one, and accepted when it does not', () => {
    const token = signHs256({ sub: 'u', iat: NOW, exp: NOW + 4000 }, SECRET);
    expect(verifyHs256(token, SECRET, NOW, { maxLifetimeSeconds: 900 })).toEqual({ ok: false, reason: 'lifetime_too_long' });
    expect(verifyHs256(token, SECRET, NOW)).toMatchObject({ ok: true });
  });

  it('a lifetime exactly at the cap is accepted, so the bound is inclusive', () => {
    const token = signHs256({ sub: 'u', iat: NOW, exp: NOW + 900 }, SECRET);
    expect(verifyHs256(token, SECRET, NOW, { maxLifetimeSeconds: 900 })).toMatchObject({ ok: true });
  });

  it('a small clock skew on nbf and iat is tolerated', () => {
    const token = signHs256({ sub: 'u', iat: NOW + 30, nbf: NOW + 30, exp: NOW + 600 }, SECRET);
    expect(verifyHs256(token, SECRET, NOW)).toMatchObject({ ok: true });
  });

  it('the offset used after a deletion cutoff stays inside the clock-skew tolerance', () => {
    // Raising this past the 60-second tolerance in verifyHs256 turns every such token into a future-dated
    // one whenever the Postgres clock runs ahead of the runner, which is the normal case on CI.
    expect(AFTER_CUTOFF_SECONDS).toBeLessThan(60);
    expect(SESSION_TTL_SECONDS).toBe(900);
  });

  it('a server cannot be built with a short signing key', () => {
    const pool = createPool(process.env.TEST_DATABASE_URL ?? '');
    try {
      expect(() => createHttpServer({ pool, jwtSecret: 'too-short', appEnv: 'test' })).toThrow(/at least 32 characters/);
      expect(MIN_JWT_SECRET_LENGTH).toBe(32);
    } finally {
      void pool.end();
    }
  });
});

describe('OWN-A-08 error mapping on the legacy path (D-08)', () => {
  let h: Harness;

  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1,$2),($3,$4)', [
        PENDING, 'pending-map@test.invalid',
        CLEAN, 'clean-map@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    // The account asks to be deleted, so later writes hit the guard from 0018 and raise 55000.
    await asActor(PENDING, (c) => c.query('select public.request_account_deletion($1::text)', ['req-map-pending-01']));
    h = await startHarness();
  });

  afterAll(async () => {
    h.server.closeAllConnections();
    await new Promise<void>((resolve) => h.server.close(() => resolve()));
    await h.pool.end();
  });

  it('D-08 a write refused because the account is pending deletion answers 409, not 500', async () => {
    // The session must be issued after the deletion request, or authenticateSession refuses it on every route.
    const admin = await connect();
    let cutoff: number;
    try {
      const { rows } = await admin.query('select extract(epoch from min(requested_at))::bigint as cutoff from public.account_deletion_requests');
      cutoff = Number(rows[0]?.cutoff);
    } finally {
      await admin.end();
    }
    const token = sessionAfterCutoff(PENDING, cutoff, SECRET);
    const created = await api(h.url, 'POST', '/v1/items', token, { title: 'Lò nướng' });
    expect(created.status).toBe(409);
    expect(created.json).toMatchObject({ error: 'invalid_state' });
  });

  it('D-08 a path with a malformed percent escape answers 404, not 500', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signLocalSession({ sub: CLEAN, role: 'authenticated', iat: now, exp: now + 900, simulated: true }, SECRET);
    const bad = await api(h.url, 'GET', '/v1/items/%E0%A4%A', token);
    expect(bad.status).toBe(404);
    expect(bad.status).not.toBe(500);
  });
});
