// HUM-LEGAL-DEL-01: danh mục xóa và giữ lại dữ liệu, dựng từ lược đồ THẬT.
//
// Vì sao không viết tay: một danh mục viết tay lạc hậu ngay khi thêm bảng mới, và luật sư ký vào một
// bản lạc hậu thì chữ ký đó vô nghĩa. WO11-02c (03/11) liệt kê 7 bảng; lược đồ hôm nay có 32. Vì thế:
//
//   - Phân loại dữ liệu cá nhân là PHÁN ĐOÁN của con người, nên nó được KHAI BÁO trong tệp này.
//   - Lược đồ là SỰ THẬT, nên nó được ĐỌC từ cơ sở dữ liệu.
//   - Hàm diff so hai bên. Thêm một bảng mà không phân loại thì kiểm thử đỏ, trước khi tới người dùng.
//
// Tệp này KHÔNG phải tư vấn pháp lý và không tự quyết định gì. Cột `on_deletion` và `retention` có giá
// trị 'undecided' ở đúng những chỗ chưa ai quyết; đó là danh sách việc của luật sư, không phải lỗ hổng
// bị che. Nguồn đề xuất thời hạn: docs/spec/.../legal/04_DATA_RETENTION_AND_DELETION.md (đề xuất, không
// phải yêu cầu pháp luật).

// Ba hàm trigger khác nhau cùng làm một việc là "chỉ cho thêm". Chỉ tìm một hàm thì đếm thiếu bảng:
// audit_events và field_confirmations dùng hàm riêng.
export const APPEND_ONLY_FUNCTIONS = ['forbid_append_only_mutation', 'forbid_audit_mutation', 'forbid_field_confirmation_mutation'];

