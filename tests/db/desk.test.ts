import { beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase } from '../support/db';

const ALICE = '00000000-0000-4000-8000-0000000000a1'; // khách sở hữu món đồ
const OWNER = '00000000-0000-4000-8000-0000000000c1'; // chủ cửa hàng A
const MANAGER = '00000000-0000-4000-8000-0000000000c3'; // quản lý cửa hàng A
const AGENT = '00000000-0000-4000-8000-0000000000c2'; // nhân viên cửa hàng A
const OUTSIDER = '00000000-0000-4000-8000-0000000000d1'; // chủ cửa hàng B, tổ chức khác

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

interface Assigned {
  out_version: number;
  out_assigned_to: string | null;
  out_replayed: boolean;
  out_refused: string | null;
}

let orgA = '';
let orgB = '';
let item = '';
let caseA = '';

async function assign(
  actor: string,
  caseId: string,
  assignee: string | null,
  expectedVersion: number,
  reason: string,
  requestId: string,
): Promise<Assigned> {
  return asActor(actor, async (c) =>
    (
      await c.query('select * from public.assign_case($1::uuid, $2::uuid, $3::integer, $4::text, $5::text)', [
        caseId,
        assignee,
        expectedVersion,
        reason,
        requestId,
      ])
    ).rows[0] as Assigned,
  );
}

