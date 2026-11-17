// Kiểm bản nháp từ biểu mẫu trước khi xếp hàng (WO10-02). Dùng đúng quy tắc của miền dữ liệu.
import { normalizeItemFields, type ItemFields } from '@aftervia/domain';

export type DraftResult = { ok: true; value: ItemFields } | { ok: false; field: string };

export interface DraftForm {
  title: string;
  brand: string;
  model: string;
  purchasedOn: string;
  currency: string;
}

// Ô trống được coi là không có giá trị (null). Tên món đồ vẫn bắt buộc, do miền dữ liệu kiểm.
export function draftFromForm(form: DraftForm): DraftResult {
  const optional = (text: string): string | null => (text.trim() === '' ? null : text.trim());
  const result = normalizeItemFields({
    title: form.title,
    brand: optional(form.brand),
    model: optional(form.model),
    purchased_on: optional(form.purchasedOn),
    currency: optional(form.currency),
  });
  return result.ok ? { ok: true, value: result.value } : { ok: false, field: result.field };
}
