import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTask, blockTask, decide, finishTask, setBudget, setDeps, splitTask, startTask, unblockTask, validateBacklog, readyTasks } from './backlog.mjs';

const task = (over) => ({
  id: 'X',
  wo: 'WO00',
  title: 't',
  kind: 'AUTO',
  deps: [],
  acceptance: ['T01'],
  status: 'TODO',
  attempts: 0,
  evidence: [],
  ...over,
});

const sample = () => ({
  meta: { iterations_used: 0, iteration_budget: 5 },
  tasks: [
    task({ id: 'A', deps: [] }),
    task({ id: 'B', deps: ['A'] }),
    task({ id: 'H', kind: 'HUMAN', acceptance: [] }),
    task({ id: 'C', deps: ['H'] }),
  ],
});

test('validate accepts a well-formed backlog', () => {
  assert.deepEqual(validateBacklog(sample(), { acceptanceIds: new Set(['T01']) }), []);
});

test('validate rejects cycles, unknown deps, bad ids and DONE without evidence', () => {
  const bad = {
    tasks: [
      task({ id: 'A', deps: ['B'] }),
      task({ id: 'B', deps: ['A'] }),
      task({ id: 'C', deps: ['NOPE'] }),
      task({ id: 'D', acceptance: ['ZZ9'] }),
      task({ id: 'E', status: 'DONE', evidence: [] }),
    ],
  };
  const errors = validateBacklog(bad, { acceptanceIds: new Set(['T01']) }).join('\n');
  assert.match(errors, /dependency cycle/);
  assert.match(errors, /C: unknown dependency NOPE/);
  assert.match(errors, /D: malformed acceptance id ZZ9/);
  assert.match(errors, /E: DONE without evidence/);
});

test('validate flags acceptance ids that are not in the matrix', () => {
  const data = { tasks: [task({ id: 'A', acceptance: ['T99'] })] };
  assert.match(validateBacklog(data, { acceptanceIds: new Set(['T01']) }).join('\n'), /unknown acceptance id T99/);
});

test('loop never starts HUMAN tasks and only ready AUTO tasks are offered', () => {
  const data = sample();
  assert.deepEqual(readyTasks(data).map((t) => t.id), ['A']);
  assert.throws(() => startTask(data, 'H'), /never starts it/);
  assert.throws(() => startTask(data, 'B'), /waits for A/);
});

test('start then finish requires evidence and moves dependents to ready', () => {
  const data = sample();
  startTask(data, 'A', '2026-10-31T00:00:00Z');
  assert.equal(data.tasks[0].status, 'IN_PROGRESS');
  assert.equal(data.meta.iterations_used, 1);
  assert.throws(() => finishTask(data, 'A', []), /needs at least one evidence/);
  finishTask(data, 'A', ['npm test: 3 passed']);
  assert.equal(data.tasks[0].status, 'DONE');
  assert.deepEqual(readyTasks(data).map((t) => t.id), ['B']);
});

test('only one task may be IN_PROGRESS and decide resumes it', () => {
  const data = sample();
  startTask(data, 'A');
  assert.throws(() => startTask(data, 'B'), /already IN_PROGRESS/);
  assert.deepEqual(decide(data), { action: 'RESUME', task: 'A' });
});

test('blocked tasks need a reason and can be unblocked explicitly', () => {
  const data = sample();
  assert.throws(() => blockTask(data, 'A', ''), /needs a reason/);
  blockTask(data, 'A', 'Postgres not reachable: ECONNREFUSED 127.0.0.1:5432');
  assert.equal(data.tasks[0].status, 'BLOCKED');
  // B waits on the blocked A, so nothing is ready and the loop must stop instead of spinning.
  assert.equal(decide(data).action, 'STOP_STUCK');
  unblockTask(data, 'A');
  assert.equal(data.tasks[0].status, 'TODO');
});

