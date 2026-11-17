// Hàng đợi offline của bản nháp món đồ (WO10-02). Không import thư viện của thiết bị nên kiểm thử được trên Node.
// Quy tắc, phần logic của T23:
// - Bản nháp luôn hiện là "chờ đồng bộ" cho đến khi máy chủ xác nhận.
// - Mỗi bản nháp được gửi thành công tối đa một lần. Nhiều lần đồng bộ cùng lúc vẫn chỉ có một lượt gửi.
// - Kết quả chưa rõ (có thể đã được lưu) không tự gửi lại. Chỉ gửi lại khi người dùng xác nhận.
// - Không báo "đã đồng bộ" nếu máy chủ không xác nhận.
import type { ItemFields } from '@aftervia/domain';

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'uncertain' | 'rejected' | 'cancelled';

export interface OutboxEntry {
  readonly id: string;
  readonly draft: ItemFields;
  readonly idempotencyKey: string;
  readonly createdAt: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly serverId: string | null;
}

export interface OutboxState {
  readonly entries: readonly OutboxEntry[];
}

// ok: máy chủ xác nhận đã tạo và trả về mã.
// rejected: máy chủ từ chối dữ liệu. Không tự gửi lại.
// deferred: chưa xử lý được (chưa đăng nhập). Giữ chờ đồng bộ và dừng lượt gửi.
// unknown: có thể đã được xử lý (mất kết nối sau khi gửi, lỗi máy chủ). Không tự gửi lại.
export type SendOutcome =
  | { readonly kind: 'ok'; readonly serverId: string }
  | { readonly kind: 'rejected' }
  | { readonly kind: 'deferred' }
  | { readonly kind: 'unknown' };

export type Sender = (entry: OutboxEntry) => Promise<SendOutcome>;

export interface OutboxStore {
  load(): Promise<OutboxState>;
  save(state: OutboxState): Promise<void>;
}

export const EMPTY_STATE: OutboxState = { entries: [] };

function changeEntry(state: OutboxState, id: string, change: (entry: OutboxEntry) => OutboxEntry): OutboxState {
  if (!state.entries.some((entry) => entry.id === id)) throw new Error(`unknown_entry:${id}`);
  return { entries: state.entries.map((entry) => (entry.id === id ? change(entry) : entry)) };
}

export function enqueue(
  state: OutboxState,
  input: { id: string; draft: ItemFields; idempotencyKey: string; createdAt: string },
): OutboxState {
  if (state.entries.some((entry) => entry.id === input.id)) throw new Error(`duplicate_entry:${input.id}`);
  const entry: OutboxEntry = {
    id: input.id,
    draft: input.draft,
    idempotencyKey: input.idempotencyKey,
    createdAt: input.createdAt,
    status: 'pending',
    attempts: 0,
    serverId: null,
  };
  return { entries: [...state.entries, entry] };
}

// Chỉ hủy được khi chắc chắn chưa gửi: đang chờ hoặc đã bị từ chối. Bản đã gửi hoặc chưa rõ thì giữ nguyên.
export function cancel(state: OutboxState, id: string): OutboxState {
  return changeEntry(state, id, (entry) =>
    entry.status === 'pending' || entry.status === 'rejected' ? { ...entry, status: 'cancelled' } : entry,
  );
}

// Người dùng xác nhận đã kiểm tra danh sách trên máy chủ: bản chưa rõ được đưa lại vào hàng chờ, giữ nguyên khóa gửi.
export function confirmRetry(state: OutboxState, id: string): OutboxState {
  return changeEntry(state, id, (entry) => (entry.status === 'uncertain' ? { ...entry, status: 'pending' } : entry));
}

// Mở lại sau khi ứng dụng đóng giữa chừng: bản đang gửi dở có thể đã được lưu, nên chuyển sang chưa rõ.
export function recover(state: OutboxState): OutboxState {
  return {
    entries: state.entries.map((entry) => (entry.status === 'syncing' ? { ...entry, status: 'uncertain' } : entry)),
  };
}

