import pg from 'pg';

pg.types.setTypeParser(1082, (value: string) => value);
import { applyMigrations, applyShim, assertTestDatabase } from '../../tools/db/migrate.mjs';

// Database-backed tests never skip. A missing URL is a failure, so no PASS can come from silence.
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required; database tests are never skipped');
  assertTestDatabase(url);
  return url;
}

export async function connect(url: string = testDatabaseUrl()): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

// Drops and rebuilds the public and auth schemas on the test database, then applies the shim and all migrations.
export async function resetTestDatabase(url: string = testDatabaseUrl()): Promise<void> {
  assertTestDatabase(url);
  const client = await connect(url);
  try {
    await client.query('drop schema if exists public cascade');
    await client.query('drop schema if exists auth cascade');
    await client.query('drop schema if exists aftervia_meta cascade');
    await client.query('create schema public');
    await applyShim(client);
    await applyMigrations(client);
  } finally {
    await client.end();
  }
}

// Runs a block as an authenticated user (or anon when userId is null) in one transaction.
// Commits on success, rolls back on error. Mirrors how PostgREST sets claims per request.
export async function asActor<T>(userId: string | null, run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = await connect();
  try {
    await client.query('begin');
    // Một JWT thật luôn có iat. Hàm chỉ máy chủ gọi được có thể đòi phiên còn mới (ví dụ xóa tài khoản),
    // nên actor kiểm thử phải mang iat giống PostgREST, nếu không bộ test không phản ánh đúng thực tế.
    const claims = userId ? { sub: userId, role: 'authenticated', iat: Math.floor(Date.now() / 1000) } : { role: 'anon' };
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await client.query(`set local role ${userId ? 'authenticated' : 'anon'}`);
    try {
      const result = await run(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  } finally {
    await client.end();
  }
}
