// WO12-03: đối soát báo cáo của nhà cung cấp với sổ sự kiện, và tách bạch tiền thật với số mô hình (T30).
//
// Hai yêu cầu của T30, và hai cơ chế tương ứng:
//
//   1. "Chênh lệch bằng 0 trên fixture" — `reconcile` so hai phía theo khóa (provider, event_id) và liệt kê
//      ba loại chênh: nhà cung cấp có mà sổ không có, sổ có mà báo cáo không có, và hai bên bất đồng về một
//      trường. Cả ba đều phải rỗng thì mới gọi là khớp.
//
//   2. "Không ghi test thành tiền thật" — mọi số tiền mang theo NGUỒN GỐC trong kiểu của nó. Cộng một số
//      sandbox vào một số thật là lỗi biên dịch, không phải lỗi phát hiện lúc chạy. Mô hình tài chính của
//      dự án tự khai `MODELED_ASSUMPTIONS_NOT_ACTUALS`; chỗ này giữ đúng kỷ luật đó trong mã.

export type AmountKind =
  // Tiền trong môi trường thử. KHÔNG BAO GIỜ được coi là doanh thu.
  | 'sandbox'
  // Tiền đã vào thật, đối soát được với sao kê ngân hàng.
  | 'actual'
  // Số của mô hình tài chính 24 tháng. Là giả định, không phải tiền.
  | 'model';

export interface TaggedAmount<K extends AmountKind = AmountKind> {
  kind: K;
  minorUnits: number;
  currency: string;
}

const CURRENCY = /^[A-Z]{3}$/;

export function amount<K extends AmountKind>(kind: K, minorUnits: number, currency: string): TaggedAmount<K> {
  if (!Number.isSafeInteger(minorUnits)) throw new RangeError('amount must be an integer number of minor units');
  if (!CURRENCY.test(currency)) throw new RangeError('currency must be three upper-case letters');
  return { kind, minorUnits, currency };
}

// Kiểu tham số K buộc hai vế cùng nguồn gốc: addAmounts(sandbox, actual) KHÔNG biên dịch được.
// Phép kiểm lúc chạy vẫn giữ, vì dữ liệu có thể đến từ JSON mà kiểu không với tới.
export function addAmounts<K extends AmountKind>(a: TaggedAmount<K>, b: TaggedAmount<K>): TaggedAmount<K> {
  if (a.kind !== b.kind) throw new TypeError(`refusing to add ${a.kind} money to ${b.kind} money`);
  if (a.currency !== b.currency) throw new TypeError(`refusing to add ${a.currency} to ${b.currency}`);
  return { kind: a.kind, minorUnits: a.minorUnits + b.minorUnits, currency: a.currency };
}

export function totalOf<K extends AmountKind>(kind: K, currency: string, amounts: readonly TaggedAmount<K>[]): TaggedAmount<K> {
  return amounts.reduce<TaggedAmount<K>>((sum, next) => addAmounts(sum, next), amount(kind, 0, currency));
}

// Cửa duy nhất để một con số được gọi là doanh thu đã xác nhận. Số sandbox và số mô hình bị chặn ở đây.
// Theo engineering/11: "Không dùng số liệu UI nội bộ làm bằng chứng tiền đã vào."
export function assertConfirmedRevenue(value: TaggedAmount): TaggedAmount<'actual'> {
  if (value.kind !== 'actual') {
    throw new TypeError(`${value.kind} money is not confirmed revenue: it must be reconciled against the bank first`);
  }
  return value as TaggedAmount<'actual'>;
}

export interface ReportRow {
  provider: string;
  eventId: string;
  eventType: string;
  providerState: string;
  effectiveAt: string;
  amount: TaggedAmount;
}

export interface LedgerRow {
  provider: string;
  eventId: string;
  eventType: string;
  providerState: string;
  effectiveAt: string;
}

export interface FieldDisagreement {
  key: string;
  field: 'eventType' | 'providerState' | 'effectiveAt';
  report: string;
  ledger: string;
}

export interface ReconciliationResult {
  matched: number;
  // Nhà cung cấp nói có, sổ của ta không có. Nguy hiểm nhất: một sự kiện đã bị mất.
  missingFromLedger: string[];
  // Sổ có, báo cáo không nhắc tới. Có thể là sự kiện giả đã lọt vào, hoặc báo cáo cắt theo kỳ khác.
  missingFromReport: string[];
  disagreements: FieldDisagreement[];
  settled: boolean;
}

export function reconciliationKey(row: { provider: string; eventId: string }): string {
  return `${row.provider}:${row.eventId}`;
}

// So hai mốc thời gian theo giá trị, không theo cách viết: cùng một lúc viết hai kiểu vẫn là khớp.
function sameInstant(a: string, b: string): boolean {
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Number.isFinite(left) && Number.isFinite(right) ? left === right : a === b;
}

export function reconcile(report: readonly ReportRow[], ledger: readonly LedgerRow[]): ReconciliationResult {
  const ledgerByKey = new Map(ledger.map((row) => [reconciliationKey(row), row]));
  const reportKeys = new Set<string>();
  const missingFromLedger: string[] = [];
  const disagreements: FieldDisagreement[] = [];
  let matched = 0;

  for (const row of report) {
    const key = reconciliationKey(row);
    reportKeys.add(key);
    const found = ledgerByKey.get(key);
    if (found === undefined) {
      missingFromLedger.push(key);
      continue;
    }
    let agrees = true;
    if (found.eventType !== row.eventType) {
      disagreements.push({ key, field: 'eventType', report: row.eventType, ledger: found.eventType });
      agrees = false;
    }
    if (found.providerState !== row.providerState) {
      disagreements.push({ key, field: 'providerState', report: row.providerState, ledger: found.providerState });
      agrees = false;
    }
    if (!sameInstant(found.effectiveAt, row.effectiveAt)) {
      disagreements.push({ key, field: 'effectiveAt', report: row.effectiveAt, ledger: found.effectiveAt });
      agrees = false;
    }
    if (agrees) matched += 1;
  }

  const missingFromReport = [...ledgerByKey.keys()].filter((key) => !reportKeys.has(key));
  return {
    matched,
    missingFromLedger,
    missingFromReport,
    disagreements,
    settled: missingFromLedger.length === 0 && missingFromReport.length === 0 && disagreements.length === 0,
  };
}

// Tổng tiền của một báo cáo. Nguồn gốc lấy từ chính các dòng: một báo cáo sandbox KHÔNG thể cho ra số 'actual'.
// Trộn nhiều nguồn gốc trong một báo cáo là lỗi, không phải chuyện để tự chọn một bên.
export function reportTotal(rows: readonly ReportRow[], currency: string): TaggedAmount {
  if (rows.length === 0) return amount('sandbox', 0, currency);
  const first = rows[0];
  if (first === undefined) return amount('sandbox', 0, currency);
  const kind = first.amount.kind;
  for (const row of rows) {
    if (row.amount.kind !== kind) throw new TypeError(`report mixes ${kind} and ${row.amount.kind} money`);
  }
  return rows.reduce<TaggedAmount>((sum, row) => addAmounts(sum, row.amount), amount(kind, 0, currency));
}