test('decide stops at budget and at handoff when only human work remains', () => {
  const data = sample();
  data.meta.iterations_used = 5;
  assert.equal(decide(data).action, 'STOP_BUDGET');

  const complete = {
    meta: { iterations_used: 1, iteration_budget: 9 },
    tasks: [task({ id: 'A', status: 'DONE', evidence: ['ok'] }), task({ id: 'H', kind: 'HUMAN', acceptance: [] })],
  };
  const decision = decide(complete);
  assert.equal(decision.action, 'STOP_HANDOFF');
  assert.deepEqual(decision.waiting_human, ['H']);
});

test('decide reports stuck when an automatable task waits on a blocked dependency', () => {
  const data = {
    meta: { iterations_used: 1, iteration_budget: 9 },
    tasks: [task({ id: 'A', status: 'BLOCKED', blocked_reason: 'x' }), task({ id: 'B', deps: ['A'] })],
  };
  assert.equal(decide(data).action, 'STOP_STUCK');
});

test('split replaces an oversized task with explicit children and rewires dependents', () => {
  const data = sample();
  // B currently depends on A; split B into B1 -> B2 and check C-equivalent rewiring via a new dependent.
  data.tasks.push(task({ id: 'D', deps: ['B'] }));
  const created = splitTask(data, 'B', [
    { id: 'B1', title: 'slice 1', deps: ['A'], acceptance: ['T01'] },
    { id: 'B2', title: 'slice 2', deps: ['B1'], acceptance: ['T01'] },
  ]);
  assert.deepEqual(created.map((t) => t.id), ['B1', 'B2']);
  assert.equal(data.tasks.find((t) => t.id === 'B'), undefined);
  const d = data.tasks.find((t) => t.id === 'D');
  assert.deepEqual(new Set(d.deps), new Set(['B1', 'B2']));
  assert.deepEqual(validateBacklog(data, { acceptanceIds: new Set(['T01']) }), []);
});

test('split refuses fewer than two children, duplicate ids, DONE/IN_PROGRESS parents and non-loop kinds', () => {
  const data = sample();
  assert.throws(() => splitTask(data, 'B', [{ id: 'B1', title: 't' }]), /at least 2 child tasks/);
  assert.throws(
    () => splitTask(data, 'B', [{ id: 'A', title: 't' }, { id: 'B2', title: 't' }]),
    /A: id already in use/,
  );
  assert.throws(() => splitTask(data, 'H', [{ id: 'H1', title: 't' }, { id: 'H2', title: 't' }]), /only AUTO\/AUTO_PREP/);
  startTask(data, 'A');
  finishTask(data, 'A', ['ok']);
  assert.throws(
    () => splitTask(data, 'A', [{ id: 'A1', title: 't' }, { id: 'A2', title: 't' }]),
    /only TODO or BLOCKED/,
  );
});

test('add registers a brand-new task without touching any other task', () => {
  const data = sample();
  const created = addTask(data, { id: 'WO99-01', kind: 'AUTO_PREP', title: 'new tooling work', deps: ['A'] });
  assert.equal(created.status, 'TODO');
  assert.deepEqual(created.evidence, []);
  assert.equal(data.tasks.find((t) => t.id === 'WO99-01'), created);
  assert.deepEqual(validateBacklog(data, { acceptanceIds: new Set(['T01']) }), []);
  // AUTO_PREP needs no acceptance id; addTask itself never checks this, but the
  // validate-before-save step that every CLI command runs afterwards does.
  addTask(data, { id: 'WO99-02', kind: 'AUTO', title: 'missing acceptance', deps: [] });
  const errors = validateBacklog(data, { acceptanceIds: new Set(['T01']) });
  assert.match(errors.join('\n'), /WO99-02: AUTO task needs at least one acceptance id/);
});

test('add refuses a duplicate id, a missing title or an unknown kind', () => {
  const data = sample();
  assert.throws(() => addTask(data, { id: 'A', kind: 'AUTO', title: 't' }), /A: id already in use/);
  assert.throws(() => addTask(data, { id: 'Z', kind: 'AUTO' }), /Z: needs a title/);
  assert.throws(() => addTask(data, { id: 'Z', kind: 'NOPE', title: 't' }), /invalid kind NOPE/);
});

