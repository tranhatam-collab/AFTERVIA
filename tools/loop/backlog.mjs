#!/usr/bin/env node
// AFTERVIA dev-loop state machine over docs/plan/backlog.json.
// The loop may only START tasks of kind AUTO or AUTO_PREP whose dependencies are DONE.
// HUMAN, DEVICE and INFRA tasks are never started by the loop; they stay WAITING_HUMAN.
// A task can only become DONE with at least one evidence string (no PASS without a run).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'WAITING_HUMAN'];
export const KINDS = ['AUTO', 'AUTO_PREP', 'HUMAN', 'DEVICE', 'INFRA'];
export const LOOP_KINDS = new Set(['AUTO', 'AUTO_PREP']);
const ACCEPTANCE_ID = /^(T\d{2}|E\d{2}|US\d{2})$/;

export function validateBacklog(data, { acceptanceIds = null } = {}) {
  const errors = [];
  if (!data || !Array.isArray(data.tasks)) return ['tasks[] is missing'];
  const byId = new Map();
  for (const task of data.tasks) {
    const id = task.id;
    if (typeof id !== 'string' || id.length === 0) {
      errors.push('task without id');
      continue;
    }
    if (byId.has(id)) errors.push(`${id}: duplicate id`);
    byId.set(id, task);
    if (!STATUSES.includes(task.status)) errors.push(`${id}: invalid status ${task.status}`);
    if (!KINDS.includes(task.kind)) errors.push(`${id}: invalid kind ${task.kind}`);
    if (!Array.isArray(task.deps)) errors.push(`${id}: deps must be an array`);
    if (!Array.isArray(task.acceptance)) errors.push(`${id}: acceptance must be an array`);
    if (task.kind === 'AUTO' && (!task.acceptance || task.acceptance.length === 0)) {
      errors.push(`${id}: AUTO task needs at least one acceptance id`);
    }
    for (const ref of task.acceptance ?? []) {
      if (!ACCEPTANCE_ID.test(ref)) errors.push(`${id}: malformed acceptance id ${ref}`);
      else if (acceptanceIds && !acceptanceIds.has(ref)) errors.push(`${id}: unknown acceptance id ${ref}`);
    }
    if (task.status === 'DONE' && (!Array.isArray(task.evidence) || task.evidence.length === 0)) {
      errors.push(`${id}: DONE without evidence`);
    }
  }
  for (const task of data.tasks) {
    for (const dep of task.deps ?? []) {
      if (!byId.has(dep)) errors.push(`${task.id}: unknown dependency ${dep}`);
    }
  }
  const color = new Map();
  const visit = (id, path) => {
    if (color.get(id) === 'black') return;
    if (color.get(id) === 'grey') {
      errors.push(`dependency cycle: ${[...path, id].join(' -> ')}`);
      return;
    }
    color.set(id, 'grey');
    for (const dep of byId.get(id)?.deps ?? []) if (byId.has(dep)) visit(dep, [...path, id]);
    color.set(id, 'black');
  };
  for (const id of byId.keys()) visit(id, []);
  return errors;
}

export function doneIds(data) {
  return new Set(data.tasks.filter((t) => t.status === 'DONE').map((t) => t.id));
}

export function readyTasks(data) {
  const done = doneIds(data);
  return data.tasks.filter(
    (t) => LOOP_KINDS.has(t.kind) && t.status === 'TODO' && t.deps.every((d) => done.has(d)),
  );
}

// Decides the next loop action. Pure function: no I/O.
export function decide(data) {
  const budget = data.meta?.iteration_budget ?? Infinity;
  const used = data.meta?.iterations_used ?? 0;
  const inProgress = data.tasks.filter((t) => t.status === 'IN_PROGRESS');
  if (inProgress.length > 1) return { action: 'STOP_INCONSISTENT', reason: 'more than one IN_PROGRESS task', ids: inProgress.map((t) => t.id) };
  if (inProgress.length === 1) return { action: 'RESUME', task: inProgress[0].id };
  if (used >= budget) return { action: 'STOP_BUDGET', reason: `iteration budget ${budget} reached`, used };
  const ready = readyTasks(data);
  if (ready.length > 0) return { action: 'START', task: ready[0].id, ready_count: ready.length };

  const autoOpen = data.tasks.filter((t) => LOOP_KINDS.has(t.kind) && t.status === 'TODO');
  const blocked = data.tasks.filter((t) => t.status === 'BLOCKED');
  const waiting = data.tasks.filter((t) => ['HUMAN', 'DEVICE', 'INFRA'].includes(t.kind) && t.status !== 'DONE');
  if (autoOpen.length > 0) {
    return {
      action: 'STOP_STUCK',
      reason: 'automatable tasks remain but none is ready (blocked dependency or unresolved gate)',
      task_ids: autoOpen.map((t) => t.id),
    };
  }
  if (blocked.length > 0) {
    return { action: 'STOP_BLOCKED', reason: 'technical blockers recorded', task_ids: blocked.map((t) => t.id), waiting_human: waiting.map((t) => t.id) };
  }
  return { action: 'STOP_HANDOFF', reason: 'all automatable tasks are DONE; remaining work needs humans, devices or infrastructure', waiting_human: waiting.map((t) => t.id) };
}

