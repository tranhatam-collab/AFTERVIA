import { describe, expect, it } from 'vitest';
import { resetTestDatabase } from '../support/db';
import { measureReads, percentile, runConditions, summarize } from './p95-harness';
import { perfToken, seedPerfItem, startServer } from './p95-setup';

// WO15-02, mã T40. Kiểm công cụ đo, không kiểm SLA. Phần đo thật nằm trong p95-local-run.test.ts và chỉ chạy khi có cờ.
// Kiểm: phân vị đúng; một lần đo nhỏ qua HTTP thật với PostgreSQL cục bộ cho số mẫu đúng, không lỗi và có điều kiện chạy.

describe('WO15-02 local latency measurement: percentile maths and a small measured run', () => {
  it('T40 the percentile uses the nearest-rank rule and rejects an empty sample', () => {
    expect(percentile(Array.from({ length: 100 }, (_, i) => i + 1), 95)).toBe(95);
    expect(percentile([42], 99)).toBe(42);
    expect(percentile([5, 1, 4, 2, 3], 50)).toBe(3);
    expect(() => percentile([], 95)).toThrow('empty');
    expect(() => percentile([1, 2], 0)).toThrow('p must be');
  });

  it('T40 a small run over HTTP reports sample size, zero errors and the run conditions', async () => {
    await resetTestDatabase();
    const itemId = await seedPerfItem();
    const server = await startServer();
    try {
      const sample = await measureReads({
        baseUrl: server.baseUrl,
        token: perfToken(),
        path: `/v1/items/${itemId}`,
        requests: 30,
        concurrency: 3,
      });
      const summary = summarize(sample);
      expect(summary.samples).toBe(30);
      expect(summary.errors).toBe(0);
      expect(summary.status_counts).toEqual({ '200': 30 });
      expect(summary.p95_ms).toBeGreaterThan(0);
      expect(summary.p95_ms).toBeGreaterThanOrEqual(summary.p50_ms);
      expect(summary.max_ms).toBeGreaterThanOrEqual(summary.p99_ms);
      expect(runConditions()).toMatchObject({ node: process.version, network: expect.stringContaining('loopback') });
    } finally {
      await server.stop();
    }
  });
});
