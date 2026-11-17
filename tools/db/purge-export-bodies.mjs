#!/usr/bin/env node
// D-03 (kiểm toán 10/11): chạy purge_expired_export_bodies() theo lịch do người vận hành đặt.
//
// Vì sao cần: nội dung gói xuất hết hạn đã không đọc được (hàm đọc kiểm expires_at, migration 0021), nhưng
// các hàng vẫn nằm trong export_bodies cho đến khi có người dọn. Repo không có lịch nào chạy việc đó.
// Runner này chỉ làm đúng một việc và lặp lại an toàn: không đụng dữ liệu nào còn hạn.
//
// Cấu hình: biến môi trường DATABASE_URL (vai trò dịch vụ hoặc chủ sở hữu). Không đọc từ tệp và không in ra.
// Đầu ra khi thành công: một dòng JSON trên stdout, ví dụ {"purged":5}.
// Mã thoát: 0 thành công; 1 không kết nối được hoặc hàm báo lỗi; 2 thiếu DATABASE_URL.
// Lên lịch (hạ tầng, không nằm trong repo): ví dụ crontab  `17 3 * * * DATABASE_URL=... node tools/db/purge-export-bodies.mjs`.
import { pathToFileURL } from 'node:url';
import pg from 'pg';

export async function purgeExpiredExportBodies(client) {
  const { rows } = await client.query('select public.purge_expired_export_bodies() as n');
  return Number(rows[0].n);
}

export async function run(env = process.env, out = process.stdout, err = process.stderr) {
  const url = env.DATABASE_URL;
  if (!url) {
    err.write('purge-export-bodies: DATABASE_URL is not set\n');
    return 2;
  }
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
  } catch (error) {
    // Chỉ in mã lỗi. Thông báo gốc của driver có thể chứa một phần chuỗi kết nối.
    err.write(`purge-export-bodies: cannot connect (${error?.code ?? 'unknown'})\n`);
    return 1;
  }
  try {
    const purged = await purgeExpiredExportBodies(client);
    out.write(`${JSON.stringify({ purged })}\n`);
    return 0;
  } catch (error) {
    err.write(`purge-export-bodies: purge failed (${error?.code ?? 'unknown'})\n`);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((code) => {
    process.exitCode = code;
  });
}