describe('WO08-03 Desk inbox and assignment: organization scope, role checks and audit', () => {
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
    orgB = await asActor(OUTSIDER, async (c) => (await c.query("select public.create_organization('Cửa hàng B', 'VN') as id")).rows[0].id as string);
    item = await asActor(ALICE, async (c) => (await c.query("select public.create_item('Máy pha cà phê', null, null, null, null) as id")).rows[0].id as string);
    caseA = await asActor(ALICE, async (c) =>
      (
        await c.query('select out_case_id from public.create_case($1::uuid, $2::uuid, $3::text, $4::text)', [
          item,
          orgA,
          'Máy không lên nguồn',
          'req-desk-open-0001',
        ])
      ).rows[0].out_case_id as string,
    );
    await asActor(ALICE, (c) => c.query("select * from public.transition_case($1::uuid, 'submitted', 1, 'Gửi yêu cầu', 'req-desk-sub-0001', null)", [caseA]));
    await asActor(OWNER, (c) => c.query("select * from public.transition_case($1::uuid, 'triaged', 2, 'Tiếp nhận', 'req-desk-tri-0001', null)", [caseA]));
  });

  it('T05 the inbox lists only the organization\'s own cases, a non-member is refused, and status filters work', async () => {
    expect(await asActor(OWNER, async (c) => (await c.query('select out_case_id, out_status from public.desk_inbox($1::uuid)', [orgA])).rows)).toEqual([
      { out_case_id: caseA, out_status: 'triaged' },
    ]);
    await expect(asActor(OUTSIDER, (c) => c.query('select out_case_id from public.desk_inbox($1::uuid)', [orgA]))).rejects.toMatchObject({
      code: 'P0002',
    });
    expect(await asActor(OUTSIDER, async (c) => (await c.query('select out_case_id from public.desk_inbox($1::uuid)', [orgB])).rows)).toEqual([]);
    expect(await asActor(AGENT, async (c) => (await c.query("select out_case_id from public.desk_inbox($1::uuid, 'triaged')", [orgA])).rows)).toHaveLength(1);
    expect(await asActor(AGENT, async (c) => (await c.query("select out_case_id from public.desk_inbox($1::uuid, 'submitted')", [orgA])).rows)).toEqual([]);
    await expect(asActor(AGENT, (c) => c.query("select out_case_id from public.desk_inbox($1::uuid, 'hacked')", [orgA]))).rejects.toMatchObject({
      code: '22023',
    });
  });

  it('T05 a member of another organization cannot assign a case or read it, and an assignee from another organization is refused', async () => {
    await expect(assign(OUTSIDER, caseA, AGENT, 3, 'Phân công', 'req-desk-out-0001')).rejects.toMatchObject({ code: 'P0002' });
    expect(await asActor(OUTSIDER, async (c) => (await c.query('select id from public.cases where id = $1', [caseA])).rows)).toEqual([]);
    await expect(assign(MANAGER, caseA, OUTSIDER, 3, 'Phân công', 'req-desk-xorg-0001')).rejects.toMatchObject({ code: 'P0002' });
  });

  it('T06 an agent cannot assign a case: the refusal is returned and audited, and nothing changes', async () => {
    expect(await assign(AGENT, caseA, MANAGER, 3, 'Tự giao việc', 'req-desk-agent-01')).toEqual({
      out_version: 3,
      out_assigned_to: null,
      out_replayed: false,
      out_refused: 'forbidden',
    });
    expect(first(await adminRows('select assigned_to, version from public.cases where id = $1', [caseA]))).toEqual({ assigned_to: null, version: 3 });
    expect(first(await adminRows("select count(*)::int as n from public.audit_events where action = 'case.assign.denied' and object_id = $1", [caseA]))).toEqual({
      n: 1,
    });
  });

  it('T06 a client cannot write the assignment, the organization or a role directly, and an agent cannot change a role', async () => {
    await expect(asActor(AGENT, (c) => c.query('update public.cases set assigned_to = $2 where id = $1', [caseA, AGENT]))).rejects.toMatchObject({
      code: '42501',
    });
    await expect(asActor(AGENT, (c) => c.query('update public.cases set org_id = $2 where id = $1', [caseA, orgB]))).rejects.toMatchObject({
      code: '42501',
    });
    await expect(
      asActor(AGENT, (c) => c.query("update public.organization_members set role = 'owner' where user_id = $1", [AGENT])),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(asActor(AGENT, (c) => c.query("select public.change_member_role($1::uuid, $2::uuid, 'owner')", [orgA, AGENT]))).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('T05 T06 a manager assigns an agent of the same organization: the change is versioned, recorded as an event and audited; a stale version is a 409', async () => {
    expect(await assign(MANAGER, caseA, AGENT, 3, 'Giao cho nhân viên', 'req-desk-assign-1')).toEqual({
      out_version: 4,
      out_assigned_to: AGENT,
      out_replayed: false,
      out_refused: null,
    });
    expect(first(await adminRows('select assigned_to, version, status from public.cases where id = $1', [caseA]))).toEqual({
      assigned_to: AGENT,
      version: 4,
      status: 'triaged',
    });
    expect(
      first(
        await adminRows(
          'select e.type, e.actor_role, e.from_state, e.to_state, r.reason from public.case_events e left join public.case_event_reasons r on r.event_id = e.id where e.case_id = $1 order by e.sequence desc limit 1',
          [caseA],
        ),
      ),
    ).toEqual({ type: 'assigned', actor_role: 'merchant', from_state: 'triaged', to_state: 'triaged', reason: 'Giao cho nhân viên' });
    expect(first(await adminRows("select count(*)::int as n from public.audit_events where action = 'case.assign' and object_id = $1", [caseA]))).toEqual({
      n: 1,
    });
    await expect(assign(MANAGER, caseA, null, 3, 'Phiên bản cũ', 'req-desk-stale-01')).rejects.toMatchObject({ code: '40001' });
    await expect(assign(MANAGER, caseA, null, 4, '   ', 'req-desk-noreas-01')).rejects.toMatchObject({ code: '22023' });
  });

  it('T05 the assignee sees the case in the inbox filter; an owner can unassign it, and the change is versioned and audited', async () => {
    expect(
      await asActor(AGENT, async (c) => (await c.query('select out_case_id from public.desk_inbox($1::uuid, null::text, $2::uuid)', [orgA, AGENT])).rows),
    ).toEqual([{ out_case_id: caseA }]);
    expect(await assign(OWNER, caseA, null, 4, 'Trả lại hàng đợi', 'req-desk-free-001')).toEqual({
      out_version: 5,
      out_assigned_to: null,
      out_replayed: false,
      out_refused: null,
    });
    expect(
      await asActor(AGENT, async (c) => (await c.query('select out_case_id from public.desk_inbox($1::uuid, null::text, $2::uuid)', [orgA, AGENT])).rows),
    ).toEqual([]);
    expect(first(await adminRows("select count(*)::int as n from public.audit_events where action = 'case.assign' and object_id = $1", [caseA]))).toEqual({
      n: 2,
    });
  });
});
