// Diễn tập khôi phục DB cục bộ (WO16-01a, T39).
// Sao lưu logic các bảng của schema public và auth thành tệp NDJSON có manifest SHA-256, khôi phục sang
// một DB _test cô lập, rồi so số dòng, hash nội dung, chính sách RLS, trigger, hàm và kết quả RLS theo từng
// người dùng. Chỉ dùng DB có hậu tố _test và dữ liệu tổng hợp. Không dùng pg_dump: CI không cài công cụ đó.
// Giới hạn: schema của bản khôi phục lấy từ migration cùng bộ với nguồn (không từ dump); khôi phục bỏ qua trigger
// bằng session_replication_role = replica, như pg_restore --disable-triggers; object storage, RPO/RTO thật và
// staging (INF-01) chưa có.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { applyMigrations, applyShim, assertTestDatabase, databaseNameOf } from './migrate.mjs';

export const BACKUP_SCHEMAS = ['public', 'auth'];
const RESTORE_SUFFIX = '_restore_test';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const qi = (name) => `"${String(name).replace(/"/g, '""')}"`;
const qt = (schema, table) => `${qi(schema)}.${qi(table)}`;

async function connectTo(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

// Tên DB khôi phục = tên nguồn bỏ "_test" rồi thêm "_restore_test". Tên nguồn phải có hậu tố _test (assertTestDatabase).
export function restoreUrlFor(url) {
  const sourceName = assertTestDatabase(url);
  const base = sourceName.replace(/_test$/, '');
  const name = `${base}${RESTORE_SUFFIX}`;
  assertTestDatabase(`postgres://localhost/${name}`);
  const target = new URL(url);
  target.pathname = `/${encodeURIComponent(name)}`;
  return { sourceName, name, url: target.toString() };
}

export function adminUrlFor(url) {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  return admin.toString();
}

export async function listTables(client, schemas = BACKUP_SCHEMAS) {
  const { rows } = await client.query(
    `select table_schema as s, table_name as t from information_schema.tables
      where table_type = 'BASE TABLE' and table_schema = any($1::text[]) order by 1, 2`,
    [schemas],
  );
  return rows;
}

// Sao lưu logic: mỗi bảng thành một tệp NDJSON (một dòng JSON cho một hàng), sắp theo nội dung để hash ổn định.
export async function backupLogical(client, dir) {
  await mkdir(dir, { recursive: true });
  const entries = [];
  for (const { s, t } of await listTables(client)) {
    const { rows } = await client.query(
      `select to_jsonb(x)::text as row from ${qt(s, t)} x order by to_jsonb(x)::text`,
    );
    const body = rows.map((r) => r.row).join('\n');
    const file = `${s}.${t}.ndjson`;
    await writeFile(join(dir, file), body, 'utf8');
    entries.push({ schema: s, table: t, file, rows: rows.length, sha256: sha256(body) });
  }
  const manifest = { format: 'aftervia-logical-backup/1', schemas: BACKUP_SCHEMAS, tables: entries };
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

// Kiểm từng tệp theo manifest trước khi nạp; sai hash thì dừng, không nạp dữ liệu hỏng.
export async function verifyBackupFiles(dir, manifest) {
  for (const e of manifest.tables) {
    const body = await readFile(join(dir, e.file), 'utf8');
    const lines = body.length === 0 ? 0 : body.split('\n').length;
    if (sha256(body) !== e.sha256) throw new Error(`checksum mismatch: ${e.schema}.${e.table}`);
    if (lines !== e.rows) throw new Error(`row count mismatch: ${e.schema}.${e.table}`);
  }
}

async function restoreSequences(client, manifest) {
  for (const e of manifest.tables) {
    const { rows } = await client.query(
      `select column_name as c from information_schema.columns
        where table_schema = $1 and table_name = $2 and (column_default like 'nextval(%' or is_identity = 'YES')`,
      [e.schema, e.table],
    );
    for (const { c } of rows) {
      const seq = (await client.query('select pg_get_serial_sequence($1, $2) as seq', [qt(e.schema, e.table), c])).rows[0].seq;
      if (!seq) continue;
      const max = (await client.query(`select max(${qi(c)})::text as m from ${qt(e.schema, e.table)}`)).rows[0].m;
      if (max === null) await client.query('select setval($1::regclass, 1, false)', [seq]);
      else await client.query('select setval($1::regclass, $2::bigint, true)', [seq, max]);
    }
  }
}

// Nạp dữ liệu vào DB đã có schema từ migration: xóa dữ liệu tham chiếu mà migration chèn sẵn, rồi nạp bản sao lưu.
export async function restoreLogical(client, dir, manifest) {
  await verifyBackupFiles(dir, manifest);
  await client.query('set session_replication_role = replica');
  try {
    for (const e of [...manifest.tables].reverse()) await client.query(`delete from ${qt(e.schema, e.table)}`);
    for (const e of manifest.tables) {
      const body = await readFile(join(dir, e.file), 'utf8');
      if (body.length === 0) continue;
      const payload = `[${body.split('\n').join(',')}]`;
      await client.query(
        `insert into ${qt(e.schema, e.table)} overriding system value select * from jsonb_populate_recordset(null::${qt(e.schema, e.table)}, $1::jsonb)`,
        [payload],
      );
    }
    await restoreSequences(client, manifest);
  } finally {
    await client.query('set session_replication_role = origin');
  }
}

// Dấu vân tay của một DB: số dòng và md5 nội dung từng bảng, md5 chính sách RLS, trigger và hàm.
export async function fingerprint(client, manifest) {
  const tables = [];
  for (const e of manifest.tables) {
    const { rows } = await client.query(
      `select count(*)::int as n, md5(coalesce(string_agg(x, chr(10) order by x), '')) as h
         from (select to_jsonb(t)::text as x from ${qt(e.schema, e.table)} t) q`,
    );
    tables.push({ table: `${e.schema}.${e.table}`, rows: rows[0].n, md5: rows[0].h });
  }
  const policies = (await client.query(
    `select count(*)::int as n, md5(coalesce(string_agg(x, chr(10) order by x), '')) as h from (
       select concat_ws('|', schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check) as x
         from pg_policies where schemaname = any($1::text[])) q`,
    [BACKUP_SCHEMAS],
  )).rows[0];
  const triggers = (await client.query(
    `select count(*)::int as n, md5(coalesce(string_agg(x, chr(10) order by x), '')) as h from (
       select concat_ws('|', n.nspname, c.relname, t.tgname, pg_get_triggerdef(t.oid)) as x
         from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal and n.nspname = any($1::text[])) q`,
    [BACKUP_SCHEMAS],
  )).rows[0];
  const functions = (await client.query(
    `select count(*)::int as n, md5(coalesce(string_agg(x, chr(10) order by x), '')) as h from (
       select concat_ws('|', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), md5(pg_get_functiondef(p.oid))) as x
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = any($1::text[]) and p.prokind = 'f') q`,
    [BACKUP_SCHEMAS],
  )).rows[0];
  return { tables, policies, triggers, functions };
}

// Kết quả RLS của từng người dùng trên public.items: cùng một truy vấn, khác người đọc.
export async function rlsCounts(url, users) {
  const client = await connectTo(url);
  try {
    const out = {};
    for (const u of users) {
      await client.query('begin');
      try {
        const claims = u.userId ? { sub: u.userId, role: 'authenticated' } : { role: 'anon' };
        await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
        await client.query(`set local role ${u.userId ? 'authenticated' : 'anon'}`);
        // Vai trò không có quyền SELECT (anon) ghi lại mã lỗi thay vì số dòng; nguồn và bản khôi phục phải giống nhau.
        try {
          out[u.label] = (await client.query('select count(*)::int as n from public.items')).rows[0].n;
        } catch (error) {
          out[u.label] = `denied:${error.code}`;
        }
      } finally {
        await client.query('rollback');
      }
    }
    return out;
  } finally {
    await client.end();
  }
}

export async function createRestoreDatabase(adminUrl, name) {
  const admin = await connectTo(adminUrl);
  try {
    await admin.query(`drop database if exists ${qi(name)} with (force)`);
    await admin.query(`create database ${qi(name)}`);
  } finally {
    await admin.end();
  }
}

export async function dropRestoreDatabase(adminUrl, name) {
  const admin = await connectTo(adminUrl);
  try {
    await admin.query(`drop database if exists ${qi(name)} with (force)`);
  } finally {
    await admin.end();
  }
}

// Chạy toàn bộ diễn tập: sao lưu nguồn, tạo DB khôi phục, dựng schema bằng migration, nạp dữ liệu, rồi đo.
export async function runDrill(url, workDir, users) {
  const target = restoreUrlFor(url);
  const dir = join(workDir, 'backup');
  const src = await connectTo(url);
  let manifest;
  let sourceFp;
  try {
    manifest = await backupLogical(src, dir);
    sourceFp = await fingerprint(src, manifest);
  } finally {
    await src.end();
  }
  const sourceRls = await rlsCounts(url, users);
  await createRestoreDatabase(adminUrlFor(url), target.name);
  const dst = await connectTo(target.url);
  let restoredFp;
  try {
    await applyShim(dst);
    await applyMigrations(dst);
    await restoreLogical(dst, dir, manifest);
    restoredFp = await fingerprint(dst, manifest);
  } finally {
    await dst.end();
  }
  const restoredRls = await rlsCounts(target.url, users);
  return { target, dir, manifest, sourceFp, restoredFp, sourceRls, restoredRls, databaseName: databaseNameOf(url) };
}

// Đối chứng âm: đổi một dòng trong bản khôi phục và đo lại. Hash phải khác, nếu không diễn tập không có tác dụng.
export async function tamperRestored(targetUrl, manifest) {
  const client = await connectTo(targetUrl);
  try {
    await client.query("update public.items set title = title || ' (đã đổi)' where id = (select id from public.items order by id limit 1)");
    return await fingerprint(client, manifest);
  } finally {
    await client.end();
  }
}
