import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  APPEND_ONLY_FUNCTIONS,
  CATALOGUE,
  DELETION_ACTIONS,
  PERSONAL_LEVELS,
  diffCatalogue,
  highRiskUndecided,
  inventory,
  renderCatalogue,
  undecidedEntries,
} from '../../tools/legal/deletion-catalogue.mjs';
import { connect, resetTestDatabase } from '../support/db';

// HUM-LEGAL-DEL-01: danh mục xóa và giữ lại phải khớp lược đồ THẬT, nếu không chữ ký của luật sư vô nghĩa.
// Bài kiểm này là cái bẫy: thêm một bảng mà không phân loại thì đỏ ở đây.
// RLS tắt có chủ ý ở đúng một bảng dữ liệu tham chiếu; danh sách ngoại lệ ghi ngay đây chứ không ẩn đi.
const RLS_EXEMPT = ['case_transition_rules'];

let actual: Record<string, { appendOnly: string | null; rls: boolean; columns: string[] }>;

describe('HUM-LEGAL-DEL-01 the catalogue matches the schema it claims to describe', () => {
  it('reads the live schema and finds no drift in either direction', async () => {
    await resetTestDatabase();
    const client = await connect();
    try {
      actual = await inventory(client);
    } finally {
      await client.end();
    }
    const drift = diffCatalogue(CATALOGUE, actual);
    // Bảng mới chưa phân loại: luật sư không thể ký vào một danh mục thiếu bảng.
    expect(drift.undeclared).toEqual([]);
    // Bảng đã khai mà lược đồ không còn: danh mục nói về thứ không tồn tại.
    expect(drift.vanished).toEqual([]);
    // Nói "chỉ cho thêm" mà thật ra sửa được (hoặc ngược lại) là nói sai với luật sư về cơ chế.
    expect(drift.appendOnlyMismatch).toEqual([]);
    expect(Object.keys(actual).length).toBe(Object.keys(CATALOGUE).length);
  });

  it('every table has row-level security on, except the reference table named here', () => {
    const off = Object.entries(actual)
      .filter(([, v]) => !v.rls)
      .map(([t]) => t)
      .sort();
    expect(off).toEqual(RLS_EXEMPT);
  });

  it('counts the append-only tables through all three trigger functions, not just one', () => {
    // Bài học đã trả giá: chỉ tìm forbid_append_only_mutation thì bỏ sót audit_events và field_confirmations.
    expect(APPEND_ONLY_FUNCTIONS).toContain('forbid_audit_mutation');
    expect(APPEND_ONLY_FUNCTIONS).toContain('forbid_field_confirmation_mutation');
    expect(actual.audit_events?.appendOnly).toBe('forbid_audit_mutation');
    expect(actual.field_confirmations?.appendOnly).toBe('forbid_field_confirmation_mutation');
    const appendOnly = Object.entries(actual).filter(([, v]) => v.appendOnly !== null).map(([t]) => t);
    expect(appendOnly.length).toBe(11);
  });

  it('the editable side tables that exist so personal content CAN be erased are genuinely editable', () => {
    // WO11-02e-* tách nội dung cá nhân ra khỏi bảng chỉ thêm. Nếu một trong ba bảng này bị khóa lại
    // thành chỉ thêm, lời hứa "xóa được" sẽ thành lời hứa suông.
    for (const table of ['case_event_reasons', 'field_confirmation_values', 'export_bodies']) {
      expect(actual[table]?.appendOnly, table).toBeNull();
    }
  });
});

describe('HUM-LEGAL-DEL-01 the catalogue is well formed and says plainly what is undecided', () => {
  it('every entry uses a known personal-data level and a known deletion action', () => {
    for (const [table, entry] of Object.entries(CATALOGUE)) {
      expect(PERSONAL_LEVELS, table).toContain(entry.personal);
      expect(DELETION_ACTIONS, table).toContain(entry.on_deletion);
      expect(typeof entry.retention, table).toBe('string');
      if (entry.appendOnly !== null) expect(APPEND_ONLY_FUNCTIONS, table).toContain(entry.appendOnly);
    }
  });

  it('a table carrying more than identifiers, with the deletion rule still open, is flagged as high risk', () => {
    const high = highRiskUndecided();
    // Đúng những bảng mang văn bản tự do, giá trị trích xuất, hoặc toàn bộ nội dung.
    expect(high).toEqual(['billing_events', 'break_glass_requests', 'case_event_reasons', 'documents', 'field_confirmation_values', 'items']);
    for (const table of high) {
      const entry = CATALOGUE[table as keyof typeof CATALOGUE];
      expect(['extracted', 'free_text', 'content'], table).toContain(entry.personal);
      expect(entry.on_deletion, table).toBe('undecided');
    }
  });

  it('nothing is quietly marked decided: a table with no decision shows up in the open list', () => {
    const open = undecidedEntries().map((e) => e.table);
    expect(open).toContain('items');
    expect(open).toContain('billing_events');
    // Những bảng đã có cơ chế thật thì KHÔNG nằm trong danh sách chờ quyết định việc xóa.
    expect(CATALOGUE.export_bodies.on_deletion).toBe('erase');
    expect(CATALOGUE.organization_members.on_deletion).toBe('revoke');
    expect(CATALOGUE.account_tombstones.on_deletion).toBe('retain');
  });
});

