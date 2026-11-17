// WO16-01b: sổ tài khoản đã xóa, giữ NGOÀI bản sao lưu (T26).
//
// Vì sao phải ngoài: `reapply_account_tombstones()` đọc bảng `public.account_tombstones`, mà bảng đó nằm
// TRONG bản sao lưu. Nếu một người yêu cầu xóa SAU khi bản sao lưu được tạo, bản khôi phục không có
// tombstone của họ, nên chạy lại hàm đó cũng không làm gì, và tài khoản đã xóa sống lại ở trạng thái ACTIVE.
// Đó đúng là điều T26 cấm: "Không phục hồi dữ liệu bị xóa vào active."
//
// Vì thế sổ này được xuất ra một nơi riêng, có manifest SHA-256, và được nạp lại vào bản khôi phục TRƯỚC
// khi ai đó dùng nó. Nó mang theo cả hàng `account_deletion_requests` vì tombstone tham chiếu tới đó.
//
// Chưa có hạ tầng thật: nơi "riêng" ở đây là một thư mục do người gọi chỉ định. Lưu trữ thật (khác vùng,
// khác quyền, không nằm trong lịch sao lưu của DB) là INF-01.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const REGISTRY_FORMAT = 'aftervia-tombstone-registry/1';
export const REGISTRY_FILE = 'tombstones.ndjson';
export const REGISTRY_MANIFEST = 'manifest.json';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// Một dòng một tombstone, sắp xếp ổn định để hai lần xuất cùng dữ liệu cho cùng một hash.
export async function exportTombstoneRegistry(client, dir) {
  await mkdir(dir, { recursive: true });
  const { rows } = await client.query(
    `select t.user_id, t.request_id, t.deleted_at, r.requested_at, r.receipt
       from public.account_tombstones t
       join public.account_deletion_requests r on r.request_id = t.request_id
      order by t.user_id`,
  );
  const entries = rows.map((r) => ({
    user_id: r.user_id,
    request_id: r.request_id,
    deleted_at: new Date(r.deleted_at).toISOString(),
    requested_at: new Date(r.requested_at).toISOString(),
    receipt: r.receipt,
  }));
  const body = entries.map((e) => JSON.stringify(e)).join('\n');
  await writeFile(join(dir, REGISTRY_FILE), body, 'utf8');
  const manifest = { format: REGISTRY_FORMAT, entries: entries.length, sha256: sha256(body) };
  await writeFile(join(dir, REGISTRY_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

// Đọc và KIỂM trước khi dùng. Sai hash thì dừng: một sổ xóa bị sửa là một cách đưa tài khoản đã xóa trở lại.
export async function readTombstoneRegistry(dir) {
  const manifest = JSON.parse(await readFile(join(dir, REGISTRY_MANIFEST), 'utf8'));
  if (manifest.format !== REGISTRY_FORMAT) throw new Error(`unknown registry format: ${manifest.format}`);
  const body = await readFile(join(dir, REGISTRY_FILE), 'utf8');
  if (sha256(body) !== manifest.sha256) throw new Error('tombstone registry checksum mismatch');
  const entries = body.length === 0 ? [] : body.split('\n').map((line) => JSON.parse(line));
  if (entries.length !== manifest.entries) throw new Error('tombstone registry entry count mismatch');
  return { manifest, entries };
}

// Nạp sổ vào một bản khôi phục rồi áp lại. Trả về số tombstone đã thêm và số đã áp.
// Hai bảng đều chỉ được thêm, nên nạp lại lần nữa là vô hại: hàng đã có thì bỏ qua.
export async function importTombstoneRegistry(client, dir) {
  const { entries } = await readTombstoneRegistry(dir);
  let addedRequests = 0;
  let addedTombstones = 0;
  for (const e of entries) {
    const req = await client.query(
      `insert into public.account_deletion_requests (request_id, user_id, requested_at, receipt)
       values ($1, $2, $3, $4::jsonb)
       on conflict (request_id) do nothing`,
      [e.request_id, e.user_id, e.requested_at, JSON.stringify(e.receipt)],
    );
    addedRequests += req.rowCount ?? 0;
    const tomb = await client.query(
      `insert into public.account_tombstones (user_id, request_id, deleted_at)
       values ($1, $2, $3)
       on conflict (user_id) do nothing`,
      [e.user_id, e.request_id, e.deleted_at],
    );
    addedTombstones += tomb.rowCount ?? 0;
  }
  const { rows } = await client.query('select public.reapply_account_tombstones() as applied');
  return { entries: entries.length, addedRequests, addedTombstones, applied: Number(rows[0].applied) };
}

// Ai trong sổ mà bản khôi phục vẫn để ACTIVE. Rỗng là đạt; không rỗng là T26 hỏng.
export async function resurrectedAccounts(client, dir) {
  const { entries } = await readTombstoneRegistry(dir);
  if (entries.length === 0) return [];
  const ids = entries.map((e) => e.user_id);
  const { rows } = await client.query(
    "select id from public.profiles where id = any($1::uuid[]) and deletion_status = 'ACTIVE' order by id",
    [ids],
  );
  return rows.map((r) => r.id);
}
