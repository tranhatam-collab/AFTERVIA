import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách mở case
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng A
const MANAGER = '00000000-0000-4000-8000-0000000000c3'; // quản lý cửa hàng A
const AGENT = '00000000-0000-4000-8000-0000000000c2'; // nhân viên cửa hàng A, không được đọc KPI
const OUTSIDER = '00000000-0000-4000-8000-0000000000d1'; // chủ cửa hàng B, tổ chức khác
const SHA = 'c'.repeat(64);

const WIDE_FROM = '2000-01-01T00:00:00Z';
const WIDE_TO = '2100-01-01T00:00:00Z';

type Measures = Record<string, { basis: string; value: number }>;

function first(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const row = rows[0];
  if (!row) throw new Error('expected one row');
  return row;
}

async function adminRows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const admin = await connect();
  try {
    return (await admin.query(sql, params)).rows;
  } finally {
    await admin.end();
  }
}

let item = '';
let orgA = '';
let r1 = '';
let r2 = '';
let w1 = '';
let w2 = '';

async function openCase(requestId: string): Promise<string> {
  return asActor(ALICE, async (c) =>
    (
      await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [
        item,
        orgA,
        'Máy không lên nguồn',
        requestId,
      ])
    ).rows[0].out_case_id as string,
  );
}

async function move(
  actor: string,
  caseId: string,
  to: string,
  expectedVersion: number,
  requestId: string,
  outcome: string | null = null,
  reason = 'Lý do thử',
): Promise<void> {
  await asActor(actor, (c) =>
    c.query('select out_version from public.transition_case($1::uuid, $2::text, $3::integer, $4::text, $5::text, $6::text)', [
      caseId,
      to,
      expectedVersion,
      reason,
      requestId,
      outcome,
    ]),
  );
}

// Tài liệu của khách đã tải lên xong (kiểm chữ ký, chưa có scanner): đủ điều kiện làm bằng chứng.
async function completedDocument(key: string): Promise<string> {
  const doc = await asActor(ALICE, async (c) =>
    (await c.query("select out_document_id from public.create_upload_ticket('image/png', 4096)")).rows[0].out_document_id as string,
  );
  await asActor(ALICE, (c) =>
    c.query("select public.record_upload_inspection($1, 'SCANNER_UNAVAILABLE', 'scanner_unavailable', 'image/png', 4096)", [doc]),
  );
  await asActor(ALICE, (c) => c.query('select public.complete_upload($1, $2, $3, $4)', [doc, key, SHA, 4096]));
  return doc;
}

async function attach(caseId: string, doc: string): Promise<void> {
  await asActor(ALICE, (c) => c.query('select public.attach_case_evidence($1::uuid, $2::uuid)', [caseId, doc]));
}

async function measures(actor: string, org: string, from: string, to: string): Promise<Measures> {
  const rows = await asActor(actor, async (c) =>
    (await c.query('select metric, basis, value from public.case_outcome_kpis($1::uuid, $2::timestamptz, $3::timestamptz)', [org, from, to])).rows,
  );
  const out: Measures = {};
  for (const row of rows) out[row.metric as string] = { basis: row.basis as string, value: row.value as number };
  return out;
}

