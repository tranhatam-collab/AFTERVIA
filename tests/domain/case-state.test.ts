import { describe, expect, it } from 'vitest';
import { isResolved, transitionCase, type CaseSnapshot, type CaseTransitionRequest } from '@aftervia/domain';

const AT = '2026-10-31T10:00:00Z';

function snap(state: CaseSnapshot['state'], over: Partial<CaseSnapshot> = {}): CaseSnapshot {
  return { state, version: 1, outcome: null, evidenceIds: [], ...over };
}

function req(to: string, actor: string, over: Partial<CaseTransitionRequest> = {}): CaseTransitionRequest {
  return { to, actor, expectedVersion: 1, reason: 'Lý do thử', at: AT, ...over };
}

describe('WO08-01 case state machine: allowlist, outcome and evidence, withdrawn and reopen', () => {
  it('T17 a customer cannot close a case, an unknown or skipped state is refused, and the case keeps its state', () => {
    const resolved = snap('resolved', { version: 4, outcome: 'repaired', evidenceIds: ['doc-1'] });
    expect(transitionCase(resolved, req('closed', 'customer', { expectedVersion: 4 }))).toEqual({ ok: false, reason: 'not_allowed_for_actor' });
    expect(transitionCase(snap('draft'), req('resolved', 'merchant'))).toEqual({ ok: false, reason: 'transition_not_allowed' });
    expect(transitionCase(snap('triaged'), req('hacked', 'merchant'))).toEqual({ ok: false, reason: 'unknown_state' });
    expect(transitionCase(snap('triaged'), req('in_progress', 'merchant', { expectedVersion: 7 }))).toEqual({ ok: false, reason: 'version_conflict' });
    expect(resolved.state).toBe('resolved');
  });

  it('T17 the allowed path runs from draft to closed one version at a time, and every step records actor, time and reason', () => {
    let current = snap('draft');
    const steps: Array<[string, string]> = [
      ['submitted', 'customer'],
      ['triaged', 'merchant'],
      ['waiting_customer', 'merchant'],
      ['waiting_merchant', 'customer'],
      ['in_progress', 'merchant'],
    ];
    for (const [to, actor] of steps) {
      const result = transitionCase(current, req(to, actor, { expectedVersion: current.version }));
      expect(result.ok, `${current.state} -> ${to}`).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      expect(result.event).toEqual({
        kind: 'transition',
        actor,
        from: current.state,
        to,
        reason: 'Lý do thử',
        at: AT,
        version: current.version + 1,
      });
      current = result.next;
    }
    current = { ...current, evidenceIds: ['doc-1'] };
    const resolved = transitionCase(current, req('resolved', 'merchant', { expectedVersion: current.version, outcome: 'repaired' }));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error(resolved.reason);
    const closed = transitionCase(resolved.next, req('closed', 'merchant', { expectedVersion: resolved.next.version }));
    expect(closed.ok).toBe(true);
    if (!closed.ok) throw new Error(closed.reason);
    expect(closed.next).toEqual({ state: 'closed', version: 8, outcome: 'repaired', evidenceIds: ['doc-1'] });
    expect(isResolved(closed.next.state)).toBe(true);
  });

  it('T19 resolving needs an outcome from the allowed list and attached evidence, and closing needs both; a refused resolve is not resolved', () => {
    const noEvidence = snap('in_progress', { version: 6 });
    expect(transitionCase(noEvidence, req('resolved', 'merchant', { expectedVersion: 6, outcome: 'repaired' }))).toEqual({
      ok: false,
      reason: 'evidence_required',
    });
    const withEvidence = snap('in_progress', { version: 6, evidenceIds: ['doc-1'] });
    expect(transitionCase(withEvidence, req('resolved', 'merchant', { expectedVersion: 6 }))).toEqual({ ok: false, reason: 'outcome_required' });
    expect(transitionCase(withEvidence, req('resolved', 'merchant', { expectedVersion: 6, outcome: 'sent' }))).toEqual({
      ok: false,
      reason: 'unknown_outcome',
    });
    expect(isResolved(withEvidence.state)).toBe(false);

    const resolvedNoEvidence = snap('resolved', { version: 7, outcome: 'refunded' });
    expect(transitionCase(resolvedNoEvidence, req('closed', 'merchant', { expectedVersion: 7 }))).toEqual({ ok: false, reason: 'evidence_required' });
    const resolvedNoOutcome = snap('resolved', { version: 7, evidenceIds: ['doc-1'] });
    expect(transitionCase(resolvedNoOutcome, req('closed', 'merchant', { expectedVersion: 7 }))).toEqual({ ok: false, reason: 'outcome_required' });
  });

  it('T19 a withdrawn case is not resolved, only the customer can withdraw it, and it cannot be resolved or closed afterwards', () => {
    const inProgress = snap('in_progress', { version: 6, evidenceIds: ['doc-1'] });
    expect(transitionCase(inProgress, req('withdrawn', 'merchant', { expectedVersion: 6 }))).toEqual({ ok: false, reason: 'not_allowed_for_actor' });

    const withdrawn = transitionCase(inProgress, req('withdrawn', 'customer', { expectedVersion: 6 }));
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) throw new Error(withdrawn.reason);
    expect(withdrawn.next.state).toBe('withdrawn');
    expect(isResolved(withdrawn.next.state)).toBe(false);
    expect(transitionCase(withdrawn.next, req('resolved', 'merchant', { expectedVersion: 7, outcome: 'repaired' }))).toEqual({
      ok: false,
      reason: 'transition_not_allowed',
    });
    expect(transitionCase(withdrawn.next, req('closed', 'merchant', { expectedVersion: 7 }))).toEqual({ ok: false, reason: 'transition_not_allowed' });
    expect(isResolved('closed')).toBe(true);
  });

  it('T20 reopening needs a reason, returns the case to triaged as a reopen event, and keeps the earlier outcome and evidence', () => {
    const resolved = snap('resolved', { version: 7, outcome: 'repaired', evidenceIds: ['doc-1'] });
    expect(transitionCase(resolved, req('triaged', 'customer', { expectedVersion: 7, reason: '   ' }))).toEqual({ ok: false, reason: 'reason_required' });
    expect(transitionCase(resolved, req('triaged', 'merchant', { expectedVersion: 7, reason: 'Mở lại' }))).toEqual({
      ok: false,
      reason: 'not_allowed_for_actor',
    });

    const reopened = transitionCase(resolved, req('triaged', 'customer', { expectedVersion: 7, reason: '  Lỗi vẫn còn sau sửa  ' }));
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) throw new Error(reopened.reason);
    expect(reopened.event).toEqual({
      kind: 'reopen',
      actor: 'customer',
      from: 'resolved',
      to: 'triaged',
      reason: 'Lỗi vẫn còn sau sửa',
      at: AT,
      version: 8,
    });
    expect(reopened.next).toEqual({ state: 'triaged', version: 8, outcome: 'repaired', evidenceIds: ['doc-1'] });
  });

  it('T17 the transition function never changes its input, and refuses a malformed time or an overlong reason', () => {
    const input = snap('triaged', { version: 3 });
    const before = JSON.stringify(input);
    expect(transitionCase(input, req('waiting_customer', 'merchant', { expectedVersion: 3, at: '2026-10-31 10:00' }))).toEqual({
      ok: false,
      reason: 'invalid_time',
    });
    expect(transitionCase(input, req('waiting_customer', 'merchant', { expectedVersion: 3, reason: 'x'.repeat(501) }))).toEqual({
      ok: false,
      reason: 'reason_too_long',
    });
    expect(transitionCase(input, req('waiting_customer', 'merchant', { expectedVersion: 3 })).ok).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });
});
