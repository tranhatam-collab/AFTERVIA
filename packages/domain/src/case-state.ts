// Máy trạng thái của case (WO08-01). Thuần túy: không đọc đồng hồ, không ghi cơ sở dữ liệu.
// Server quyết định mọi chuyển trạng thái; client không đặt trạng thái trực tiếp.
// Mỗi chuyển trạng thái được chấp nhận có actor, thời điểm, trạng thái cũ và mới, và lý do.
// withdrawn là dừng theo yêu cầu, không tính là đã giải quyết. reopen quay về triaged và giữ outcome cũ.

export const CASE_STATES = [
  'draft',
  'submitted',
  'triaged',
  'waiting_customer',
  'waiting_merchant',
  'waiting_partner',
  'in_progress',
  'resolved',
  'closed',
  'withdrawn',
] as const;
export type CaseState = (typeof CASE_STATES)[number];

export const CASE_ACTORS = ['customer', 'merchant'] as const;
export type CaseActor = (typeof CASE_ACTORS)[number];

export const RESOLUTION_OUTCOMES = ['repaired', 'replaced', 'refunded', 'credited', 'no_remedy'] as const;
export type ResolutionOutcome = (typeof RESOLUTION_OUTCOMES)[number];

export const REASON_MAX = 500;

export interface CaseSnapshot {
  state: CaseState;
  version: number;
  outcome: ResolutionOutcome | null;
  evidenceIds: readonly string[];
}

// Dữ liệu từ client là chuỗi chưa tin cậy; hàm kiểm từng trường trước khi quyết định.
export interface CaseTransitionRequest {
  to: string;
  actor: string;
  expectedVersion: number;
  reason: string;
  outcome?: string | null;
  at: string;
}

export interface CaseEvent {
  kind: 'transition' | 'reopen';
  actor: CaseActor;
  from: CaseState;
  to: CaseState;
  reason: string;
  at: string;
  version: number;
}

export type CaseRefusal =
  | 'unknown_state'
  | 'transition_not_allowed'
  | 'not_allowed_for_actor'
  | 'version_conflict'
  | 'invalid_time'
  | 'reason_required'
  | 'reason_too_long'
  | 'outcome_required'
  | 'unknown_outcome'
  | 'evidence_required';

export type CaseTransitionResult = { ok: true; next: CaseSnapshot; event: CaseEvent } | { ok: false; reason: CaseRefusal };

interface Rule {
  from: CaseState;
  to: CaseState;
  actor: CaseActor;
  reopen?: boolean;
}

// Allowlist: mọi cạnh không có trong danh sách đều bị từ chối.
const RULES: readonly Rule[] = [
  { from: 'draft', to: 'submitted', actor: 'customer' },
  { from: 'draft', to: 'withdrawn', actor: 'customer' },
  { from: 'submitted', to: 'triaged', actor: 'merchant' },
  { from: 'submitted', to: 'withdrawn', actor: 'customer' },
  { from: 'triaged', to: 'waiting_customer', actor: 'merchant' },
  { from: 'triaged', to: 'waiting_partner', actor: 'merchant' },
  { from: 'triaged', to: 'in_progress', actor: 'merchant' },
  { from: 'triaged', to: 'withdrawn', actor: 'customer' },
  { from: 'waiting_customer', to: 'waiting_merchant', actor: 'customer' },
  { from: 'waiting_customer', to: 'withdrawn', actor: 'customer' },
  { from: 'waiting_merchant', to: 'in_progress', actor: 'merchant' },
  { from: 'waiting_merchant', to: 'withdrawn', actor: 'customer' },
  { from: 'waiting_partner', to: 'in_progress', actor: 'merchant' },
  { from: 'waiting_partner', to: 'withdrawn', actor: 'customer' },
  { from: 'in_progress', to: 'waiting_customer', actor: 'merchant' },
  { from: 'in_progress', to: 'waiting_partner', actor: 'merchant' },
  { from: 'in_progress', to: 'resolved', actor: 'merchant' },
  { from: 'in_progress', to: 'withdrawn', actor: 'customer' },
  { from: 'resolved', to: 'closed', actor: 'merchant' },
  { from: 'resolved', to: 'triaged', actor: 'customer', reopen: true },
];

export type CaseTransitionRule = Rule;
export const CASE_TRANSITION_RULES: readonly CaseTransitionRule[] = RULES;

const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function isCaseState(value: string): value is CaseState {
  return (CASE_STATES as readonly string[]).includes(value);
}

export function isCaseActor(value: string): value is CaseActor {
  return (CASE_ACTORS as readonly string[]).includes(value);
}

function isOutcome(value: string): value is ResolutionOutcome {
  return (RESOLUTION_OUTCOMES as readonly string[]).includes(value);
}

// Đã giải quyết: resolved hoặc closed. withdrawn không bao giờ tính là đã giải quyết.
export function isResolved(state: CaseState): boolean {
  return state === 'resolved' || state === 'closed';
}

export function transitionCase(snapshot: CaseSnapshot, request: CaseTransitionRequest): CaseTransitionResult {
  if (!isCaseState(request.to)) return { ok: false, reason: 'unknown_state' };
  if (!isCaseActor(request.actor)) return { ok: false, reason: 'not_allowed_for_actor' };
  if (request.expectedVersion !== snapshot.version) return { ok: false, reason: 'version_conflict' };
  if (!AT.test(request.at) || Number.isNaN(Date.parse(request.at))) return { ok: false, reason: 'invalid_time' };
  const reason = request.reason.trim();
  if (reason.length === 0) return { ok: false, reason: 'reason_required' };
  if (reason.length > REASON_MAX) return { ok: false, reason: 'reason_too_long' };

  const rule = RULES.find((r) => r.from === snapshot.state && r.to === request.to);
  if (!rule) return { ok: false, reason: 'transition_not_allowed' };
  if (rule.actor !== request.actor) return { ok: false, reason: 'not_allowed_for_actor' };

  let outcome = snapshot.outcome;
  if (rule.to === 'resolved') {
    if (request.outcome === undefined || request.outcome === null) return { ok: false, reason: 'outcome_required' };
    if (!isOutcome(request.outcome)) return { ok: false, reason: 'unknown_outcome' };
    if (snapshot.evidenceIds.length === 0) return { ok: false, reason: 'evidence_required' };
    outcome = request.outcome;
  }
  if (rule.to === 'closed') {
    if (outcome === null) return { ok: false, reason: 'outcome_required' };
    if (snapshot.evidenceIds.length === 0) return { ok: false, reason: 'evidence_required' };
  }

  const version = snapshot.version + 1;
  return {
    ok: true,
    next: { state: rule.to, version, outcome, evidenceIds: snapshot.evidenceIds },
    event: {
      kind: rule.reopen ? 'reopen' : 'transition',
      actor: rule.actor,
      from: snapshot.state,
      to: rule.to,
      reason,
      at: request.at,
      version,
    },
  };
}