// personal: mức dữ liệu cá nhân trong bảng
//   none       — không có dữ liệu về người
//   identifier — chỉ mã định danh và mốc thời gian
//   extracted  — giá trị trích xuất từ chứng từ (ngày mua, số tiền)
//   free_text  — văn bản do người dùng tự nhập
//   content    — toàn bộ nội dung hồ sơ hoặc tệp
// on_deletion: việc hệ thống làm HÔM NAY khi có yêu cầu xóa
//   erase | redact | revoke | tombstone | retain | undecided | not_applicable
export const CATALOGUE = {
  account_deletion_requests: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Chính là hồ sơ của yêu cầu xóa. Xóa nó là xóa bằng chứng đã xử lý yêu cầu.' },
  account_tombstones: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Phải sống lâu hơn tài khoản, và được giữ cả ngoài bản sao lưu (WO16-01b), nếu không bản khôi phục sẽ đưa tài khoản đã xóa về ACTIVE.' },
  audit_events: { personal: 'identifier', appendOnly: 'forbid_audit_mutation', on_deletion: 'retain', retention: '180 ngày (đề xuất legal/04)',
    note: 'Thiết kế không đặt dữ liệu cá nhân vào details. Chưa có kiểm thử nào ép điều đó.' },
  billing_events: { personal: 'content', appendOnly: 'forbid_append_only_mutation', on_deletion: 'undecided', retention: 'undecided',
    note: 'payload lưu NGUYÊN thân webhook của nhà cung cấp, nên có thể chứa email hoặc tên. Cần luật sư quyết, và có thể cần lọc trước khi lưu.' },
  break_glass_requests: { personal: 'free_text', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'reason do nhân viên hỗ trợ nhập và nói về một case của khách.' },
  case_document_grants: { personal: 'identifier', appendOnly: null, on_deletion: 'revoke', retention: 'undecided',
    note: 'request_account_deletion đặt revoked_at cho mọi grant liên quan.' },
  case_event_reasons: { personal: 'free_text', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'Bảng SỬA ĐƯỢC, tách ra từ case_events đúng để nội dung này xóa được (WO11-02e-CASE). Cơ chế đã có; quyết định xóa hay giữ thì chưa.' },
  case_events: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Lý do tự do đã chuyển sang case_event_reasons.' },
  case_evidence: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided' },
  case_participants: { personal: 'identifier', appendOnly: null, on_deletion: 'revoke', retention: 'undecided' },
  case_transition_rules: { personal: 'none', appendOnly: null, on_deletion: 'not_applicable', retention: 'not_applicable',
    note: 'Dữ liệu tham chiếu của hệ thống.' },
  cases: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'legal/04 nói "quyền merchant giữ chứng từ hợp pháp phải tách" nhưng chưa có quy tắc. Đây chính là chỗ đó.' },
  documents: { personal: 'content', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'Hàng này chỉ là metadata; BYTE của tệp nằm ở kho ngoài chưa chọn (DEC06). Xóa hàng này không xóa tệp.' },
  entitlements: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'Trạng thái gói. legal/04 để hồ sơ thanh toán "theo luật áp dụng", chưa chốt số năm.' },
  export_bodies: { personal: 'content', appendOnly: null, on_deletion: 'erase', retention: '24 giờ (đề xuất legal/04, đã thực thi)',
    note: 'Bảng SỬA ĐƯỢC (WO11-02e-EXP) và tự hết hạn sau 24 giờ; purge_expired_export_bodies dọn.' },
  export_files: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Chỉ còn đường dẫn và băm; nội dung đã chuyển sang export_bodies.' },
  export_jobs: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Mã truy cập chỉ lưu dạng băm.' },
  family_memberships: { personal: 'identifier', appendOnly: null, on_deletion: 'revoke', retention: 'undecided' },
  field_confirmation_values: { personal: 'extracted', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'Bảng SỬA ĐƯỢC, tách từ field_confirmations (WO11-02e-CONF). Giá trị trích xuất như ngày mua, số tiền.' },
  field_confirmations: { personal: 'identifier', appendOnly: 'forbid_field_confirmation_mutation', on_deletion: 'retain', retention: 'undecided' },
  inbox_messages: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided',
    note: 'Chỉ mã và khóa văn bản, không có nội dung tự do.' },
  item_family_shares: { personal: 'identifier', appendOnly: null, on_deletion: 'revoke', retention: 'undecided' },
  items: { personal: 'free_text', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'title, brand, model do người dùng nhập. Đây là hồ sơ chính; quyết định ở đây là quyết định lớn nhất.' },
  kill_switches: { personal: 'none', appendOnly: null, on_deletion: 'not_applicable', retention: 'not_applicable' },
  organization_members: { personal: 'identifier', appendOnly: null, on_deletion: 'revoke', retention: 'undecided',
    note: 'request_account_deletion đặt status REVOKED (WO11-02g-MEM). Chủ sở hữu duy nhất bị từ chối xóa.' },
  organizations: { personal: 'identifier', appendOnly: null, on_deletion: 'retain', retention: 'undecided',
    note: 'legal_name là tên pháp nhân; với hộ kinh doanh cá thể nó có thể là tên người. Cần luật sư xem.' },
  profiles: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'Hôm nay chỉ đổi deletion_status sang PENDING_DELETION. Còn lại gì sau khi xóa xong là chưa quyết.' },
  reminder_deliveries: { personal: 'identifier', appendOnly: 'forbid_append_only_mutation', on_deletion: 'retain', retention: 'undecided' },
  reminders: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: 'undecided',
    note: 'timezone và local_time nói lên thói quen của người dùng.' },
  support_staff: { personal: 'identifier', appendOnly: null, on_deletion: 'retain', retention: 'undecided',
    note: 'Nhân viên hỗ trợ, không phải khách hàng.' },
  upload_completions: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: 'undecided' },
  upload_tickets: { personal: 'identifier', appendOnly: null, on_deletion: 'undecided', retention: '7 ngày cho tải lên thất bại (đề xuất legal/04)',
    note: 'Vé tải lên ngắn hạn.' },
};

export const PERSONAL_LEVELS = ['none', 'identifier', 'extracted', 'free_text', 'content'];
export const DELETION_ACTIONS = ['erase', 'redact', 'revoke', 'tombstone', 'retain', 'undecided', 'not_applicable'];

/**
 * Một bảng như cơ sở dữ liệu thật đang có.
 * @typedef {{ appendOnly: string | null, rls: boolean, columns: string[] }} TableFacts
 */

// Đọc lược đồ thật: bảng, cột, có chỉ-cho-thêm hay không (theo BẤT KỲ hàm nào trong danh sách), và RLS.
/**
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }} client
 * @returns {Promise<Record<string, TableFacts>>}
 */