test('split refuses a shape that would create a dependency cycle, via the normal validate-before-save path', () => {
  const data = sample();
  const created = splitTask(data, 'B', [
    { id: 'B1', title: 'slice 1', deps: ['B2'] },
    { id: 'B2', title: 'slice 2', deps: ['B1'] },
  ]);
  assert.equal(created.length, 2);
  const errors = validateBacklog(data, { acceptanceIds: new Set(['T01']) });
  assert.match(errors.join('\n'), /dependency cycle/);
});

// OWN-A-02 (audit 10/11, A-15): ngân sách và phụ thuộc chỉ được đổi qua công cụ, có lý do và có dấu vết.
test('setBudget refuses a value that is not a positive whole number', () => {
  for (const bad of [0, -1, 2.5, Number.NaN, '7']) {
    assert.throws(() => setBudget(sample(), bad, 'why'), /positive whole number/);
  }
});

test('setBudget refuses a change with no reason, and a value below the iterations already used', () => {
  assert.throws(() => setBudget(sample(), 9, ''), /needs a reason/);
  assert.throws(() => setBudget(sample(), 9, '   '), /needs a reason/);
  const used = sample();
  used.meta.iterations_used = 8;
  assert.throws(() => setBudget(used, 7, 'why'), /below the 8 iterations already used/);
});

test('setBudget refuses a change that changes nothing', () => {
  assert.throws(() => setBudget(sample(), 5, 'why'), /already 5/);
});

test('setBudget records who asked and why, and keeps earlier entries', () => {
  const data = sample();
  assert.deepEqual(setBudget(data, 9, ' owner approved in chat ', '2026-01-01T00:00:00.000Z'), { from: 5, to: 9 });
  assert.equal(data.meta.iteration_budget, 9);
  assert.deepEqual(data.meta.budget_history, [
    { at: '2026-01-01T00:00:00.000Z', from: 5, to: 9, reason: 'owner approved in chat' },
  ]);
  setBudget(data, 11, 'second raise', '2026-01-02T00:00:00.000Z');
  assert.equal(data.meta.budget_history.length, 2);
  assert.equal(data.meta.iteration_budget, 11);
});

test('setDeps refuses an unknown task, an unknown dependency, a self dependency and no reason', () => {
  assert.throws(() => setDeps(sample(), 'NOPE', [], 'why'), /NOPE/);
  assert.throws(() => setDeps(sample(), 'B', ['GHOST'], 'why'), /unknown dependency GHOST/);
  assert.throws(() => setDeps(sample(), 'B', ['B'], 'why'), /cannot depend on itself/);
  assert.throws(() => setDeps(sample(), 'B', ['A'], ''), /needs a reason/);
});

test('setDeps replaces the list, removes duplicates and records the change', () => {
  const data = sample();
  const moved = setDeps(data, 'C', ['A', 'A', 'B'], 'legal gate moved to the release task', '2026-01-03T00:00:00.000Z');
  assert.deepEqual(moved, { id: 'C', from: ['H'], to: ['A', 'B'] });
  assert.deepEqual(data.tasks.find((t) => t.id === 'C').deps, ['A', 'B']);
  assert.deepEqual(data.meta.deps_history, [
    { at: '2026-01-03T00:00:00.000Z', id: 'C', from: ['H'], to: ['A', 'B'], reason: 'legal gate moved to the release task' },
  ]);
});

test('setDeps can clear a dependency list, and the backlog stays valid', () => {
  const data = sample();
  setDeps(data, 'C', [], 'no longer blocked');
  assert.deepEqual(data.tasks.find((t) => t.id === 'C').deps, []);
  assert.deepEqual(validateBacklog(data, { acceptanceIds: new Set(['T01']) }), []);
});