export function startTask(data, id, now = new Date().toISOString()) {
  const task = findTask(data, id);
  if (!LOOP_KINDS.has(task.kind)) throw new Error(`${id} is ${task.kind}; the loop never starts it`);
  const active = data.tasks.find((t) => t.status === 'IN_PROGRESS' && t.id !== id);
  if (active) throw new Error(`${active.id} is already IN_PROGRESS`);
  if (task.status === 'IN_PROGRESS') return task;
  if (task.status !== 'TODO') throw new Error(`${id} is ${task.status}; only TODO can start`);
  const done = doneIds(data);
  const missing = task.deps.filter((d) => !done.has(d));
  if (missing.length > 0) throw new Error(`${id} waits for ${missing.join(', ')}`);
  task.status = 'IN_PROGRESS';
  task.attempts = (task.attempts ?? 0) + 1;
  task.started_at = now;
  data.meta = { ...(data.meta ?? {}), iterations_used: (data.meta?.iterations_used ?? 0) + 1 };
  return task;
}

export function finishTask(data, id, evidence, now = new Date().toISOString()) {
  const task = findTask(data, id);
  if (task.status !== 'IN_PROGRESS') throw new Error(`${id} is ${task.status}; only IN_PROGRESS can finish`);
  const items = (evidence ?? []).map((e) => String(e).trim()).filter(Boolean);
  if (items.length === 0) throw new Error(`${id}: DONE needs at least one evidence item`);
  task.status = 'DONE';
  task.finished_at = now;
  task.evidence = items;
  return task;
}

export function blockTask(data, id, reason, now = new Date().toISOString()) {
  const task = findTask(data, id);
  if (!reason || String(reason).trim().length === 0) throw new Error(`${id}: BLOCKED needs a reason with evidence`);
  if (!['TODO', 'IN_PROGRESS'].includes(task.status)) throw new Error(`${id} is ${task.status}; cannot block`);
  task.status = 'BLOCKED';
  task.blocked_reason = String(reason).trim();
  task.blocked_at = now;
  return task;
}

export function unblockTask(data, id) {
  const task = findTask(data, id);
  if (task.status !== 'BLOCKED') throw new Error(`${id} is ${task.status}; only BLOCKED can be unblocked`);
  task.status = 'TODO';
  delete task.blocked_reason;
  delete task.blocked_at;
  return task;
}

function findTask(data, id) {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`unknown task ${id}`);
  return task;
}

// Splits one oversized AUTO/AUTO_PREP task into several smaller ones (protocol rule 7).
// `children` must be fully explicit: each child lists its own real deps (siblings or
// existing ids), there is no implicit inheritance of the parent's deps. Any other task
// that depended on the parent now depends on ALL children (the parent's work is only
// "done" once every slice is). Cycle/shape safety is enforced by validateBacklog after
// this call returns, same as every other mutating command in main().
export function splitTask(data, parentId, children) {
  const parent = findTask(data, parentId);
  if (!LOOP_KINDS.has(parent.kind)) throw new Error(`${parentId} is ${parent.kind}; only AUTO/AUTO_PREP tasks can be split`);
  if (!['TODO', 'BLOCKED'].includes(parent.status)) throw new Error(`${parentId} is ${parent.status}; only TODO or BLOCKED can be split`);
  if (!Array.isArray(children) || children.length < 2) throw new Error('split needs at least 2 child tasks');

  const existingIds = new Set(data.tasks.map((t) => t.id));
  const childIds = [];
  for (const child of children) {
    if (typeof child.id !== 'string' || child.id.length === 0) throw new Error('each child needs a string id');
    if (existingIds.has(child.id) || childIds.includes(child.id)) throw new Error(`${child.id}: id already in use`);
    if (typeof child.title !== 'string' || child.title.length === 0) throw new Error(`${child.id}: needs a title`);
    childIds.push(child.id);
  }

  const newTasks = children.map((child) => ({
    id: child.id,
    wo: child.wo ?? parent.wo,
    gate: child.gate ?? parent.gate,
    kind: child.kind ?? parent.kind,
    title: child.title,
    deps: Array.isArray(child.deps) ? [...child.deps] : [],
    acceptance: Array.isArray(child.acceptance) ? [...child.acceptance] : [],
    status: 'TODO',
    attempts: 0,
    evidence: [],
    split_from: parentId,
  }));

  data.tasks = data.tasks.filter((t) => t.id !== parentId);
  for (const t of data.tasks) {
    if (Array.isArray(t.deps) && t.deps.includes(parentId)) {
      t.deps = [...new Set([...t.deps.filter((d) => d !== parentId), ...childIds])];
    }
  }
  data.tasks.push(...newTasks);
  return newTasks;
}