export async function inventory(client) {
  const { rows } = await client.query(
    `select t.table_name as name,
            (select coalesce(string_agg(distinct p.proname, ','), '')
               from pg_trigger g join pg_class k on k.oid = g.tgrelid join pg_proc p on p.oid = g.tgfoid
              where not g.tgisinternal and k.relnamespace = 'public'::regnamespace and k.relname = t.table_name
                and p.proname = any($1::text[])) as append_only_fns,
            (select c.relrowsecurity from pg_class c where c.relname = t.table_name and c.relnamespace = 'public'::regnamespace) as rls,
            (select coalesce(string_agg(c.column_name, ',' order by c.ordinal_position), '')
               from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = t.table_name) as cols
       from information_schema.tables t
      where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by t.table_name`,
    [APPEND_ONLY_FUNCTIONS],
  );
  /** @type {Record<string, TableFacts>} */
  const out = {};
  for (const r of rows) {
    const fns = r.append_only_fns.length === 0 ? [] : r.append_only_fns.split(',');
    out[r.name] = { appendOnly: fns.length === 0 ? null : fns.sort()[0], rls: r.rls === true, columns: r.cols.split(',').filter(Boolean) };
  }
  return out;
}

// So bản khai báo với lược đồ thật. Rỗng hết nghĩa là danh mục còn đúng.
/**
 * @param {Record<string, { personal: string, appendOnly: string | null, on_deletion: string, retention: string, note?: string }>} declared
 * @param {Record<string, TableFacts>} actual
 */
export function diffCatalogue(declared, actual) {
  const undeclared = Object.keys(actual).filter((t) => !(t in declared)).sort();
  const vanished = Object.keys(declared).filter((t) => !(t in actual)).sort();
  /** @type {Array<{ table: string, declared: string | null, actual: string | null }>} */
  const appendOnlyMismatch = [];
  /** @type {string[]} */
  const rlsOff = [];
  for (const [table, entry] of Object.entries(declared)) {
    const real = actual[table];
    if (real === undefined) continue;
    if ((entry.appendOnly ?? null) !== (real.appendOnly ?? null)) {
      appendOnlyMismatch.push({ table, declared: entry.appendOnly ?? null, actual: real.appendOnly ?? null });
    }
    if (!real.rls) rlsOff.push(table);
  }
  return { undeclared, vanished, appendOnlyMismatch, rlsOff };
}

export function undecidedEntries(declared = CATALOGUE) {
  return Object.entries(declared)
    .filter(([, e]) => e.on_deletion === 'undecided' || e.retention === 'undecided')
    .map(([table, e]) => ({ table, personal: e.personal, on_deletion: e.on_deletion, retention: e.retention, note: e.note ?? '' }));
}

// Bảng nào mang dữ liệu cá nhân hơn mức mã định danh VÀ chưa quyết việc xóa: đây là rủi ro cao nhất.
export function highRiskUndecided(declared = CATALOGUE) {
  const heavy = new Set(['extracted', 'free_text', 'content']);
  return undecidedEntries(declared)
    .filter((e) => heavy.has(e.personal) && e.on_deletion === 'undecided')
    .map((e) => e.table);
}

const PERSONAL_LABEL = {
  none: 'không có dữ liệu về người',
  identifier: 'chỉ mã định danh',
  extracted: 'giá trị trích xuất từ chứng từ',
  free_text: 'văn bản tự do (xem ghi chú: ai nhập)',
  content: 'toàn bộ nội dung hồ sơ hoặc tệp',
};

const ACTION_LABEL = {
  erase: 'xóa',
  redact: 'che nội dung',
  revoke: 'thu hồi quyền',
  tombstone: 'ghi tombstone',
  retain: 'giữ lại',
  undecided: '**CHƯA QUYẾT**',
  not_applicable: 'không áp dụng',
};

