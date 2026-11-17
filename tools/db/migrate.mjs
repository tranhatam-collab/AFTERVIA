#!/usr/bin/env node
// Trình chạy migration cho PostgreSQL 16.
// An toàn: chỉ chạy trên cơ sở dữ liệu có tên kết thúc bằng `_test`.
// Mỗi migration chạy trong một transaction. Checksum được lưu để phát hiện sửa file sau khi đã áp dụng.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { assertLocalTestDatabase } from './db-target-guard.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..', '..');
export const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
export const SHIM_PATH = join(ROOT, 'tests', 'support', 'local-auth-shim.sql');
const FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/;

// Một bộ luật duy nhất cho mọi công cụ chạm vào cơ sở dữ liệu (D-07, A-10, D-11).
export { databaseNameOf } from './db-target-guard.mjs';

export function assertTestDatabase(url) {
  return assertLocalTestDatabase(url);
}

export function checksumOf(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function listMigrations(dir = MIGRATIONS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => FILE_PATTERN.test(f))
    .sort()
    .map((f) => ({ version: f.replace(/\.sql$/, ''), file: join(dir, f) }));
}

export async function applyShim(client) {
  await client.query(readFileSync(SHIM_PATH, 'utf8'));
}

export async function applyMigrations(client, dir = MIGRATIONS_DIR) {
  await client.query('create schema if not exists aftervia_meta');
  await client.query(`create table if not exists aftervia_meta.schema_migrations (
    version text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
  const applied = [];
  const skipped = [];
  for (const migration of listMigrations(dir)) {
    const sql = readFileSync(migration.file, 'utf8');
    const sum = checksumOf(sql);
    const seen = await client.query('select checksum from aftervia_meta.schema_migrations where version = $1', [migration.version]);
    if (seen.rows.length > 0) {
      if (seen.rows[0].checksum !== sum) {
        throw new Error(`migration ${migration.version} changed after it was applied; create a new migration instead`);
      }
      skipped.push(migration.version);
      continue;
    }
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into aftervia_meta.schema_migrations (version, checksum) values ($1, $2)', [migration.version, sum]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw new Error(`migration ${migration.version} failed: ${error.message}`);
    }
    applied.push(migration.version);
  }
  return { applied, skipped };
}

async function main(argv) {
  const url = process.env.TEST_DATABASE_URL;
  const name = assertTestDatabase(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (argv.includes('--with-shim')) await applyShim(client);
    const result = await applyMigrations(client);
    console.log(`migrate OK on ${name}: applied ${result.applied.length}, already applied ${result.skipped.length}`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
