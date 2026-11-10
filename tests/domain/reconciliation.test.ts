import { describe, expect, it } from 'vitest';
import {
  addAmounts,
  amount,
  assertConfirmedRevenue,
  reconcile,
  reportTotal,
  totalOf,
  type LedgerRow,
  type ReportRow,
} from '@aftervia/domain';

// WO12-03 (T30). Hai điều được khóa: chênh lệch phải bằng 0 trên fixture, và tiền thử KHÔNG BAO GIỜ
// được tính thành doanh thu thật.
const PROVIDER = 'sandbox_b2b';

function row(eventId: string, eventType: string, providerState: string, effectiveAt: string, minor = 0): ReportRow {
  return { provider: PROVIDER, eventId, eventType, providerState, effectiveAt, amount: amount('sandbox', minor, 'USD') };
}

function ledgerOf(rows: readonly ReportRow[]): LedgerRow[] {
  return rows.map(({ provider, eventId, eventType, providerState, effectiveAt }) => ({
    provider,
    eventId,
    eventType,
    providerState,
    effectiveAt,
  }));
}

const REPORT: ReportRow[] = [
  row('rep-0001', 'purchase', 'active', '2026-11-01T09:00:00.000Z', 14_900),
  row('rep-0002', 'renew', 'active', '2026-11-05T09:00:00.000Z', 14_900),
  row('rep-0003', 'cancel', 'canceled_at_period_end', '2026-11-20T09:00:00.000Z'),
];

describe('T30 the report and the ledger agree, or the difference is named', () => {
  it('T30 the difference is zero when both sides hold the same events', () => {
    const result = reconcile(REPORT, ledgerOf(REPORT));
    expect(result).toEqual({ matched: 3, missingFromLedger: [], missingFromReport: [], disagreements: [], settled: true });
  });

  it('T30 an event the provider reported but we never recorded is named, not averaged away', () => {
    const ledger = ledgerOf(REPORT).filter((r) => r.eventId !== 'rep-0002');
    const result = reconcile(REPORT, ledger);
    expect(result.settled).toBe(false);
    expect(result.missingFromLedger).toEqual(['sandbox_b2b:rep-0002']);
    expect(result.matched).toBe(2);
  });

  it('T30 an event in our ledger that the report does not list is named too', () => {
    const ledger = [...ledgerOf(REPORT), { provider: PROVIDER, eventId: 'ghost-0001', eventType: 'purchase', providerState: 'active', effectiveAt: '2026-11-09T09:00:00.000Z' }];
    const result = reconcile(REPORT, ledger);
    expect(result.settled).toBe(false);
    expect(result.missingFromReport).toEqual(['sandbox_b2b:ghost-0001']);
  });

  it('T30 a field the two sides disagree on is reported with both values', () => {
    const ledger = ledgerOf(REPORT).map((r) => (r.eventId === 'rep-0003' ? { ...r, providerState: 'expired' } : r));
    const result = reconcile(REPORT, ledger);
    expect(result.settled).toBe(false);
    expect(result.disagreements).toEqual([
      { key: 'sandbox_b2b:rep-0003', field: 'providerState', report: 'canceled_at_period_end', ledger: 'expired' },
    ]);
    // Dòng bất đồng KHÔNG được tính là khớp.
    expect(result.matched).toBe(2);
  });

  it('T30 the same instant written two ways is not a difference', () => {
    const ledger = ledgerOf(REPORT).map((r) => (r.eventId === 'rep-0001' ? { ...r, effectiveAt: '2026-11-01T16:00:00.000+07:00' } : r));
    expect(reconcile(REPORT, ledger).settled).toBe(true);
  });

  it('T30 the same event id from two providers is two events, not one', () => {
    const other: ReportRow = { ...row('rep-0001', 'purchase', 'active', '2026-11-01T09:00:00.000Z'), provider: 'sandbox_play' };
    const result = reconcile([...REPORT, other], ledgerOf(REPORT));
    expect(result.missingFromLedger).toEqual(['sandbox_play:rep-0001']);
  });
});

describe('T30 test money can never become real revenue', () => {
  it('T30 refuses to add money of two different origins, and refuses two currencies', () => {
    expect(() => addAmounts(amount('sandbox', 100, 'USD'), amount('actual', 100, 'USD') as never)).toThrow(/refusing to add/);
    expect(() => addAmounts(amount('model', 100, 'USD'), amount('model', 100, 'VND'))).toThrow(/refusing to add USD to VND/);
    expect(addAmounts(amount('sandbox', 100, 'USD'), amount('sandbox', 50, 'USD'))).toEqual({ kind: 'sandbox', minorUnits: 150, currency: 'USD' });
  });

  it('T30 only money already reconciled against the bank passes as confirmed revenue', () => {
    expect(() => assertConfirmedRevenue(amount('sandbox', 14_900, 'USD'))).toThrow(/sandbox money is not confirmed revenue/);
    expect(() => assertConfirmedRevenue(amount('model', 1_000_000, 'USD'))).toThrow(/model money is not confirmed revenue/);
    expect(assertConfirmedRevenue(amount('actual', 14_900, 'USD'))).toEqual({ kind: 'actual', minorUnits: 14_900, currency: 'USD' });
  });

  it('T30 a sandbox report totals as sandbox money, and can never report itself as actual', () => {
    const total = reportTotal(REPORT, 'USD');
    expect(total).toEqual({ kind: 'sandbox', minorUnits: 29_800, currency: 'USD' });
    expect(() => assertConfirmedRevenue(total)).toThrow(/not confirmed revenue/);
  });

  it('T30 a report that mixes origins is refused rather than silently picking one', () => {
    const mixed = [...REPORT, { ...row('rep-0009', 'purchase', 'active', '2026-11-28T09:00:00.000Z'), amount: amount('actual', 100, 'USD') }];
    expect(() => reportTotal(mixed, 'USD')).toThrow(/mixes sandbox and actual money/);
  });

  it('T30 refuses an amount that is not whole minor units, or a currency that is not ISO-shaped', () => {
    expect(() => amount('sandbox', 10.5, 'USD')).toThrow(/integer number of minor units/);
    expect(() => amount('sandbox', 10, 'usd')).toThrow(/three upper-case letters/);
    expect(totalOf('model', 'USD', [])).toEqual({ kind: 'model', minorUnits: 0, currency: 'USD' });
  });
});
