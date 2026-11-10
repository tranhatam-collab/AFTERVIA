import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asActor, connect, resetTestDatabase, testDatabaseUrl } from '../support/db';
import { adminUrlFor, backupLogical, createRestoreDatabase, dropRestoreDatabase, restoreLogical, restoreUrlFor } from '../../tools/db/restore-drill.mjs';
import { applyMigrations, applyShim } from '../../tools/db/migrate.mjs';
import {
  REGISTRY_FILE,
  exportTombstoneRegistry,
  importTombstoneRegistry,
  readTombstoneRegistry,
  resurrectedAccounts,
} from '../../tools/db/tombstone-registry.mjs';

// WO16-01b (T26): "Không phục hồi dữ liệu bị xóa vào active."
//
// Kịch bản là trường hợp xấu thật sự, không phải trường hợp dễ: bản sao lưu được tạo TRƯỚC khi người dùng
// yêu cầu xóa. Khi đó bản khôi phục không có tombstone nào của họ, nên chạy reapply_account_tombstones()
// trên chính nó cũng vô ích. Chỉ một sổ giữ NGOÀI bản sao lưu mới cứu được.
// Dữ liệu tổng hợp, chỉ trên DB _test cục bộ.
const LEAVER = '00000000-0000-4000-8000-00000000f001';
const STAYER = '00000000-0000-4000-8000-00000000f002';
const REQUEST_ID = 'erase-restore-0001';

let workDir = '';
let backupDir = '';
let registryDir = '';
let target: { url: string; name: string } | null = null;
let manifest: { tables: Array<{ table: string; schema: string; file: string; rows: number }> } | null = null;

async function onRestored<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  if (target === null) throw new Error('no restored database');
  const client = new pg.Client({ connectionString: target.url });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function deletionStatus(client: pg.Client, userId: string): Promise<string | undefined> {
  const { rows } = await client.query('select deletion_status from public.profiles where id = $1', [userId]);
  return rows[0]?.deletion_status as string | undefined;
}

beforeAll(async () => {
  await resetTestDatabase();
  workDir = await mkdtemp(join(tmpdir(), 'aftervia-tombstone-'));
  backupDir = join(workDir, 'backup');
  // Sổ nằm ở thư mục KHÁC, không phải thư mục con của bản sao lưu: đó là cả ý nghĩa của "ngoài backup".
  registryDir = join(workDir, 'registry');

  const admin = await connect();
  try {
    await admin.query('insert into auth.users (id, email) values ($1,$2),($3,$4)', [
      LEAVER, 'leaver@restore.test.invalid',
      STAYER, 'stayer@restore.test.invalid',
    ]);
  } finally {
    await admin.end();
  }
  await asActor(LEAVER, (c) => c.query("select public.create_item('Máy sấy', null, null, null, 'VND')"));
  await asActor(STAYER, (c) => c.query("select public.create_item('Quạt', null, null, null, 'VND')"));

  // 1. Sao lưu TRƯỚC khi có yêu cầu xóa nào.
  const src = await connect();
  try {
    manifest = await backupLogical(src, backupDir);
  } finally {
    await src.end();
  }

  // 2. Người dùng yêu cầu xóa, qua đúng hàm thật (asActor cấp iat mới nên qua được cổng xác thực lại).
  await asActor(LEAVER, (c) => c.query('select public.request_account_deletion($1::text)', [REQUEST_ID]));

  // 3. Xuất sổ ra ngoài bản sao lưu.
  const after = await connect();
  try {
    await exportTombstoneRegistry(after, registryDir);
  } finally {
    await after.end();
  }

  // 4. Khôi phục bản sao lưu cũ sang một DB cô lập.
  target = restoreUrlFor(testDatabaseUrl());
  await createRestoreDatabase(adminUrlFor(testDatabaseUrl()), target.name);
  await onRestored(async (c) => {
    await applyShim(c);
    await applyMigrations(c);
    await restoreLogical(c, backupDir, manifest);
  });
});

afterAll(async () => {
  if (target) await dropRestoreDatabase(adminUrlFor(testDatabaseUrl()), target.name);
  if (workDir) await rm(workDir, { recursive: true, force: true });
});

