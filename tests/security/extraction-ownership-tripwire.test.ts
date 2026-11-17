import { describe, expect, it } from 'vitest';
import { connect, resetTestDatabase } from '../support/db';

// D-10 (kiểm toán 10/11): `record_field_confirmation` không kiểm quyền sở hữu `extraction_id`.
//
// Không sửa được hôm nay, và lý do nằm ngay trong migration 0006: **chưa có bảng extraction nào tồn tại**.
// `field_confirmations.extraction_id` là một uuid tự do, không khóa ngoại, không có gì để mà sở hữu.
// Hàm cũng không có đường HTTP nào gọi tới (chỉ `service_role`), nên hôm nay nó không khai thác được.
//
// Nguy hiểm thật nằm ở TƯƠNG LAI: ngày ai đó thêm bảng extraction, lỗ hổng ghi chéo tài khoản xuất hiện
// im lặng, vì hàm vẫn nhận bất kỳ uuid nào. Lời ghi chú trong migration sẽ không chặn được điều đó.
//
// Bài kiểm này biến lời ghi chú thành luật: khi bảng extraction xuất hiện, hàm PHẢI kiểm quyền sở hữu,
// nếu không thì đỏ ngay tại đây.
const OWNERSHIP_MARKERS = ['owner_user_id', 'not your extraction', 'extraction not found'];

async function ask(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
  const c = await connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

describe('D-10 the extraction ownership gap cannot reappear silently', () => {
  it('either there is still no extraction table, or record_field_confirmation checks ownership', async () => {
    await resetTestDatabase();
    const tables = await ask(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE' and table_name like '%extraction%'
        order by table_name`,
    );
    const names = tables.map((r) => r.table_name as string);

    const body = (
      await ask("select prosrc from pg_proc where proname = 'record_field_confirmation' and pronamespace = 'public'::regnamespace")
    )
      .map((r) => r.prosrc as string)
      .join('\n');
    expect(body.length, 'record_field_confirmation must exist').toBeGreaterThan(0);

    const checksOwnership = OWNERSHIP_MARKERS.some((marker) => body.includes(marker));

    if (names.length === 0) {
      // Trạng thái hôm nay: chưa có bảng nào. Ghi nhận đúng như thế, không giả vờ đã an toàn.
      expect(checksOwnership).toBe(false);
      return;
    }

    // Có bảng extraction rồi: từ lúc này hàm bắt buộc phải kiểm quyền sở hữu.
    expect(
      checksOwnership,
      `an extraction table now exists (${names.join(', ')}), so record_field_confirmation must check ownership of extraction_id (D-10)`,
    ).toBe(true);
  });

  it('the column still has no foreign key, which is the reason the check cannot be written yet', async () => {
    const fks = await ask(
      `select tc.constraint_name
         from information_schema.table_constraints tc
         join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name
        where tc.table_schema = 'public' and tc.table_name = 'field_confirmations'
          and tc.constraint_type = 'FOREIGN KEY' and k.column_name = 'extraction_id'`,
    );
    // Khi khóa ngoại này xuất hiện, bài kiểm trên là chỗ phải siết tiếp.
    expect(fks.length).toBe(0);
  });

  it('no HTTP route reaches the function today, which is why D-10 is not exploitable right now', async () => {
    const callable = await ask(
      `select has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
              has_function_privilege('anon', p.oid, 'execute') as anon
         from pg_proc p
        where p.proname = 'record_field_confirmation' and p.pronamespace = 'public'::regnamespace`,
    );
    const row = callable[0];
    if (row === undefined) throw new Error('record_field_confirmation is missing');
    expect(row.authenticated).toBe(false);
    expect(row.anon).toBe(false);
  });
});
