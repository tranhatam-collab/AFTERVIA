import { beforeAll, describe, expect, it } from 'vitest';
import { buildExportBundle, sha256Hex, type ExportItem } from '../../services/api/src/export/bundle';
import { asActor, connect, resetTestDatabase } from '../support/db';

// OWN-A-09 (audit 10/11, D-03). store_export had no cap, so one account could keep creating export jobs and
// each one holds the five file bodies in export_bodies for 24 hours. purge_expired_export_bodies() only clears
// what has already expired, so it does not stop the build-up inside the window. Synthetic data only.
const OWNER = '00000000-0000-4000-8000-0000000009a1';
const OTHER = '00000000-0000-4000-8000-0000000009a2';
const LIMIT = 10;
const EXPORTED_AT = '2026-11-10T00:00:00.000Z';

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

async function liveJobs(userId: string): Promise<number> {
  const row = (await adminRows('select count(*)::int as n from public.export_jobs where owner_user_id = $1 and expires_at > now()', [userId]))[0];
  if (!row) throw new Error('expected one row');
  return Number(row.n);
}

async function exportAs(userId: string, requestId: string): Promise<string> {
  const itemRows = await asActor(userId, async (c) =>
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
  const stored = await asActor(userId, async (c) =>
    (await c.query('select out_job_id from public.store_export($1, $2, $3::jsonb)', [requestId, sha256Hex(`token-${requestId}`), JSON.stringify(bundle)])).rows[0],
  );
  if (!stored) throw new Error('store_export returned no row');
  return stored.out_job_id as string;
}

describe('OWN-A-09 a cap on live export jobs per account', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    await adminRows('insert into auth.users (id, email) values ($1,$2),($3,$4)', [
      OWNER, 'owner-exp-limit@test.invalid',
      OTHER, 'other-exp-limit@test.invalid',
    ]);
    await asActor(OWNER, (c) => c.query("select public.create_item('Máy EXP', null, null, null, 'VND')"));
    await asActor(OTHER, (c) => c.query("select public.create_item('Máy EXP khác', null, null, null, 'VND')"));
  });

  it('D-03 the account may hold the cap, and the next new export is refused', async () => {
    for (let n = 1; n <= LIMIT; n += 1) {
      await exportAs(OWNER, `req-exp-limit-${String(n).padStart(4, '0')}`);
    }
    expect(await liveJobs(OWNER)).toBe(LIMIT);
    await expect(exportAs(OWNER, 'req-exp-limit-overflow')).rejects.toMatchObject({ code: '55000', message: 'too many live exports' });
    expect(await liveJobs(OWNER)).toBe(LIMIT);
  });

  it('D-03 asking again with a request id already used still returns the same job, even at the cap', async () => {
    const again = await exportAs(OWNER, 'req-exp-limit-0001');
    const first = (await adminRows("select id from public.export_jobs where owner_user_id = $1 and request_id = 'req-exp-limit-0001'", [OWNER]))[0];
    expect(again).toBe(first?.id);
    expect(await liveJobs(OWNER)).toBe(LIMIT);
  });

  it('D-03 the cap is per account: another account is not blocked by the first one', async () => {
    const job = await exportAs(OTHER, 'req-exp-other-0001');
    expect(job).toMatch(/^[0-9a-f-]{36}$/);
    expect(await liveJobs(OTHER)).toBe(1);
  });

  it('D-03 a live job can only leave the count by the passage of time: the table is append-only and the TTL is checked', async () => {
    // The cap counts jobs with expires_at > now(). A test cannot age a job: export_jobs refuses UPDATE
    // (append-only) and the export_jobs_ttl check refuses a past expires_at even with the triggers off.
    // That is the point worth locking: nothing can shorten a job's life to free a slot early.
    const admin = await connect();
    try {
      await expect(
        admin.query("update public.export_jobs set expires_at = now() - interval '1 minute' where owner_user_id = $1", [OWNER]),
      ).rejects.toMatchObject({ code: '42501', message: 'export_jobs is append-only: UPDATE is not allowed' });
      await admin.query('set session_replication_role = replica');
      await expect(
        admin.query("update public.export_jobs set expires_at = now() - interval '1 minute' where owner_user_id = $1", [OWNER]),
      ).rejects.toMatchObject({ code: '23514' });
    } finally {
      await admin.end();
    }
    expect(await liveJobs(OWNER)).toBe(LIMIT);
  });
});