// Registers one brand-new task that is not derived from splitting an existing one
// (e.g. tooling or infra work found while reconciling an outside plan against this
// backlog). Nothing else is rewired; `deps` must name ids that already exist.
export function addTask(data, spec) {
  if (typeof spec.id !== 'string' || spec.id.length === 0) throw new Error('new task needs a string id');
  if (data.tasks.some((t) => t.id === spec.id)) throw new Error(`${spec.id}: id already in use`);
  if (typeof spec.title !== 'string' || spec.title.length === 0) throw new Error(`${spec.id}: needs a title`);
  if (!KINDS.includes(spec.kind)) throw new Error(`${spec.id}: invalid kind ${spec.kind}`);
  const task = {
    id: spec.id,
    wo: spec.wo ?? spec.id,
    gate: spec.gate,
    kind: spec.kind,
    title: spec.title,
    deps: Array.isArray(spec.deps) ? [...spec.deps] : [],
    acceptance: Array.isArray(spec.acceptance) ? [...spec.acceptance] : [],
    status: 'TODO',
    attempts: 0,
    evidence: [],
  };
  data.tasks.push(task);
  return task;
}

export function loadAcceptanceIds(matrixPath) {
  if (!existsSync(matrixPath)) return null;
  const text = readFileSync(matrixPath, 'utf8').replace(/^﻿/, '');
  const ids = new Set();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const id = line.split(',')[0];
    if (/^T\d{2}$/.test(id)) ids.add(id);
  }
  for (let i = 1; i <= 8; i += 1) ids.add(`E${String(i).padStart(2, '0')}`);
  for (let i = 1; i <= 20; i += 1) ids.add(`US${String(i).padStart(2, '0')}`);
  return ids;
}

function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function save(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const flags = { evidence: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--evidence') flags.evidence.push(rest[++i]);
    else if (arg === '--reason') flags.reason = rest[++i];
    else if (arg === '--file') flags.file = rest[++i];
    else if (arg === '--spec') flags.spec = rest[++i];
    else positional.push(arg);
  }
  return { command, positional, flags };
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { command, positional, flags } = parseArgs(argv);
  const file = flags.file ?? resolve(root, 'docs/plan/backlog.json');
  const matrix = resolve(root, 'docs/plan/02_ACCEPTANCE_MATRIX.csv');
  const data = load(file);
  const acceptanceIds = loadAcceptanceIds(matrix);

  switch (command) {
    case 'validate': {
      const errors = validateBacklog(data, { acceptanceIds });
      if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
      }
      console.log(`backlog OK: ${data.tasks.length} tasks`);
      return;
    }
    case 'decide':
      console.log(JSON.stringify(decide(data), null, 2));
      return;
    case 'next':
      console.log(JSON.stringify(readyTasks(data).map((t) => t.id)));
      return;
    case 'status': {
      const counts = {};
      for (const t of data.tasks) counts[`${t.kind}:${t.status}`] = (counts[`${t.kind}:${t.status}`] ?? 0) + 1;
      console.log(JSON.stringify({ meta: data.meta, counts }, null, 2));
      return;
    }
    case 'start':
      startTask(data, positional[0]);
      break;
    case 'done':
      finishTask(data, positional[0], flags.evidence);
      break;
    case 'block':
      blockTask(data, positional[0], flags.reason);
      break;
    case 'unblock':
      unblockTask(data, positional[0]);
      break;
    case 'split': {
      if (!flags.spec) {
        console.error('split needs --spec <path-to-json-array-of-children>');
        process.exit(2);
      }
      const children = JSON.parse(readFileSync(resolve(flags.spec), 'utf8'));
      splitTask(data, positional[0], children);
      break;
    }
    case 'add': {
      if (!flags.spec) {
        console.error('add needs --spec <path-to-json-task-object>');
        process.exit(2);
      }
      const spec = JSON.parse(readFileSync(resolve(flags.spec), 'utf8'));
      addTask(data, spec);
      break;
    }
    default:
      console.error('usage: backlog.mjs <validate|decide|next|status|start|done|block|unblock|split|add> [id] [--evidence txt]... [--reason txt] [--spec file]');
      process.exit(2);
  }
  const errors = validateBacklog(data, { acceptanceIds });
  if (errors.length > 0) {
    console.error(`refusing to write invalid backlog:\n${errors.join('\n')}`);
    process.exit(1);
  }
  save(file, data);
  console.log(`${command} ${positional[0] ?? ''} OK`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
