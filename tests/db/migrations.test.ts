import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations, assertTestDatabase } from '../../tools/db/migrate.mjs';
import { connect, resetTestDatabase } from '../support/db';

describe('T03 migration state is durable and guarded', () => {
  beforeAll(async () => {
    await resetTestDatabase();
  });

  it('T03 applied migrations are recorded and visible from a new connection', async () => {
    const first = await connect();
    const before = await first.query('select version, checksum from aftervia_meta.schema_migrations order by version');
    await first.end();

    const second = await connect();
    const after = await second.query('select version, checksum from aftervia_meta.schema_migrations order by version');
    await second.end();

    expect(after.rows.map((r) => r.version)).toContain('0000_baseline');
    expect(after.rows).toEqual(before.rows);
  });

  it('T03 running the migrations again applies nothing', async () => {
    const client = await connect();
    try {
      const result = await applyMigrations(client);
      expect(result.applied).toEqual([]);
      expect(result.skipped).toContain('0000_baseline');
    } finally {
      await client.end();
    }
  });

  it('T03 a migration edited after it was applied is refused', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aftervia-migrations-'));
    const file = join(dir, '0001_probe.sql');
    writeFileSync(file, 'select 1;');
    const client = await connect();
    try {
      await applyMigrations(client, dir);
      writeFileSync(file, 'select 2;');
      await expect(applyMigrations(client, dir)).rejects.toThrow(/changed after it was applied/);
    } finally {
      await client.end();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('T03 refuses any database whose name does not end with _test', () => {
    expect(() => assertTestDatabase('postgres://user:pw@127.0.0.1:5432/aftervia_dev')).toThrow(/must end with _test/);
    expect(() => assertTestDatabase('postgres://user:pw@127.0.0.1:5432/aftervia_test')).not.toThrow();
  });

  it('T03 refuses a test-named database on a remote host, and accepts the local ones', () => {
    expect(() => assertTestDatabase('postgres://user:pw@db.example.com:5432/aftervia_test')).toThrow(/only localhost/);
    expect(() => assertTestDatabase('postgres://user:pw@localhost:5432/aftervia_test')).not.toThrow();
    expect(() => assertTestDatabase('postgres://user:pw@[::1]:5432/aftervia_test')).not.toThrow();
  });

  it('T03 the reset helper refuses a non-test database before opening a connection', async () => {
    await expect(resetTestDatabase('postgres://user:pw@127.0.0.1:1/aftervia_dev')).rejects.toThrow(/must end with _test/);
  });
});
