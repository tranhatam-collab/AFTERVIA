import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';
import { buildExportBundle, csvCell, sha256Hex, toCsv, type BundleFile, type ExportItem, type GrantedDocument } from '../../services/api/src/export/bundle';

// WO11-01: xuất dữ liệu theo phạm vi quyền (T24). Dữ liệu tổng hợp, không dùng dữ liệu thật.
const OWNER_A = '00000000-0000-4000-8000-0000000000a1';
const OWNER_B = '00000000-0000-4000-8000-0000000000b1';
const PARTNER = '00000000-0000-4000-8000-0000000000e1';
const STRANGER = '00000000-0000-4000-8000-0000000000f1';
const EXPORTED_AT = '2026-10-31T19:00:00.000Z';
const TOKEN_A = 'token-for-owner-a-export-0001';
const TOKEN_P = 'token-for-partner-export-0001';

let orgA = '';
let itemA1 = '';
let itemA2 = '';
let itemB1 = '';
let docGranted = '';
let docOther = '';
let caseA = '';
let grantId = '';

async function completedDocument(user: string, key: string, sha: string): Promise<string> {
  const doc = await asActor(user, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(user, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(user, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, sha, 4096]));
  return doc;
}

// Đọc phạm vi của người gọi như ứng dụng làm (qua RLS và hàm), dựng gói, rồi lưu gói.
async function exportAs(user: string, requestId: string, rawToken: string): Promise<{ jobId: string; bundle: BundleFile[] }> {
  const itemRows = await asActor(user, async (c) =>
    (await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at, id')).rows,
  );
  const grantRows = await asActor(user, async (c) =>
    (
      await c.query(
        'select out_grant_id, out_case_id, out_document_id, out_declared_mime, out_size_bytes, out_scan_status, out_can_download, out_expires_at from public.export_granted_documents()',
      )
    ).rows,
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
  const grants: GrantedDocument[] = grantRows.map((r) => ({
    grant_id: r.out_grant_id as string,
    case_id: r.out_case_id as string,
    document_id: r.out_document_id as string,
    declared_mime: r.out_declared_mime as string,
    size_bytes: Number(r.out_size_bytes),
    scan_status: r.out_scan_status as string,
    can_download: r.out_can_download as boolean,
    expires_at: new Date(r.out_expires_at as Date).toISOString(),
  }));
  const bundle = buildExportBundle({ items, grants, exportedAt: EXPORTED_AT });
  const stored = await asActor(user, async (c) =>
    (
      await c.query('select out_job_id, out_expires_at, out_replayed from public.store_export($1, $2, $3::jsonb)', [
        requestId,
        sha256Hex(rawToken),
        JSON.stringify(bundle),
      ])
    ).rows[0],
  );
  return { jobId: stored.out_job_id as string, bundle };
}

async function fetchFile(user: string, jobId: string, rawToken: string, path: string): Promise<{ out_body: string; out_sha256: string; out_size_bytes: number; out_content_type: string }> {
  return asActor(user, async (c) =>
    (await c.query('select out_content_type, out_sha256, out_size_bytes, out_body from public.fetch_export_file($1::uuid, $2, $3)', [jobId, sha256Hex(rawToken), path])).rows[0],
  );
}

describe('WO11-01 export by object scope: items, granted documents, manifest and 24-hour link', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      for (const [name, id] of [
        ['ownerA', OWNER_A],
        ['ownerB', OWNER_B],
        ['partner', PARTNER],
        ['stranger', STRANGER],
      ] as const) {
        await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@test.invalid`]);
      }
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER_A, async (c) => (await c.query("select public.create_organization('Tổ chức A', 'VN') as id")).rows[0].id as string);
    itemA1 = await asActor(OWNER_A, async (c) =>
      (await c.query("select public.create_item('Máy giặt', 'Hãng Y', null, '2026-05-02', 'VND') as id")).rows[0].id as string,
    );
    itemA2 = await asActor(OWNER_A, async (c) => (await c.query("select public.create_item('Tủ lạnh', null, null, null, null) as id")).rows[0].id as string);
    itemB1 = await asActor(OWNER_B, async (c) => (await c.query("select public.create_item('Máy sấy', null, null, null, null) as id")).rows[0].id as string);
    docGranted = await completedDocument(OWNER_A, 'export-doc-granted-01', 'a'.repeat(64));
    docOther = await completedDocument(OWNER_A, 'export-doc-other-0001', 'b'.repeat(64));
    caseA = await asActor(OWNER_A, async (c) =>
      (await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [itemA1, orgA, 'Máy không lên nguồn', 'export-case-0001'])).rows[0].out_case_id as string,
    );
    await asActor(OWNER_A, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, docGranted]));
    await asActor(OWNER_A, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseA, docOther]));
    await asActor(OWNER_A, (c) =>
      c.query("select public.invite_case_participant($1::uuid, $2::uuid, now() + interval '1 day') as id", [caseA, PARTNER]),
    );
    grantId = await asActor(OWNER_A, async (c) =>
      (
        await c.query("select public.grant_case_document($1::uuid, $2::uuid, $3::uuid, false, now() + interval '1 day') as id", [
          caseA,
          docGranted,
          PARTNER,
        ])
      ).rows[0].id as string,
    );
  });

  it('T24 a user with one document grant, but not the whole case, exports only the granted object and no other object', async () => {
    const partner = await exportAs(PARTNER, 'export-req-partner-01', TOKEN_P);
    const grants = JSON.parse(partner.bundle.find((f) => f.path === 'granted_documents.json')!.body) as { documents: GrantedDocument[] };
    expect(grants.documents.map((d) => d.document_id)).toEqual([docGranted]);
    expect(grants.documents.map((d) => d.document_id)).not.toContain(docOther);
    const items = JSON.parse(partner.bundle.find((f) => f.path === 'items.json')!.body) as { items: ExportItem[] };
    expect(items.items).toEqual([]);
  });

  it('T24 the owner export holds all of the owner items and none of another person items or grants', async () => {
    const owner = await exportAs(OWNER_A, 'export-req-owner-0001', TOKEN_A);
    const items = JSON.parse(owner.bundle.find((f) => f.path === 'items.json')!.body) as { items: ExportItem[] };
    expect(items.items.map((i) => i.id).sort()).toEqual([itemA1, itemA2].sort());
    expect(items.items.map((i) => i.id)).not.toContain(itemB1);
    const grants = JSON.parse(owner.bundle.find((f) => f.path === 'granted_documents.json')!.body) as { documents: GrantedDocument[] };
    expect(grants.documents).toEqual([]);
  });

  it('T24 the manifest lists the four other files, and each hash and size is recomputed from the stored body', async () => {
    const owner = await exportAs(OWNER_A, 'export-req-owner-0002', TOKEN_A);
    const manifestRow = await fetchFile(OWNER_A, owner.jobId, TOKEN_A, 'manifest.json');
    const manifest = JSON.parse(manifestRow.out_body) as { files: Array<{ path: string; sha256: string; size_bytes: number }> };
    expect(manifest.files.map((f) => f.path).sort()).toEqual(['granted_documents.csv', 'granted_documents.json', 'items.csv', 'items.json']);
    for (const entry of manifest.files) {
      const row = await fetchFile(OWNER_A, owner.jobId, TOKEN_A, entry.path);
      expect(sha256Hex(row.out_body)).toBe(entry.sha256);
      expect(Buffer.byteLength(row.out_body, 'utf8')).toBe(entry.size_bytes);
      expect(row.out_sha256).toBe(entry.sha256);
    }
  });

  it('T24 a bundle that names another person item is refused by the database, even if the application built it', async () => {
    const owner = await asActor(OWNER_A, async (c) =>
      (await c.query('select id, title, brand, model, purchased_on, currency, version, created_at, updated_at from public.items order by created_at, id')).rows,
    );
    const forged: ExportItem[] = owner.map((r, index) => ({
      id: index === 0 ? itemB1 : (r.id as string),
      title: r.title as string,
      brand: (r.brand as string | null) ?? null,
      model: (r.model as string | null) ?? null,
      purchased_on: (r.purchased_on as string | null) ?? null,
      currency: (r.currency as string | null)?.trim() ?? null,
      version: Number(r.version),
      created_at: new Date(r.created_at as Date).toISOString(),
      updated_at: new Date(r.updated_at as Date).toISOString(),
    }));
    const forgedBundle = buildExportBundle({ items: forged, grants: [], exportedAt: EXPORTED_AT });
    await expect(
      asActor(OWNER_A, (c) =>
        c.query('select out_job_id from public.store_export($1, $2, $3::jsonb)', ['export-req-forged-01', sha256Hex('forged-token-0000000000000001'), JSON.stringify(forgedBundle)]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('T24 the export link works only for its owner with the right token, and is a 24-hour link', async () => {
    const owner = await exportAs(OWNER_A, 'export-req-owner-0003', TOKEN_A);
    const ok = await fetchFile(OWNER_A, owner.jobId, TOKEN_A, 'items.json');
    expect(ok.out_content_type).toBe('application/json');
    await expect(fetchFile(OWNER_A, owner.jobId, 'wrong-token-0000000000000000000001', 'items.json')).rejects.toMatchObject({ code: 'P0002' });
    await expect(fetchFile(STRANGER, owner.jobId, TOKEN_A, 'items.json')).rejects.toMatchObject({ code: 'P0002' });
    const admin = await connect();
    try {
      const ttl = await admin.query('select extract(epoch from (expires_at - created_at)) as seconds from public.export_jobs where id = $1', [owner.jobId]);
      expect(Number(ttl.rows[0].seconds)).toBe(24 * 60 * 60);
    } finally {
      await admin.end();
    }
  });

  it('T24 a path outside the five files is refused, and repeating the same request returns the same export', async () => {
    const owner = await exportAs(OWNER_A, 'export-req-owner-0004', TOKEN_A);
    await expect(fetchFile(OWNER_A, owner.jobId, TOKEN_A, '../secrets.txt')).rejects.toMatchObject({ code: '22023' });
    const again = await asActor(OWNER_A, async (c) =>
      (await c.query('select out_job_id, out_replayed from public.store_export($1, $2, $3::jsonb)', ['export-req-owner-0004', sha256Hex(TOKEN_A), '[]'])).rows[0],
    );
    expect(again.out_job_id).toBe(owner.jobId);
    expect(again.out_replayed).toBe(true);
  });

  it('T24 a revoked grant is no longer exported in a new export', async () => {
    await asActor(OWNER_A, (c) => c.query('select public.revoke_case_document_grant($1::uuid)', [grantId]));
    const partner = await exportAs(PARTNER, 'export-req-partner-02', TOKEN_P);
    const grants = JSON.parse(partner.bundle.find((f) => f.path === 'granted_documents.json')!.body) as { documents: GrantedDocument[] };
    expect(grants.documents).toEqual([]);
  });
});

describe('WO11-01 export files: CSV quoting and formula neutralising, deterministic bundle', () => {
  it('quotes cells with commas, quotes or line breaks, and neutralises formula-leading cells', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell(null)).toBe('');
    expect(csvCell(42)).toBe('42');
  });

  it('uses CRLF line endings and a header row', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n');
  });

  it('builds five files in a fixed order, and the manifest matches them', () => {
    const items: ExportItem[] = [
      {
        id: itemA1,
        title: 'Máy giặt',
        brand: 'Hãng Y',
        model: null,
        purchased_on: '2026-05-02',
        currency: 'VND',
        version: 1,
        created_at: '2026-10-31T18:00:00.000Z',
        updated_at: '2026-10-31T18:00:00.000Z',
      },
    ];
    const first = buildExportBundle({ items, grants: [], exportedAt: EXPORTED_AT });
    const second = buildExportBundle({ items, grants: [], exportedAt: EXPORTED_AT });
    expect(first.map((f) => f.path)).toEqual(['items.json', 'items.csv', 'granted_documents.json', 'granted_documents.csv', 'manifest.json']);
    expect(first).toEqual(second);
    const manifest = JSON.parse(first[4]!.body) as { files: Array<{ path: string; sha256: string }> };
    for (const entry of manifest.files) {
      const body = first.find((f) => f.path === entry.path)!.body;
      expect(sha256Hex(body)).toBe(entry.sha256);
    }
  });
});
