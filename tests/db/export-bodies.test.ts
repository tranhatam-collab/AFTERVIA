import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';
import { buildExportBundle, sha256Hex, type ExportItem } from '../../services/api/src/export/bundle';

// WO11-02e-EXP (T25; Q2 đã QUYẾT, phương án C): nội dung tệp của gói xuất nằm trong bảng sửa được có hạn 24 giờ.
// export_files (chỉ thêm) giữ khóa tham chiếu, băm và kích thước. Dữ liệu tổng hợp.
const OWNER = '00000000-0000-4000-8000-0000000001a1';
const EXPORTED_AT = '2026-11-06T16:00:00.000Z';
const TOKEN_1 = 'token-for-export-body-0000000001';
const TOKEN_2 = 'token-for-export-body-0000000002';

let job1 = '';
let job2 = '';

// Đọc phạm vi của chủ như ứng dụng làm (qua RLS), dựng gói, rồi lưu gói.
async function exportAs(requestId: string, rawToken: string): Promise<string> {
  const itemRows = await asActor(OWNER, async (c) =>
    (await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at, id')).rows,
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
  const stored = await asActor(OWNER, async (c) =>
    (await c.query('select out_job_id from public.store_export($1, $2, $3::jsonb)', [requestId, sha256Hex(rawToken), JSON.stringify(bundle)])).rows[0],
  );
  return stored.out_job_id as string;
}

async function download(jobId: string, rawToken: string, path: string): Promise<{ out_body: string; out_sha256: string; out_size_bytes: number }> {
  return asActor(OWNER, async (c) =>
    (await c.query('select out_body, out_sha256, out_size_bytes from public.fetch_export_file($1::uuid, $2, $3)', [jobId, sha256Hex(rawToken), path])).rows[0],
  );
}

describe('WO11-02e-EXP export bodies: editable with a 24-hour expiry; the file rows keep references and hashes only', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2)', [OWNER, 'owner-exp@test.invalid']);
    } finally {
      await admin.end();
    }
    await asActor(OWNER, (c) => c.query("select public.create_item('Máy sấy', 'Hãng Z', null, '2026-06-01', 'VND') as id"));
    job1 = await exportAs('export-body-req-0001', TOKEN_1);
    job2 = await exportAs('export-body-req-0002', TOKEN_2);
  });

  it('T25 the file bodies sit in the editable table, and the file rows keep only the reference, the hash and the size', async () => {
    const admin = await connect();
    try {
      const column = await admin.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'export_files' and column_name = 'body'");
      expect(column.rowCount).toBe(0);
      const files = await admin.query('select path, sha256, size_bytes from public.export_files where job_id = $1 order by path', [job1]);
      expect(files.rowCount).toBe(5);
      const bodies = await admin.query(
        "select b.path, encode(sha256(convert_to(b.body, 'UTF8')), 'hex') as computed, f.sha256 as stored_sha, octet_length(convert_to(b.body, 'UTF8')) as computed_size, f.size_bytes as stored_size from public.export_bodies b join public.export_files f on f.job_id = b.job_id and f.path = b.path where b.job_id = $1",
        [job1],
      );
      expect(bodies.rowCount).toBe(5);
      for (const row of bodies.rows) {
        expect(row.computed).toBe(row.stored_sha);
        expect(Number(row.computed_size)).toBe(Number(row.stored_size));
      }
    } finally {
      await admin.end();
    }
  });

  it('T25 each body expires with its export link, 24 hours after the export is created', async () => {
    const admin = await connect();
    try {
      const matched = await admin.query(
        'select count(*)::int as n from public.export_bodies b join public.export_jobs j on j.id = b.job_id where b.job_id = $1 and b.expires_at = j.expires_at and extract(epoch from (j.expires_at - j.created_at)) = 86400',
        [job1],
      );
      expect(matched.rows[0].n).toBe(5);
    } finally {
      await admin.end();
    }
  });

  it('T25 a body cannot be kept past its link, although its expiry may be shortened', async () => {
    const admin = await connect();
    try {
      await expect(
        admin.query("update public.export_bodies set expires_at = expires_at + interval '1 day' where job_id = $1 and path = 'items.json'", [job1]),
      ).rejects.toMatchObject({ code: '22023' });
    } finally {
      await admin.end();
    }
  });

  it('T25 no end user can read or change the bodies directly, and the purge is not open to them', async () => {
    await expect(asActor(OWNER, (c) => c.query('select count(*) from public.export_bodies'))).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(null, (c) => c.query('select count(*) from public.export_bodies'))).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(OWNER, (c) => c.query('select public.purge_expired_export_bodies()'))).rejects.toMatchObject({ code: '42501' });
  });

  it('T25 the owner downloads a body before it expires, and the bytes match the stored hash and size', async () => {
    const row = await download(job2, TOKEN_2, 'items.json');
    expect(sha256Hex(row.out_body)).toBe(row.out_sha256);
    expect(Buffer.byteLength(row.out_body, 'utf8')).toBe(row.out_size_bytes);
  });

  it('T25 an expired body is refused before any purge, and the purge erases only the expired bodies, keeps the references, and audits the count', async () => {
    const admin = await connect();
    try {
      // Mô phỏng hết hạn: rút ngắn hạn nội dung của gói 1 xuống quá khứ (được phép: chỉ rút ngắn).
      await admin.query("update public.export_bodies set expires_at = now() - interval '1 second' where job_id = $1", [job1]);
    } finally {
      await admin.end();
    }
    // Nội dung đã hết hạn nhưng chưa dọn vẫn không tải được.
    await expect(download(job1, TOKEN_1, 'items.json')).rejects.toMatchObject({ code: 'P0002' });

    const sweep = await connect();
    try {
      const purged = await sweep.query('select public.purge_expired_export_bodies() as n');
      expect(purged.rows[0].n).toBe(5);
      expect((await sweep.query('select count(*)::int as n from public.export_bodies where job_id = $1', [job1])).rows[0].n).toBe(0);
      expect((await sweep.query('select count(*)::int as n from public.export_bodies where job_id = $1', [job2])).rows[0].n).toBe(5);
      expect((await sweep.query('select count(*)::int as n from public.export_files where job_id = $1', [job1])).rows[0].n).toBe(5);
      const audit = await sweep.query("select details from public.audit_events where action = 'export.bodies_purged' order by id desc limit 1");
      expect(audit.rows[0].details).toEqual({ count: 5 });
    } finally {
      await sweep.end();
    }
    await expect(download(job1, TOKEN_1, 'items.json')).rejects.toMatchObject({ code: 'P0002' });
    expect((await download(job2, TOKEN_2, 'items.json')).out_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('T25 the references stay append-only: a change or a deletion of a file reference is refused, even for the database owner', async () => {
    const admin = await connect();
    try {
      await expect(admin.query('update public.export_files set size_bytes = 0 where job_id = $1', [job1])).rejects.toThrow(/append-only/);
      await expect(admin.query('delete from public.export_files where job_id = $1', [job1])).rejects.toThrow(/append-only/);
    } finally {
      await admin.end();
    }
  });
});
