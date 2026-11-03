import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCAL_PORT,
  checkLocalDatabaseUrl,
  readLocalConfig,
  startLocalApi,
} from '../../services/api/src/local/start-local';
import { connect, testDatabaseUrl } from '../support/db';

// WO26-02: tệp khởi động API cục bộ. Các ràng buộc được kiểm ở mức hàm thuần, và một lần khởi động thật trên DB _test.
const SECRET = ['local', 'test', 'signing', 'material', 'for', 'the', 'local', 'start', 'file'].join('-');
const LOCAL_URL = 'postgres://tester@localhost:5432/aftervia_test';
const BASE_ENV = (): Record<string, string> => ({ AFTERVIA_LOCAL_DATABASE_URL: LOCAL_URL, AFTERVIA_LOCAL_JWT_SECRET: SECRET });

describe('WO26-02 local API start file: configuration and database checks', () => {
  it('reads AFTERVIA_LOCAL_* from the environment and defaults the port to 8787', () => {
    expect(DEFAULT_LOCAL_PORT).toBe(8787);
    expect(readLocalConfig(BASE_ENV())).toEqual({ ok: true, config: { databaseUrl: LOCAL_URL, jwtSecret: SECRET, port: 8787 } });
  });

  it('refuses a missing database URL, a missing JWT secret, and a JWT secret under 32 characters', () => {
    expect(readLocalConfig({ AFTERVIA_LOCAL_JWT_SECRET: SECRET })).toEqual({ ok: false, error: 'AFTERVIA_LOCAL_DATABASE_URL is not set' });
    expect(readLocalConfig({ AFTERVIA_LOCAL_DATABASE_URL: LOCAL_URL })).toEqual({ ok: false, error: 'AFTERVIA_LOCAL_JWT_SECRET is not set' });
    expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_JWT_SECRET: SECRET.slice(0, 31) })).toEqual({
      ok: false,
      error: 'AFTERVIA_LOCAL_JWT_SECRET must be at least 32 characters',
    });
    expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_JWT_SECRET: SECRET.slice(0, 32) }).ok).toBe(true);
  });

  it('refuses a port that is not a whole number from 1024 to 65535', () => {
    for (const port of ['80', '1023', '65536', '8787.5', 'abc', '-1']) {
      expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_PORT: port }).ok, port).toBe(false);
    }
    expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_PORT: '1024' }).ok).toBe(true);
    expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_PORT: '65535' }).ok).toBe(true);
  });

  it('refuses any AFTERVIA_LOCAL_APP_ENV setting, because the local API always runs in test mode', () => {
    for (const value of ['local', 'test', 'production', '']) {
      expect(readLocalConfig({ ...BASE_ENV(), AFTERVIA_LOCAL_APP_ENV: value })).toEqual({
        ok: false,
        error: 'AFTERVIA_LOCAL_APP_ENV must not be set: the local API always runs in test mode',
      });
    }
  });

  it('accepts only a database whose name ends with _test', () => {
    expect(checkLocalDatabaseUrl(LOCAL_URL)).toBeNull();
    for (const name of ['aftervia', 'aftervia_prod', 'aftervia_test_copy', 'postgres']) {
      expect(checkLocalDatabaseUrl(`postgres://tester@localhost:5432/${name}`)).toBe(
        `refusing to use database "${name}": its name must end with _test`,
      );
    }
    expect(checkLocalDatabaseUrl('postgres://tester@localhost:5432/')).toBe('refusing to use database "": its name must end with _test');
  });

  it('accepts only loopback hosts and Unix sockets, and refuses another host even in host or hostaddr', () => {
    const accepted = [
      'postgres://tester@localhost/aftervia_test',
      'postgres://tester@127.0.0.1:5432/aftervia_test',
      'postgres://tester@[::1]:5432/aftervia_test',
      'postgres:///aftervia_test?host=/var/run/postgresql',
      'postgres://tester@127.0.0.1/aftervia_test?hostaddr=127.0.0.1',
    ];
    for (const url of accepted) expect(checkLocalDatabaseUrl(url), url).toBeNull();
    const refused = [
      'postgres://tester@db.example.com:5432/aftervia_test',
      'postgres://tester@localhost/aftervia_test?host=db.example.com',
      'postgres://tester@localhost/aftervia_test?host=/var/run/postgresql,db.example.com',
      'postgres://tester@localhost/aftervia_test?hostaddr=10.0.0.5',
    ];
    for (const url of refused) expect(checkLocalDatabaseUrl(url), url).toMatch(/must point to this machine only/);
  });

  it('refuses another URL scheme, a dbname parameter, and a string that is not a URL', () => {
    expect(checkLocalDatabaseUrl('mysql://tester@localhost/aftervia_test')).toMatch(/must use the postgres:\/\/ or postgresql:\/\/ scheme/);
    expect(checkLocalDatabaseUrl('postgres://tester@localhost/aftervia?dbname=aftervia_test')).toMatch(/must not use a dbname parameter/);
    expect(checkLocalDatabaseUrl('not a url')).toMatch(/is not a valid URL/);
  });

  it('refuses to start on a refused URL before any pool is created', async () => {
    await expect(
      startLocalApi(
        { databaseUrl: 'postgres://tester@localhost/aftervia', jwtSecret: SECRET, port: 0 },
        {
          createPool: () => {
            throw new Error('a pool must not be created for a refused URL');
          },
        },
      ),
    ).rejects.toThrow('must end with _test');
  });

  it('refuses to serve when the connected database is not named *_test, and closes its pool', async () => {
    let ended = false;
    const fakePool = {
      query: async () => ({ rows: [{ name: 'aftervia' }] }),
      end: async () => {
        ended = true;
      },
    } as unknown as pg.Pool;
    await expect(
      startLocalApi({ databaseUrl: LOCAL_URL, jwtSecret: SECRET, port: 0 }, { createPool: () => fakePool }),
    ).rejects.toThrow('refusing to serve database "aftervia": its name must end with _test');
    expect(ended).toBe(true);
  });
});

describe('WO26-02 local API start file on the test database', () => {
  const SEEDED_USER = '00000000-0000-4000-8000-0000000000d1';
  let admin: pg.Client | null = null;

  beforeAll(async () => {
    admin = await connect();
    await admin.query('insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing', [
      SEEDED_USER,
      'local-start@test.invalid',
    ]);
  });

  afterAll(async () => {
    await admin?.query('delete from auth.users where id = $1', [SEEDED_USER]);
    await admin?.end();
  });

  it('listens on 127.0.0.1 only, answers /healthz, and signs in a seeded user in test mode', async () => {
    const parsed = readLocalConfig({ AFTERVIA_LOCAL_DATABASE_URL: testDatabaseUrl(), AFTERVIA_LOCAL_JWT_SECRET: SECRET });
    if (!parsed.ok) throw new Error(parsed.error);
    const api = await startLocalApi({ ...parsed.config, port: 0 });
    try {
      expect(api.address).toBe('127.0.0.1');
      const health = await fetch(`http://127.0.0.1:${api.port}/healthz`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ ok: true });
      const signIn = await fetch(`http://127.0.0.1:${api.port}/v1/dev/sign-in`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: SEEDED_USER }),
      });
      expect(signIn.status).toBe(200);
      const body = (await signIn.json()) as { simulated: boolean; access_token: string };
      expect(body.simulated).toBe(true);
      expect(body.access_token.split('.')).toHaveLength(3);
    } finally {
      await api.close();
    }
  });
});
