#!/usr/bin/env node
// Kiểm bundle ứng dụng di động (Android) bằng Metro thật.
//
// Vì sao cần: `typecheck:mobile` không thấy lỗi phân giải module lúc chạy. Mã di động import GIÁ TRỊ từ
// @aftervia/domain (draft.ts, request-deletion.ts, privacy.tsx), và việc Metro tìm được gói đó chỉ được
// chứng minh bằng một lần bundle thật. Script này bundle, rồi xác nhận các chuỗi đặc trưng của mã mới có
// trong bundle, để một module bị rớt khỏi bundle không lọt qua.
//
// Không nằm trong `npm run verify`: thêm một bước vào cổng là quyết định phạm vi, cần chủ dự án duyệt.
// Chạy riêng: `npm run check:mobile-bundle`. Thêm chuỗi kiểm bằng `--require=<chuỗi>` (lặp được).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MOBILE = join(ROOT, 'apps', 'mobile');
// Nằm trong .loop/ (không commit), không dùng thư mục tạm hệ thống.
const OUT = join(ROOT, '.loop', 'mobile-bundle');

const MARKERS = [
  '/v1/account/deletion', // WO11-03: đường dẫn xóa tài khoản (packages/domain/src/privacy.ts)
  'primary_data_erasure', // WO11-03: bước còn lại trong biên nhận xóa
  'LEGAL_PENDING', // OD-08: cờ danh mục xóa chờ luật sư
  'tombstone_registry_outside_backup', // WO11-02g / WO16-01b: bước xóa thứ sáu
];

function extraMarkers(argv) {
  return argv.filter((a) => a.startsWith('--require=')).map((a) => a.slice('--require='.length)).filter((s) => s.length > 0);
}

function findBundle(dir) {
  const found = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(hbc|js)$/.test(name) && /android/.test(p)) found.push(p);
    }
  };
  walk(dir);
  return found;
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const run = spawnSync('npx', ['--no-install', 'expo', 'export', '--platform', 'android', '--output-dir', OUT], {
    cwd: MOBILE,
    env: { ...process.env, EXPO_NO_TELEMETRY: '1', CI: '1' },
    encoding: 'utf8',
    timeout: 540_000,
  });
  if (run.status !== 0) {
    const tail = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim().split('\n').slice(-30).join('\n');
    console.error(`mobile bundle FAILED (exit ${run.status ?? 'timeout'}):\n${tail}`);
    process.exit(1);
  }

  const bundles = findBundle(join(OUT, '_expo'));
  if (bundles.length === 0) {
    console.error('mobile bundle FAILED: export finished but no Android bundle was written');
    process.exit(1);
  }
  const bytes = Buffer.concat(bundles.map((b) => readFileSync(b)));

  const markers = [...MARKERS, ...extraMarkers(process.argv.slice(2))];
  const missing = markers.filter((m) => !bytes.includes(Buffer.from(m, 'utf8')));
  if (missing.length > 0) {
    console.error(`mobile bundle FAILED: ${missing.length} marker(s) absent from the bundle:\n- ${missing.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`mobile bundle OK: ${bundles.length} Android bundle(s), ${bytes.length} bytes, ${markers.length}/${markers.length} markers present`);
}

main();
