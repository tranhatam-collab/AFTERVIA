import pg from 'pg';
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