describe('HUM-LEGAL-DEL-01 the drift check really trips', () => {
  it('a new table nobody classified is reported', () => {
    const drift = diffCatalogue({ a: { personal: 'none', appendOnly: null, on_deletion: 'retain', retention: 'x' } }, {
      a: { appendOnly: null, rls: true, columns: ['id'] },
      b_new_table: { appendOnly: null, rls: true, columns: ['id'] },
    });
    expect(drift.undeclared).toEqual(['b_new_table']);
  });

  it('a table that lost its append-only trigger is reported', () => {
    const drift = diffCatalogue(
      { a: { personal: 'none', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'x' } },
      { a: { appendOnly: null, rls: true, columns: ['id'] } },
    );
    expect(drift.appendOnlyMismatch).toEqual([{ table: 'a', declared: 'forbid_append_only_mutation', actual: null }]);
  });

  it('a table with row-level security off is reported', () => {
    const drift = diffCatalogue(
      { a: { personal: 'none', appendOnly: null, on_deletion: 'retain', retention: 'x' } },
      { a: { appendOnly: null, rls: false, columns: ['id'] } },
    );
    expect(drift.rlsOff).toEqual(['a']);
  });
});

describe('HUM-LEGAL-DEL-01 the generated document cannot hide what is open', () => {
  const doc = renderCatalogue(CATALOGUE, '2026-11-10');

  it('names every undecided table somewhere in the document', () => {
    for (const entry of undecidedEntries()) {
      expect(doc, entry.table).toContain(entry.table);
    }
  });

  it('puts every high-risk table in the first table, before the full inventory', () => {
    const firstSection = doc.slice(0, doc.indexOf('## 2.'));
    for (const table of highRiskUndecided()) {
      expect(firstSection, table).toContain(`**${table}**`);
    }
    expect(firstSection).toContain('CHƯA QUYẾT');
  });

  it('states it is not legal advice, and that the deletion is not finished when the receipt arrives', () => {
    expect(doc).toContain('KHÔNG phải tư vấn pháp lý');
    expect(doc).toContain('liệt kê các việc chưa hoàn tất');
    // Giới hạn tự khai phải có mặt: byte tệp ở kho ngoài, và bản sao lưu.
    expect(doc).toContain('Xóa trong cơ sở dữ liệu không xóa tệp');
    expect(doc).toContain('bản sao lưu');
  });

  it('carries a sign-off block that asks for the legal basis, not just a signature', () => {
    expect(doc).toContain('Chữ ký');
    expect(doc).toContain('căn cứ pháp lý nào');
    expect(doc).toContain('ai được xem');
  });

  it('counts the tables from the catalogue instead of a number typed by hand', () => {
    expect(doc).toContain(`${undecidedEntries().length} trên ${Object.keys(CATALOGUE).length} bảng`);
  });
});

describe('HUM-LEGAL-DEL-01 the committed document is not stale', () => {
  it('matches what the generator produces today, so editing the catalogue without regenerating is caught', () => {
    const path = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs/legal/DRAFT_danh-muc-xoa-va-giu-lai.md');
    const committed = readFileSync(path, 'utf8');
    // Ngày dựng nằm trong tệp, nên dùng lại chính nó: phép so này về NỘI DUNG, không về ngày chạy test.
    const stamped = /Ngày dựng: (\d{4}-\d{2}-\d{2})/.exec(committed);
    if (stamped === null) throw new Error('the committed document has no generation date');
    expect(committed).toBe(renderCatalogue(CATALOGUE, stamped[1]));
  });
});
