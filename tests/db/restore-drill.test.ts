import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase, testDatabaseUrl } from '../support/db';
import { adminUrlFor, dropRestoreDatabase, restoreUrlFor, runDrill, tamperRestored } from '../../tools/db/restore-drill.mjs';

// WO16-01a: diễn tập khôi phục DB cục bộ. Dữ liệu tổng hợp, chỉ trên DB _test; không có object storage, RPO/RTO thật hay staging.
const ALICE = '00000000-0000-4000-8000-0000000000a1';
const BOB = '00000000-0000-4000-8000-0000000000b1';
const USERS = [
  { label: 'alice', userId: ALICE },
  { label: 'bob', userId: BOB },
  { label: 'anon', userId: null },
];

let result: any = null;
let workDir = '';

const itemsRows = (fp: any) => fp.tables.find((t: { table: string }) => t.table === 'public.items');
const otherTables = (fp: any) => fp.tables.filter((t: { table: string }) => t.table !== 'public.items');

describe('WO16-01a local restore drill: logical backup, isolated restore, and comparison', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ALICE, 'alice@drill.test.invalid', BOB, 'bob@drill.test.invalid']);
    } finally {
      await admin.end();
    }
    await asActor(ALICE, (c) => c.query("select public.create_item('Máy hút bụi', 'Hãng X', 'M1', '2026-03-04', 'VND')"));
    await asActor(ALICE, (c) => c.query("select public.create_item('Máy pha cà phê', 'Hãng Y', 'M2', null, 'VND')"));
    await asActor(BOB, (c) => c.query("select public.create_item('Đèn bàn', null, null, null, 'VND')"));
    workDir = await mkdtemp(join(tmpdir(), 'aftervia-drill-'));
    result = await runDrill(testDatabaseUrl(), workDir, USERS);
  });

  afterAll(async () => {
    if (result) await dropRestoreDatabase(adminUrlFor(testDatabaseUrl()), result.target.name);
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('T39 a logical backup restores into an isolated database with the same row counts and content hashes', () => {
    expect(itemsRows(result.sourceFp)).toMatchObject({ rows: 3 });
    expect(result.manifest.tables.length).toBeGreaterThan(5);
    expect(result.restoredFp.tables).toEqual(result.sourceFp.tables);
  });

  it('T39 the restored copy keeps the same RLS policies, triggers and functions as the source', () => {
    expect(result.sourceFp.policies.n).toBeGreaterThan(0);
    expect(result.sourceFp.triggers.n).toBeGreaterThan(0);
    expect(result.sourceFp.functions.n).toBeGreaterThan(0);
    expect(result.restoredFp.policies).toEqual(result.sourceFp.policies);
    expect(result.restoredFp.triggers).toEqual(result.sourceFp.triggers);
    expect(result.restoredFp.functions).toEqual(result.sourceFp.functions);
  });

  it('T39 row-level security answers the same per user in the restored copy as in the source', () => {
    expect(result.sourceRls).toEqual({ alice: 2, bob: 1, anon: 'denied:42501' });
    expect(result.restoredRls).toEqual(result.sourceRls);
  });

  it('T39 a changed row in the restored copy is detected by the content hash', async () => {
    const tampered = await tamperRestored(result.target.url, result.manifest);
    expect(itemsRows(tampered).rows).toBe(itemsRows(result.sourceFp).rows);
    expect(itemsRows(tampered).md5).not.toBe(itemsRows(result.sourceFp).md5);
    expect(otherTables(tampered)).toEqual(otherTables(result.sourceFp));
  });

  it('T39 the restore database name ends with _test, differs from the source, and a name without _test is refused', () => {
    const target = restoreUrlFor(testDatabaseUrl());
    expect(target.name.endsWith('_test')).toBe(true);
    expect(target.name).not.toBe(target.sourceName);
    expect(() => restoreUrlFor('postgres://localhost:5432/aftervia')).toThrow(/must end with _test/);
  });
});