describe('WO14-01 case outcome measures: separate, distinct per case, actual only, manager-only read', () => {
  beforeAll(async () => {
    await resetTestDatabase();
    const admin = await connect();
    try {
      await admin.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10)', [
        ALICE,
        'alice@test.invalid',
        OWNER,
        'owner@test.invalid',
        MANAGER,
        'manager@test.invalid',
        AGENT,
        'agent@test.invalid',
        OUTSIDER,
        'outsider@test.invalid',
      ]);
    } finally {
      await admin.end();
    }
    orgA = await asActor(OWNER, async (c) => (await c.query("select public.create_organization('Cửa hàng A', 'VN') as id")).rows[0].id as string);
    await asActor(OWNER, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'manager')", [orgA, MANAGER]));
    await asActor(OWNER, (c) => c.query("select public.invite_member($1::uuid, $2::uuid, 'agent')", [orgA, AGENT]));
    await asActor(OUTSIDER, (c) => c.query("select public.create_organization('Cửa hàng B', 'VN')"));
    item = await asActor(ALICE, async (c) =>
      (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string,
    );

    // R1: đã giải quyết rồi đóng.
    r1 = await openCase('req-kpi-r1-open');
    await move(ALICE, r1, 'submitted', 1, 'req-kpi-r1-sub');
    await move(OWNER, r1, 'triaged', 2, 'req-kpi-r1-tri');
    await move(OWNER, r1, 'in_progress', 3, 'req-kpi-r1-inp');
    await attach(r1, await completedDocument('key-kpi-doc-r1'));
    await move(OWNER, r1, 'resolved', 4, 'req-kpi-r1-res', 'repaired');
    await move(OWNER, r1, 'closed', 5, 'req-kpi-r1-clo');

    // R2: đã giải quyết, mở lại, rồi giải quyết lần hai.
    r2 = await openCase('req-kpi-r2-open');
    await move(ALICE, r2, 'submitted', 1, 'req-kpi-r2-sub');
    await move(OWNER, r2, 'triaged', 2, 'req-kpi-r2-tri');
    await move(OWNER, r2, 'in_progress', 3, 'req-kpi-r2-inp');
    await attach(r2, await completedDocument('key-kpi-doc-r2'));
    await move(OWNER, r2, 'resolved', 4, 'req-kpi-r2-res1', 'refunded');
    await move(ALICE, r2, 'triaged', 5, 'req-kpi-r2-reo', null, 'Lỗi vẫn còn sau sửa');
    await move(OWNER, r2, 'in_progress', 6, 'req-kpi-r2-inp2');
    await move(OWNER, r2, 'resolved', 7, 'req-kpi-r2-res2', 'credited');

    // W1: khách rút sau khi gửi. W2: khách rút khi còn nháp.
    w1 = await openCase('req-kpi-w1-open');
    await move(ALICE, w1, 'submitted', 1, 'req-kpi-w1-sub');
    await move(ALICE, w1, 'withdrawn', 2, 'req-kpi-w1-wd', null, 'Không còn cần nữa');
    w2 = await openCase('req-kpi-w2-open');
    await move(ALICE, w2, 'withdrawn', 1, 'req-kpi-w2-wd', null, 'Không còn cần nữa');
  });

  it('T43 the four measures are reported separately, and a case resolved twice counts once in resolved', async () => {
    const got = await measures(OWNER, orgA, WIDE_FROM, WIDE_TO);
    expect(Object.keys(got).sort()).toEqual(['closed', 'reopened', 'resolved', 'withdrawn']);
    expect(got).toEqual({
      resolved: { basis: 'actual', value: 2 },
      closed: { basis: 'actual', value: 1 },
      withdrawn: { basis: 'actual', value: 2 },
      reopened: { basis: 'actual', value: 1 },
    });
  });

  it('T43 each measure matches the distinct cases in the append-only event history, so nothing is invented', async () => {
    const resolved = first(await adminRows(
      "select count(distinct e.case_id)::int as n from public.case_events e join public.cases c on c.id = e.case_id where c.org_id = $1 and e.type = 'transition' and e.to_state = 'resolved'",
      [orgA],
    ));
    const withdrawn = first(await adminRows(
      "select count(distinct e.case_id)::int as n from public.case_events e join public.cases c on c.id = e.case_id where c.org_id = $1 and e.type = 'transition' and e.to_state = 'withdrawn'",
      [orgA],
    ));
    const got = await measures(OWNER, orgA, WIDE_FROM, WIDE_TO);
    expect(got.resolved?.value).toBe(resolved.n);
    expect(got.withdrawn?.value).toBe(withdrawn.n);
    // Một case đã giải quyết hai lần vẫn chỉ là một case: số sự kiện resolved lớn hơn số case.
    const resolvedEvents = first(await adminRows(
      "select count(*)::int as n from public.case_events e join public.cases c on c.id = e.case_id where c.org_id = $1 and e.type = 'transition' and e.to_state = 'resolved'",
      [orgA],
    ));
    expect(resolvedEvents.n).toBe(3);
    expect(got.resolved?.value).toBe(2);
  });

  it('T43 a period with no events returns zero for every measure, and an empty or reversed period is refused', async () => {
    const empty = await measures(OWNER, orgA, '2000-01-01T00:00:00Z', '2000-01-02T00:00:00Z');
    expect(empty).toEqual({
      resolved: { basis: 'actual', value: 0 },
      closed: { basis: 'actual', value: 0 },
      withdrawn: { basis: 'actual', value: 0 },
      reopened: { basis: 'actual', value: 0 },
    });
    await expect(measures(OWNER, orgA, WIDE_TO, WIDE_FROM)).rejects.toMatchObject({ code: '22023' });
  });

  it('T43 only the owner and managers of the organization read the measures; agents, customers, other organizations and anonymous callers are refused', async () => {
    expect((await measures(MANAGER, orgA, WIDE_FROM, WIDE_TO)).resolved?.value).toBe(2);
    await expect(measures(AGENT, orgA, WIDE_FROM, WIDE_TO)).rejects.toMatchObject({ code: '42501' });
    await expect(measures(OUTSIDER, orgA, WIDE_FROM, WIDE_TO)).rejects.toMatchObject({ code: '42501' });
    await expect(measures(ALICE, orgA, WIDE_FROM, WIDE_TO)).rejects.toMatchObject({ code: '42501' });
    await expect(
      asActor(null, async (c) => c.query('select * from public.case_outcome_kpis($1::uuid, $2::timestamptz, $3::timestamptz)', [orgA, WIDE_FROM, WIDE_TO])),
    ).rejects.toMatchObject({ code: '42501' });
  });
});