// Dựng tài liệu cho luật sư từ danh mục. Không có số nào viết tay ở đây: mọi dòng đến từ CATALOGUE,
// nên tài liệu không thể lệch khỏi bản khai báo mà kiểm thử đang canh.
export function renderCatalogue(declared = CATALOGUE, generatedOn = new Date().toISOString().slice(0, 10)) {
  const tables = Object.keys(declared).sort();
  const open = undecidedEntries(declared);
  const high = highRiskUndecided(declared);
  const appendOnly = tables.filter((t) => declared[t].appendOnly !== null);
  const L = [];

  L.push('# Danh mục xóa và giữ lại dữ liệu — BẢN NHÁP ĐỂ LUẬT SƯ DUYỆT');
  L.push('');
  L.push(`Ngày dựng: ${generatedOn} · Nguồn: lược đồ cơ sở dữ liệu thật của AFTERVIA · Task: \`HUM-LEGAL-DEL-01\``);
  L.push('');
  L.push('> **Tài liệu này KHÔNG phải tư vấn pháp lý và không chứa quyết định pháp lý nào.** Nó là bản kiểm kê');
  L.push('> do đội kỹ thuật dựng, để luật sư có đủ dữ kiện mà quyết. Mọi ô ghi **CHƯA QUYẾT** là việc chờ');
  L.push('> luật sư, không phải lỗ hổng bị che.');
  L.push('>');
  L.push('> **Hệ thống hiện chưa có dữ liệu khách hàng thật** (chỉ dữ liệu tổng hợp trong môi trường thử).');
  L.push('> Đây là thời điểm rẻ nhất để đổi cấu trúc nếu câu trả lời pháp lý đòi hỏi.');
  L.push('>');
  L.push('> Tài liệu này được **sinh ra từ mã**, không viết tay. Có kiểm thử tự động so bản kiểm kê với lược đồ');
  L.push('> thật; thêm một bảng mà không phân loại thì kiểm thử đỏ. Nghĩa là bản luật sư ký không âm thầm lạc hậu.');
  L.push('');
  L.push(`## 1. Việc cần luật sư quyết: ${open.length} trên ${tables.length} bảng`);
  L.push('');
  L.push(`Trong đó **${high.length} bảng rủi ro cao**: chúng mang nhiều hơn mã định danh (văn bản tự do, giá trị`);
  L.push('trích xuất, hoặc toàn bộ nội dung) và việc xóa chúng chưa có quy tắc nào.');
  L.push('');
  L.push('| Bảng | Dữ liệu cá nhân | Khi xóa tài khoản | Thời hạn giữ | Ghi chú của đội kỹ thuật |');
  L.push('|---|---|---|---|---|');
  for (const table of high) {
    const e = declared[table];
    L.push(`| **${table}** | ${PERSONAL_LABEL[e.personal]} | ${ACTION_LABEL[e.on_deletion]} | ${e.retention === 'undecided' ? '**CHƯA QUYẾT**' : e.retention} | ${e.note ?? ''} |`);
  }
  L.push('');
  L.push('### Câu hỏi cụ thể cho từng bảng rủi ro cao');
  L.push('');
  L.push('1. `items` — hồ sơ chính của người dùng (tên món đồ, hãng, model, ngày mua). Khi khách yêu cầu xóa:');
  L.push('   xóa hẳn, hay giữ lại vì bên bán cần chứng từ bảo hành? Nếu giữ, giữ bao lâu và ai được xem?');
  L.push('2. `documents` — hàng trong bảng chỉ là metadata; **byte của tệp nằm ở kho ngoài chưa chọn**.');
  L.push('   Xóa hàng này KHÔNG xóa tệp. Nghĩa vụ xóa tệp trong bao lâu kể từ khi nhận yêu cầu?');
  L.push('3. `case_event_reasons` — lý do người dùng tự nhập trong lịch sử hồ sơ hậu mãi. Che nội dung có được');
  L.push('   tính là "đã xóa", hay phải xóa hẳn cả dòng lịch sử?');
  L.push('4. `field_confirmation_values` — giá trị trích xuất (ngày mua, số tiền) kèm giá trị cũ và mới.');
  L.push('5. `billing_events` — lưu **nguyên thân webhook** của nhà cung cấp thanh toán, nên có thể chứa email');
  L.push('   hoặc tên. Hai câu hỏi: được giữ bao lâu theo nghĩa vụ kế toán, và có phải lọc trước khi lưu?');
  L.push('6. `break_glass_requests` — lý do nhân viên hỗ trợ nhập khi xin quyền xem một hồ sơ. Nói về khách.');
  L.push('');
  L.push('## 2. Những việc hệ thống ĐÃ làm hôm nay khi có yêu cầu xóa');
  L.push('');
  L.push('Phần này không chờ quyết định; nó đã chạy và có kiểm thử:');
  L.push('');
  L.push('- Yêu cầu xóa chỉ được nhận khi phiên đăng nhập vừa được cấp trong **5 phút** (xác thực lại).');
  L.push('- Mọi quyền chia sẻ tài liệu và mọi vai trò tham gia hồ sơ bị **thu hồi** ngay.');
  L.push('- Thành viên tổ chức chuyển sang **REVOKED**. Người là chủ sở hữu duy nhất của một tổ chức còn hoạt');
  L.push('  động thì **bị từ chối** xóa, kèm lý do, để tổ chức không mất chủ.');
  L.push('- Tài khoản chuyển sang `PENDING_DELETION`; mọi thao tác ghi bị chặn ở tầng cơ sở dữ liệu.');
  L.push('- Một **tombstone** được ghi, và được giữ cả **ngoài bản sao lưu**, nên khôi phục một bản sao lưu cũ');
  L.push('  hơn lần xóa KHÔNG đưa tài khoản đã xóa trở lại hoạt động.');
  L.push('- Biên nhận trả cho người dùng **liệt kê các việc chưa hoàn tất**, không báo một câu "đã xóa xong".');
  L.push('- Gói xuất dữ liệu tạm tự hết hạn sau **24 giờ**.');
  L.push('');
  L.push(`## 3. Bản kiểm kê đầy đủ: ${tables.length} bảng`);
  L.push('');
  L.push(`${appendOnly.length} bảng là **chỉ cho thêm** (không sửa, không xóa được, kể cả bởi chủ bảng).`);
  L.push('Nội dung cá nhân đã được chuyển ra các bảng sửa được bên cạnh, đúng để nó xóa được khi cần.');
  L.push('');
  L.push('| Bảng | Dữ liệu cá nhân | Chỉ thêm | Khi xóa tài khoản | Thời hạn giữ | Ghi chú |');
  L.push('|---|---|---|---|---|---|');
  for (const table of tables) {
    const e = declared[table];
    L.push(
      `| \`${table}\` | ${PERSONAL_LABEL[e.personal]} | ${e.appendOnly === null ? '—' : 'có' } | ${ACTION_LABEL[e.on_deletion]} | ${e.retention === 'undecided' ? '**CHƯA QUYẾT**' : e.retention} | ${e.note ?? ''} |`,
    );
  }
  L.push('');
  L.push('## 4. Giới hạn mà đội kỹ thuật tự khai');
  L.push('');
  L.push('- **Byte của tệp tài liệu nằm ở kho ngoài chưa được chọn.** Xóa trong cơ sở dữ liệu không xóa tệp.');
  L.push('  Quyết định kho (DEC06) còn mở, và nó quyết định được hay không việc xóa tệp trong một thời hạn.');
  L.push('- **Bản sao lưu** luân chuyển 30 ngày (đề xuất). Dữ liệu đã xóa còn nằm trong bản sao lưu đến khi hết');
  L.push('  vòng; cơ chế tombstone bảo đảm khôi phục không đưa nó về hoạt động, nhưng **không** làm nó biến mất.');
  L.push('- **Thời hạn giữ hồ sơ thanh toán chưa chốt**; mô hình tài chính của dự án tự khai là số giả định.');
  L.push('- **Chưa có nhà cung cấp danh tính thật**, nên "xác thực lại" hiện là kiểm tuổi của phiên, chưa phải');
  L.push('  nhập lại mật khẩu hay OTP.');
  L.push('- **Chưa có đánh giá bảo mật độc lập.** Không mục nào ở đây được coi là đã được bên thứ ba xác nhận.');
  L.push('');
  L.push('## 5. Ô ký');
  L.push('');
  L.push('Luật sư điền vào bảng ở mục 1 và mục 3, rồi ký vào đây. Khi đã có bản ký, đội kỹ thuật cập nhật');
  L.push('`tools/legal/deletion-catalogue.mjs` theo đúng bản ký, và kiểm thử sẽ canh để nó không lạc hậu.');
  L.push('');
  L.push('| Mục | Nội dung |');
  L.push('|---|---|');
  L.push('| Người duyệt | ____________________ |');
  L.push('| Vai trò và tổ chức | ____________________ |');
  L.push('| Phạm vi pháp lý đã xét (quốc gia, luật áp dụng) | ____________________ |');
  L.push('| Ngày | ____________________ |');
  L.push('| Chữ ký | ____________________ |');
  L.push('');
  L.push('Phần luật sư cần ghi rõ khi duyệt: với mỗi bảng, **xóa / che nội dung / giữ lại**; nếu giữ lại thì');
  L.push('**bao lâu**, **căn cứ pháp lý nào**, và **ai được xem** trong thời gian giữ.');
  L.push('');
  return `${L.join('\n')}\n`;
}

if (process.argv[2] === 'render') {
  process.stdout.write(renderCatalogue());
}
