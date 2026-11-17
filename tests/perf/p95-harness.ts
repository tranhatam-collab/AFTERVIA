import { arch, cpus, platform, release, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';

// Đo độ trễ cục bộ (WO15-02). Đây là công cụ đo, không phải bộ kiểm SLA: không có ngưỡng đạt/không đạt trong mã.
// Mỗi lần đo ghi số mẫu, số lỗi, phân bố mã trạng thái và điều kiện chạy. Không suy diễn từ kết quả cục bộ sang tải pilot.

export interface ReadSpec {
  baseUrl: string;
  token: string;
  path: string;
  requests: number;
  concurrency: number;
}

export interface ReadSample {
  latenciesMs: number[];
  errors: number;
  statusCounts: Record<string, number>;
}

export interface Summary {
  samples: number;
  errors: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  status_counts: Record<string, number>;
}

// Phân vị theo quy tắc hạng gần nhất (nearest-rank): hạng = ceil(p/100 * n) trên mẫu đã sắp xếp.
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error('percentile of an empty sample');
  if (!(p > 0 && p <= 100)) throw new Error('p must be in (0, 100]');
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const value = sorted[rank - 1];
  if (value === undefined) throw new Error('rank outside the sample');
  return value;
}

// Gửi requests yêu cầu GET với concurrency luồng. Chỉ phản hồi 200 được tính độ trễ; mọi phản hồi khác là lỗi.
export async function measureReads(spec: ReadSpec): Promise<ReadSample> {
  const latenciesMs: number[] = [];
  const statusCounts: Record<string, number> = {};
  let errors = 0;
  let issued = 0;

  const worker = async (): Promise<void> => {
    while (issued < spec.requests) {
      issued += 1;
      const started = performance.now();
      try {
        const res = await fetch(spec.baseUrl + spec.path, { headers: { authorization: `Bearer ${spec.token}` } });
        await res.arrayBuffer();
        const elapsed = performance.now() - started;
        const key = String(res.status);
        statusCounts[key] = (statusCounts[key] ?? 0) + 1;
        if (res.status === 200) latenciesMs.push(elapsed);
        else errors += 1;
      } catch {
        errors += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: spec.concurrency }, () => worker()));
  return { latenciesMs, errors, statusCounts };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function summarize(sample: ReadSample): Summary {
  const n = sample.latenciesMs.length;
  if (n === 0) {
    return { samples: 0, errors: sample.errors, p50_ms: NaN, p95_ms: NaN, p99_ms: NaN, max_ms: NaN, status_counts: sample.statusCounts };
  }
  return {
    samples: n,
    errors: sample.errors,
    p50_ms: round2(percentile(sample.latenciesMs, 50)),
    p95_ms: round2(percentile(sample.latenciesMs, 95)),
    p99_ms: round2(percentile(sample.latenciesMs, 99)),
    max_ms: round2(Math.max(...sample.latenciesMs)),
    status_counts: sample.statusCounts,
  };
}

// Điều kiện chạy để ghi kèm mỗi kết quả. Không có thông tin nào ở đây là khóa, token hay dữ liệu cá nhân.
export function runConditions(): Record<string, string | number> {
  return {
    node: process.version,
    platform: `${platform()} ${release()}`,
    arch: arch(),
    cpus: cpus().length,
    memory_gb: Math.round(totalmem() / 2 ** 30),
    network: 'loopback 127.0.0.1, không qua mạng công cộng',
    measured_at: new Date().toISOString(),
  };
}
