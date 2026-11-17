// Lưu hàng đợi bền trên thiết bị (WO10-02). Dữ liệu không đúng hình dạng thì báo lỗi: không ghi đè, không bỏ qua âm thầm.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_STATE, type OutboxEntry, type OutboxState, type OutboxStatus, type OutboxStore } from './outbox';

// Khóa có số phiên bản: đổi hình dạng dữ liệu thì tăng số, để không đọc nhầm dữ liệu cũ.
const KEY = 'aftervia.outbox.v1';
const STATUSES: readonly string[] = ['pending', 'syncing', 'synced', 'uncertain', 'rejected', 'cancelled'] satisfies OutboxStatus[];

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isDraft(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.title === 'string' &&
    isNullableString(draft.brand) &&
    isNullableString(draft.model) &&
    isNullableString(draft.purchasedOn) &&
    isNullableString(draft.currency)
  );
}

function isEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    isDraft(entry.draft) &&
    typeof entry.idempotencyKey === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.status === 'string' &&
    STATUSES.includes(entry.status) &&
    typeof entry.attempts === 'number' &&
    Number.isInteger(entry.attempts) &&
    entry.attempts >= 0 &&
    isNullableString(entry.serverId)
  );
}

function isState(value: unknown): value is OutboxState {
  if (typeof value !== 'object' || value === null || !('entries' in value)) return false;
  return Array.isArray(value.entries) && value.entries.every(isEntry);
}

export function asyncStorageStore(): OutboxStore {
  return {
    async load() {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === null) return EMPTY_STATE;
      const parsed: unknown = JSON.parse(raw);
      if (!isState(parsed)) throw new Error('outbox_corrupt');
      return parsed;
    },
    async save(state) {
      await AsyncStorage.setItem(KEY, JSON.stringify(state));
    },
  };
}
