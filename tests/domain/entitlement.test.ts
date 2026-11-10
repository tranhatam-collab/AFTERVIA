import { describe, expect, it } from 'vitest';
import {
  ENTITLEMENT_STATES,
  cancellationGuidance,
  capabilitiesOf,
  classifyTransition,
  isEntitlementState,
  type EntitlementState,
} from '@aftervia/domain';

// WO12-02 (T29, T46). Cam kết trung tâm: mất quyền trả tiền KHÔNG bao giờ là mất dữ liệu.
describe('T29 losing the paid plan never costs the user their records', () => {
  it('every single state can still read records and still export, with no exception', () => {
    for (const state of ENTITLEMENT_STATES) {
      const caps = capabilitiesOf(state);
      expect(caps.readRecords, state).toBe(true);
      expect(caps.exportData, state).toBe(true);
    }
    // Tám trạng thái của engineering/11, không thừa không thiếu.
    expect(ENTITLEMENT_STATES.length).toBe(8);
  });

  it('refunded and expired stop the paid features and stop adding records, and nothing more', () => {
    for (const state of ['expired', 'refunded', 'disputed'] as const) {
      const caps = capabilitiesOf(state);
      expect(caps.paidFeatures, state).toBe(false);
      expect(caps.addRecords, state).toBe(false);
      expect(caps.exportData, state).toBe(true);
      expect(caps.readRecords, state).toBe(true);
    }
  });

  it('a plan that is being paid for, or is still inside its period, keeps the paid features', () => {
    for (const state of ['trial', 'active', 'grace', 'past_due', 'canceled_at_period_end'] as const) {
      expect(capabilitiesOf(state).paidFeatures, state).toBe(true);
    }
    // canceled_at_period_end vẫn còn quyền: người dùng đã trả cho kỳ này. Mất quyền là ở 'expired'.
    expect(capabilitiesOf('canceled_at_period_end').paidFeatures).toBe(true);
    expect(capabilitiesOf('expired').paidFeatures).toBe(false);
  });

  it('tells the interface when to raise the payment state with the user', () => {
    for (const state of ['grace', 'past_due', 'canceled_at_period_end', 'expired', 'disputed'] as const) {
      expect(capabilitiesOf(state).needsAttention, state).toBe(true);
    }
    for (const state of ['trial', 'active', 'refunded'] as const) {
      expect(capabilitiesOf(state).needsAttention, state).toBe(false);
    }
  });

  it('refuses a state it does not know', () => {
    for (const bad of ['paid', 'ACTIVE', '', null, 7, {}]) expect(isEntitlementState(bad)).toBe(false);
    for (const state of ENTITLEMENT_STATES) expect(isEntitlementState(state)).toBe(true);
  });
});

describe('T29 a step the provider sends is classified, never refused', () => {
  it('names the first state, a repeat, an ordinary step and a surprising one', () => {
    expect(classifyTransition(null, 'trial')).toBe('initial');
    expect(classifyTransition('active', 'active')).toBe('unchanged');
    expect(classifyTransition('active', 'past_due')).toBe('expected');
    expect(classifyTransition('past_due', 'active')).toBe('expected');
    expect(classifyTransition('canceled_at_period_end', 'expired')).toBe('expected');
    // Quay lại dùng thử sau khi đã trả tiền, hoặc hoàn tiền rồi lại hết hạn: lạ, cần người nhìn.
    expect(classifyTransition('active', 'trial')).toBe('unexpected');
    expect(classifyTransition('refunded', 'trial')).toBe('unexpected');
    expect(classifyTransition('refunded', 'expired')).toBe('unexpected');
  });

  it('every state has a way back to active, so no account is stuck forever', () => {
    for (const state of ENTITLEMENT_STATES) {
      if (state === 'active') continue;
      expect(classifyTransition(state as EntitlementState, 'active'), state).toBe('expected');
    }
  });
});

// T46: hủy ở đâu, và việc gì KHÔNG tự xảy ra theo. Nói sai chỗ này là để người dùng tiếp tục bị tính tiền.
describe('T46 cancelling and deleting are separate, and the guidance says so', () => {
  it('cancelling a plan never deletes the account, whichever provider it is', () => {
    for (const provider of ['sandbox_b2b', 'sandbox_app_store', 'sandbox_play', 'anything-else']) {
      expect(cancellationGuidance(provider).cancellingDeletesAccount, provider).toBe(false);
    }
  });

  it('for a store subscription, deleting the account does NOT cancel it: the user must do that in the store', () => {
    expect(cancellationGuidance('sandbox_app_store')).toEqual({
      venue: 'app_store',
      cancellingDeletesAccount: false,
      deletingCancelsSubscription: false,
    });
    expect(cancellationGuidance('sandbox_play')).toEqual({
      venue: 'play_store',
      cancellingDeletesAccount: false,
      deletingCancelsSubscription: false,
    });
  });

  it('for a plan bought in the app, deleting the account does end the plan', () => {
    expect(cancellationGuidance('sandbox_b2b')).toEqual({
      venue: 'in_app',
      cancellingDeletesAccount: false,
      deletingCancelsSubscription: true,
    });
  });
});
