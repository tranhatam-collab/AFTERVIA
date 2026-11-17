import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildExportBundle, sha256Hex, type ExportItem } from '../../services/api/src/export/bundle';
import { asActor, connect, resetTestDatabase, testDatabaseUrl } from '../support/db';

// D-03 (kiểm toán 10/11): purge_expired_export_bodies() không được lên lịch ở đâu. Bài này kiểm runner dòng lệnh
// mà người vận hành đặt vào lịch (cron, job của nền tảng). Việc lên lịch thật là hạ tầng, không kiểm ở đây.
// Dữ liệu tổng hợp. DATABASE_URL chỉ được truyền qua môi trường, không bao giờ in ra.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = resolve(ROOT, 'tools', 'db', 'purge-export-bodies.mjs');
const OWNER = '00000000-0000-4000-8000-0000000003d1';
const EXPORTED_AT = '2026-11-11T00:00:00.000Z';

function runRunner(env: Record<string, string | undefined>): { status: number | null; stdout: string; stderr: string } {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...process.env, ...env })) if (v !== undefined) merged[k] = v;
  if (env.DATABASE_URL === undefined) delete merged.DATABASE_URL;
  const r = spawnSync(process.execPath, [SCRIPT], { env: merged, encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

async function exportOnce(requestId: string): Promise<void> {
  const itemRows = await asActor(OWNER, async (c) =>
    (await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at')).rows,
  );
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
  const bundle = buildExportBundle({ items, grants: [], exportedAt: EXPORTED_AT });
  await asActor(OWNER, (c) =>
    c.query('select out_job_id from public.store_export($1, $2, $3::jsonb)', [requestId, sha256Hex(`token-${requestId}`), JSON.stringify(bundle)]),
  );
}

beforeAll(async () => {
  await resetTestDatabase();
  const admin = await connect();
  try {
    await admin.query('insert into auth.users (id, email) values ($1, $2)', [OWNER, 'purge-runner@test.invalid']);
  } finally {
    await admin.end();
  }
  await asActor(OWNER, (c) => c.query("select public.create_item('Máy runner', null, null, null, 'VND')"));
});

describe('D-03 the purge runner an operator can schedule', () => {
  it('D-03 with nothing expired it reports zero and exits 0', () => {
    const r = runRunner({ DATABASE_URL: testDatabaseUrl() });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ purged: 0 });
  });

  it('D-03 after a body expires it purges exactly those bodies, keeps the references, and audits the count', async () => {
    await exportOnce('req-purge-runner-0001');
    const admin = await connect();
    try {
      await admin.query("update public.export_bodies set expires_at = now() - interval '1 second'");
    } finally {
      await admin.end();
    }
    const r = runRunner({ DATABASE_URL: testDatabaseUrl() });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toEqual({ purged: 5 });

    const check = await connect();
    try {
      expect((await check.query('select count(*)::int as n from public.export_bodies')).rows[0].n).toBe(0);
      expect((await check.query('select count(*)::int as n from public.export_files')).rows[0].n).toBe(5);
      const audit = await check.query("select details from public.audit_events where action = 'export.bodies_purged' order by id desc limit 1");
      expect(audit.rows[0]?.details).toEqual({ count: 5 });
    } finally {
      await check.end();
    }
  });

  it('D-03 without DATABASE_URL it refuses with exit 2 and says which variable is missing', () => {
    const r = runRunner({ DATABASE_URL: undefined });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('DATABASE_URL');
    expect(r.stdout).toBe('');
  });

  it('D-03 a connection failure exits 1 and never prints the connection string', () => {
    const secretish = 'postgres://runner:not-a-real-password@127.0.0.1:1/nothing_test';
    const r = runRunner({ DATABASE_URL: secretish });
    expect(r.status).toBe(1);
    // Phải là lỗi kết nối có chủ đích của runner, không phải lỗi "không tìm thấy script" hay lỗi cú pháp.
    expect(r.stderr).toMatch(/cannot connect/);
    expect(r.stdout + r.stderr).not.toContain('not-a-real-password');
    expect(r.stdout + r.stderr).not.toContain(secretish);
  });
});
