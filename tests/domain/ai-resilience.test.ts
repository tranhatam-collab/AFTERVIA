import { describe, expect, it } from 'vitest';
import { runWithResilience, type AttemptOutcome, type Budget } from '@aftervia/domain';

const KEY = 'idem-doc-0001-request-1';

function neverAnswers(): Promise<AttemptOutcome> {
  return new Promise<AttemptOutcome>(() => undefined);
}

describe('WO06-04 retries, timeouts, budget and manual fallback', () => {
  it('T15 with the provider switched off, no call is made and the case falls back to manual entry', async () => {
    const budget: Budget = { cap: 100, used: 0 };
    const result = await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 10,
      maxRetries: 2,
      timeoutMs: 20,
      budget,
      attempt: null,
    });
    expect(result).toEqual({ ok: false, reason: 'provider_disabled', attempts: 0, fallback: 'manual_entry', notifications: [] });
    expect(budget.used).toBe(0);
  });

  it('T15 a provider that never answers is cut off by the timeout, retried at most twice, then the case falls back to manual entry', async () => {
    let calls = 0;
    const budget: Budget = { cap: 1000, used: 0 };
    const result = await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 10,
      maxRetries: 2,
      timeoutMs: 10,
      budget,
      attempt: () => {
        calls += 1;
        return neverAnswers();
      },
    });
    expect(calls).toBe(3);
    expect(result).toMatchObject({ ok: false, reason: 'provider_timeout', attempts: 3, fallback: 'manual_entry' });
  });

  it('T15 a fatal provider error is not retried and falls back to manual entry', async () => {
    let calls = 0;
    const result = await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 10,
      maxRetries: 2,
      timeoutMs: 50,
      budget: { cap: 100, used: 0 },
      attempt: async () => {
        calls += 1;
        return { kind: 'fatal', code: 'invalid_request' };
      },
    });
    expect(calls).toBe(1);
    expect(result).toMatchObject({ ok: false, reason: 'provider_error', attempts: 1, fallback: 'manual_entry' });
  });

  it('T16 a budget already at its cap refuses new spending before any call is made', async () => {
    let calls = 0;
    const result = await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 10,
      maxRetries: 2,
      timeoutMs: 50,
      budget: { cap: 100, used: 100 },
      attempt: async () => {
        calls += 1;
        return { kind: 'ok', text: '{}', units: 10 };
      },
    });
    expect(calls).toBe(0);
    expect(result).toMatchObject({ ok: false, reason: 'budget_exceeded', attempts: 0, fallback: 'manual_entry' });
  });

  it('T16 repeated failures stop when the budget runs out and never loop: each attempt reserves budget before it is sent', async () => {
    let calls = 0;
    const budget: Budget = { cap: 25, used: 0 };
    const result = await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 10,
      maxRetries: 2,
      timeoutMs: 50,
      budget,
      attempt: async () => {
        calls += 1;
        return { kind: 'retryable', code: 'server_error' };
      },
    });
    expect(calls).toBe(2);
    expect(budget.used).toBe(20);
    expect(result).toMatchObject({ ok: false, reason: 'budget_exceeded', attempts: 2, fallback: 'manual_entry' });
  });

  it('T16 the retry count is capped at two even when a larger value is passed', async () => {
    let calls = 0;
    await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 1,
      maxRetries: 9,
      timeoutMs: 50,
      budget: { cap: 1000, used: 0 },
      attempt: async () => {
        calls += 1;
        return { kind: 'retryable', code: 'rate_limited' };
      },
    });
    expect(calls).toBe(3);
  });

  it('T16 every retry carries the same idempotency key', async () => {
    const keys: string[] = [];
    await runWithResilience({
      idempotencyKey: KEY,
      estimatedUnits: 1,
      maxRetries: 2,
      timeoutMs: 50,
      budget: { cap: 1000, used: 0 },
      attempt: async (key) => {
        keys.push(key);
        return { kind: 'retryable', code: 'server_error' };
      },
    });
    expect(keys).toEqual([KEY, KEY, KEY]);
  });

  it('T16 budget thresholds 50, 80 and 100 are reported once, as they are crossed, and nothing is spent past the cap', async () => {
    const budget: Budget = { cap: 100, used: 0 };
    const succeed = (units: number) => async (): Promise<AttemptOutcome> => ({ kind: 'ok', text: '{}', units });
    const run = (units: number, estimate: number) =>
      runWithResilience({
        idempotencyKey: KEY,
        estimatedUnits: estimate,
        maxRetries: 0,
        timeoutMs: 50,
        budget,
        attempt: succeed(units),
      });

    expect((await run(30, 30)).notifications).toEqual([]);
    expect((await run(30, 30)).notifications).toEqual([50]);
    expect((await run(30, 30)).notifications).toEqual([80]);
    expect((await run(10, 10)).notifications).toEqual([100]);
    expect(budget.used).toBe(100);
    expect(await run(10, 10)).toMatchObject({ ok: false, reason: 'budget_exceeded', attempts: 0 });
    expect(budget.used).toBe(100);
  });
});