export function markSyncing(state: OutboxState, id: string): OutboxState {
  return changeEntry(state, id, (entry) => (entry.status === 'pending' ? { ...entry, status: 'syncing' } : entry));
}

export function applyOutcome(state: OutboxState, id: string, outcome: SendOutcome): OutboxState {
  return changeEntry(state, id, (entry) => {
    switch (outcome.kind) {
      case 'ok':
        return { ...entry, status: 'synced', serverId: outcome.serverId, attempts: entry.attempts + 1 };
      case 'rejected':
        return { ...entry, status: 'rejected', attempts: entry.attempts + 1 };
      case 'deferred':
        return { ...entry, status: 'pending' };
      case 'unknown':
        return { ...entry, status: 'uncertain', attempts: entry.attempts + 1 };
    }
  });
}

// Lưu trữ trong bộ nhớ: dùng cho kiểm thử và khi chưa có lưu trữ bền.
export function memoryStore(initial: OutboxState = EMPTY_STATE): OutboxStore {
  let stored = initial;
  return {
    load: async () => stored,
    save: async (state) => {
      stored = state;
    },
  };
}

// Hàng đợi có trạng thái. Các thay đổi đều được lưu trước khi báo cho người nghe.
export class Outbox {
  private readonly store: OutboxStore;
  private current: OutboxState;
  private running: Promise<void> | null = null;
  // Các thay đổi nối tiếp nhau trên hàng đợi này; xem update().
  private queue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(state: OutboxState) => void>();

  private constructor(store: OutboxStore, initial: OutboxState) {
    this.store = store;
    this.current = initial;
  }

  // Mở hàng đợi: đọc lưu trữ, chuyển bản đang gửi dở sang chưa rõ, rồi lưu lại.
  static async open(store: OutboxStore): Promise<Outbox> {
    const recovered = recover(await store.load());
    await store.save(recovered);
    return new Outbox(store, recovered);
  }

  get state(): OutboxState {
    return this.current;
  }

  subscribe(listener: (state: OutboxState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async add(input: { id: string; draft: ItemFields; idempotencyKey: string; createdAt: string }): Promise<void> {
    await this.update((state) => enqueue(state, input));
  }

  async cancel(id: string): Promise<void> {
    await this.update((state) => cancel(state, id));
  }

  async confirmRetry(id: string): Promise<void> {
    await this.update((state) => confirmRetry(state, id));
  }

  // Gọi nhiều lần cùng lúc vẫn chỉ chạy một lượt gửi. Các lần gọi sau nhận kết quả của lượt đang chạy.
  resume(send: Sender, isOnline: () => Promise<boolean>): Promise<void> {
    if (this.running === null) {
      this.running = this.drain(send, isOnline).finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async drain(send: Sender, isOnline: () => Promise<boolean>): Promise<void> {
    if (!(await isOnline())) return;
    for (;;) {
      const next = this.current.entries.find((entry) => entry.status === 'pending');
      if (next === undefined) return;
      await this.update((state) => markSyncing(state, next.id));
      let outcome: SendOutcome;
      try {
        outcome = await send(next);
      } catch {
        outcome = { kind: 'unknown' };
      }
      await this.update((state) => applyOutcome(state, next.id, outcome));
      if (outcome.kind === 'deferred') return;
    }
  }

  // Mọi thay đổi đi qua đây: nối tiếp nhau và luôn bắt đầu từ trạng thái mới nhất. Trạng thái trong bộ nhớ chỉ đổi
  // sau khi lưu thành công. Nếu lưu lỗi, bản nháp không nằm trong hàng đợi và không được gửi sau đó (APP-01): người
  // dùng thấy lỗi, bấm lưu lại, và chỉ bản mới được gửi.
  private update(change: (state: OutboxState) => OutboxState): Promise<void> {
    const done = this.queue.then(async () => {
      const state = change(this.current);
      await this.store.save(state);
      this.current = state;
      for (const listener of this.listeners) listener(state);
    });
    this.queue = done.catch(() => undefined);
    return done;
  }
}
