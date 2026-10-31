import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';
import { measureReads, runConditions, summarize } from './p95-harness';
import { perfToken, seedPerfItem, startServer } from './p95-setup';

// WO15-02: đo cục bộ theo profile khai báo. Chỉ chạy khi AFTERVIA_PERF_RUN=1, để npm run verify không ghi lại tệp kết quả.
// Profile này KHÔNG phải profile pilot đã công bố (chưa có profile đã công bố trong đặc tả). Kết quả không phải SLA.
// Đây là số đo tại một máy, một thời điểm, trên loopback, với PostgreSQL cục bộ.

const PROFILE = {
  name: 'local-profile-v1 (khai báo tạm, không phải profile pilot đã công bố)',
  operation: 'GET /v1/items/{id} với token người dùng hợp lệ, một món đồ',
  warmup_requests: 20,
  requests: 300,
  concurrency: 5,
};

const NOTES = [
  'Không phải kết quả tải pilot: profile pilot chưa được công bố (HUM-WO19-02).',
  'Không phải SLA. Không suy diễn sang môi trường khác, khu vực khác hay mạng công cộng.',
  'Yêu cầu khởi động nóng không được tính vào kết quả.',
  'Độ trễ đo ở phía máy khách (fetch), gồm cả HTTP loopback, máy chủ API và PostgreSQL cục bộ.',
];

describe('WO15-02 local profile run (gated by AFTERVIA_PERF_RUN=1)', () => {
  it.runIf(process.env.AFTERVIA_PERF_RUN === '1')(
    'T40 local profile run: 300 authenticated item reads at concurrency 5 over loopback, report written to docs/plan/evidence/perf',
    async () => {
      await resetTestDatabase();
      const itemId = await seedPerfItem();
      const admin = await connect();
      let postgresVersion = '';
      try {
        postgresVersion = String((await admin.query('show server_version')).rows[0]?.server_version ?? '');
      } finally {
        await admin.end();
      }
      const server = await startServer();
      try {
        const path = `/v1/items/${itemId}`;
        await measureReads({ baseUrl: server.baseUrl, token: perfToken(), path, requests: PROFILE.warmup_requests, concurrency: PROFILE.concurrency });
        const sample = await measureReads({ baseUrl: server.baseUrl, token: perfToken(), path, requests: PROFILE.requests, concurrency: PROFILE.concurrency });
        const result = summarize(sample);
        const report = {
          workorder: 'WO15-02',
          acceptance: 'T40 (PARTIAL: chỉ đo cục bộ theo profile khai báo)',
          profile: PROFILE,
          conditions: { ...runConditions(), postgres: postgresVersion, database: 'aftervia_test (cục bộ)' },
          result,
          notes: NOTES,
        };
        const here = dirname(fileURLToPath(import.meta.url));
        const out = join(here, '../../docs/plan/evidence/perf/WO15-02-local.json');
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
        expect(result.errors).toBe(0);
        expect(result.samples).toBe(PROFILE.requests);
      } finally {
        await server.stop();
      }
    },
  );
});
