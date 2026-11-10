// Hàng đợi dùng chung cho các màn hình (WO10-02). Nạp lưu trữ bền, phát lại thay đổi cho giao diện.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ItemFields } from '@aftervia/domain';
import { API_BASE, SESSION_TOKEN } from '../config';
import { asyncStorageStore } from './async-store';
import { Outbox, type OutboxEntry } from './outbox';
import { isOnline } from './network';
import { makeItemSender } from './send-item';

// Đăng nhập thật chưa có trong WO10-02: không có token, nên mọi lượt gửi dừng ở "chờ đồng bộ".
// Token nằm ở src/config.ts để màn Quyền riêng tư (WO11-03) đọc cùng một nguồn.

export type OutboxStatusValue = 'loading' | 'ready' | 'error';

export interface OutboxApi {
  readonly status: OutboxStatusValue;
  readonly entries: readonly OutboxEntry[];
  add(draft: ItemFields): Promise<void>;
  cancel(id: string): Promise<void>;
  confirmRetry(id: string): Promise<void>;
  resume(): Promise<void>;
}

const OutboxContext = createContext<OutboxApi | null>(null);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function OutboxProvider({ children }: { children: ReactNode }) {
  const [outbox, setOutbox] = useState<Outbox | null>(null);
  const [status, setStatus] = useState<OutboxStatusValue>('loading');
  const [entries, setEntries] = useState<readonly OutboxEntry[]>([]);

  useEffect(() => {
    const holder: { unsubscribe: (() => void) | null; active: boolean } = { unsubscribe: null, active: true };
    Outbox.open(asyncStorageStore())
      .then((opened) => {
        if (!holder.active) return;
        setEntries(opened.state.entries);
        holder.unsubscribe = opened.subscribe((state) => setEntries(state.entries));
        setOutbox(opened);
        setStatus('ready');
      })
      .catch(() => {
        if (holder.active) setStatus('error');
      });
    return () => {
      holder.active = false;
      holder.unsubscribe?.();
    };
  }, []);

  const api = useMemo<OutboxApi>(
    () => ({
      status,
      entries,
      add: async (draft) => {
        if (outbox === null) throw new Error('outbox_not_ready');
        await outbox.add({ id: newId(), draft, idempotencyKey: `idem-${newId()}`, createdAt: new Date().toISOString() });
      },
      cancel: async (id) => {
        if (outbox === null) throw new Error('outbox_not_ready');
        await outbox.cancel(id);
      },
      confirmRetry: async (id) => {
        if (outbox === null) throw new Error('outbox_not_ready');
        await outbox.confirmRetry(id);
      },
      resume: async () => {
        if (outbox === null) return;
        try {
          await outbox.resume(makeItemSender(fetch, API_BASE, SESSION_TOKEN), isOnline);
        } catch {
          setStatus('error');
        }
      },
    }),
    [status, entries, outbox],
  );

  return <OutboxContext.Provider value={api}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): OutboxApi {
  const value = useContext(OutboxContext);
  if (value === null) throw new Error('outbox_provider_missing');
  return value;
}