describe('T26 a backup older than the deletion would bring the account back', () => {
  it('T26 the backup genuinely predates the deletion: it carries no tombstone at all', async () => {
    const entry = manifest?.tables.find((t) => t.table === 'account_tombstones' || t.table === 'public.account_tombstones');
    // Bảng có trong bản sao lưu nhưng rỗng: đó mới là lý do bản khôi phục nguy hiểm.
    expect(entry?.rows ?? 0).toBe(0);
  });

  it('T26 the restored copy has the account back as ACTIVE, which is exactly what must not stand', async () => {
    await onRestored(async (c) => {
      expect(await deletionStatus(c, LEAVER)).toBe('ACTIVE');
      // Chạy lại hàm trên chính bản khôi phục không cứu được: nó đọc một bảng rỗng.
      const { rows } = await c.query('select public.reapply_account_tombstones() as applied');
      expect(Number(rows[0].applied)).toBe(0);
      expect(await deletionStatus(c, LEAVER)).toBe('ACTIVE');
      expect(await resurrectedAccounts(c, registryDir)).toEqual([LEAVER]);
    });
  });
});

describe('T26 the registry kept outside the backup puts the deletion back', () => {
  it('T26 importing the registry marks the account as pending deletion again', async () => {
    await onRestored(async (c) => {
      const result = await importTombstoneRegistry(c, registryDir);
      expect(result.entries).toBe(1);
      expect(result.addedRequests).toBe(1);
      expect(result.addedTombstones).toBe(1);
      expect(result.applied).toBe(1);
      expect(await deletionStatus(c, LEAVER)).toBe('PENDING_DELETION');
      // Người không yêu cầu xóa thì không bị đụng tới.
      expect(await deletionStatus(c, STAYER)).toBe('ACTIVE');
      expect(await resurrectedAccounts(c, registryDir)).toEqual([]);
    });
  });

  it('T26 importing a second time changes nothing and does not fail', async () => {
    await onRestored(async (c) => {
      const again = await importTombstoneRegistry(c, registryDir);
      expect(again.addedRequests).toBe(0);
      expect(again.addedTombstones).toBe(0);
      expect(await resurrectedAccounts(c, registryDir)).toEqual([]);
    });
  });

  it('T26 the restored copy keeps the records of the account that never asked to leave', async () => {
    await onRestored(async (c) => {
      const { rows } = await c.query('select count(*)::int as n from public.items');
      expect(rows[0].n).toBe(2);
    });
  });
});

describe('T26 a registry that has been edited is refused', () => {
  it('T26 a changed entry breaks the checksum, so a tampered registry cannot be used to resurrect anyone', async () => {
    const file = join(registryDir, REGISTRY_FILE);
    const original = await readFile(file, 'utf8');
    try {
      await writeFile(file, original.replace(LEAVER, STAYER), 'utf8');
      await expect(readTombstoneRegistry(registryDir)).rejects.toThrow(/checksum mismatch/);
      await onRestored(async (c) => {
        await expect(importTombstoneRegistry(c, registryDir)).rejects.toThrow(/checksum mismatch/);
      });
    } finally {
      await writeFile(file, original, 'utf8');
    }
    // Khôi phục xong thì sổ lại dùng được: phép kiểm là về nội dung, không phải một cờ dính vĩnh viễn.
    const { entries } = await readTombstoneRegistry(registryDir);
    expect(entries.map((e: { user_id: string }) => e.user_id)).toEqual([LEAVER]);
  });

  it('T26 an empty registry is valid and resurrects nobody', async () => {
    // Sổ rỗng dựng tay, đúng định dạng. sha256 của chuỗi rỗng.
    const emptyDir = join(workDir, 'empty-registry');
    await mkdir(emptyDir, { recursive: true });
    await writeFile(join(emptyDir, REGISTRY_FILE), '', 'utf8');
    await writeFile(
      join(emptyDir, 'manifest.json'),
      `${JSON.stringify({ format: 'aftervia-tombstone-registry/1', entries: 0, sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }, null, 2)}\n`,
      'utf8',
    );
    const { entries } = await readTombstoneRegistry(emptyDir);
    expect(entries).toEqual([]);
    await onRestored(async (c) => {
      expect(await resurrectedAccounts(c, emptyDir)).toEqual([]);
    });
  });
});
