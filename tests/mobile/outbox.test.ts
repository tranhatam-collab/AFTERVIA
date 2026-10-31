import { describe, expect, it } from 'vitest';
import { draftFromForm } from '../../apps/mobile/src/offline/draft';
import { makeItemSender } from '../../apps/mobile/src/offline/send-item';
import { EMPTY_STATE, Outbox, enqueue, memoryStore, type OutboxEntry, type OutboxState, type Sender, type SendOutcome } from '../../apps/mobile/src/offline/outbox';

// Kiểm thử hàng đợi offline của bản nháp (WO10-02), phần logic.
// Tên kiểm thử KHÔNG bắt đầu bằng mã T-xx: T23 có automation DEVICE (mất mạng thật cần thiết bị),
// nên phần logic này không được ghi PASS vào ma trận. Trạng thái T23 vẫn NOT_RUN cho đến khi có bằng chứng trên thiết bị.

const BASE = 'https://api.example.test';
const ONLINE = async (): Promise<boolean> => true;
const OFFLINE = async (): Promise<boolean> => false;
const DRAFT = { title: 'Máy giặt', brand: 'Hãng Y', model: null, purchasedOn: '2026-05-02', currency: 'VND' };

function entryFor(id: string): OutboxEntry {
  return {
    id,
    draft: DRAFT,
    idempotencyKey: `idem-${id}`,
    createdAt: '2026-10-31T18:00:00.000Z',
    status: 'pending',
    attempts: 0,
    serverId: null,
  };
}

async function addDraft(outbox: Outbox, id: string): Promise<void> {
  await outbox.add({ id, draft: DRAFT, idempotencyKey: `idem-${id}`, createdAt: '2026-10-31T18:00:00.000Z' });
}

// Người gửi giả: ghi lại mọi lượt gửi và trả về kết quả theo kịch bản.
function scripted(outcome: (id: string, call: number) => SendOutcome | Promise<SendOutcome>): { send: Sender; calls: Array<{ id: string; key: string }> } {
  const calls: Array<{ id: string; key: string }> = [];
  const send: Sender = async (entry) => {
    calls.push({ id: entry.id, key: entry.idempotencyKey });
    return outcome(entry.id, calls.length);
  };
  return { send, calls };
}

function statuses(state: OutboxState): string[] {
  return state.entries.map((entry) => entry.status);
}

function statusOf(state: OutboxState, id: string): string | undefined {
  return state.entries.find((entry) => entry.id === id)?.status;
}

describe('WO10-02 offline draft queue: logic only (device network loss is not claimed here)', () => {
  it('a new draft is pending, and it is not reported as sent', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    expect(statusOf(outbox.state, 'd1')).toBe('pending');
    expect(outbox.state.entries[0]?.serverId).toBeNull();
  });

  it('while offline, resume sends nothing and every draft stays pending', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    await addDraft(outbox, 'd2');
    const { send, calls } = scripted(() => ({ kind: 'ok', serverId: 's' }));
    await outbox.resume(send, OFFLINE);
    expect(calls).toEqual([]);
    expect(statuses(outbox.state)).toEqual(['pending', 'pending']);
  });

  it('resume sends each draft once, and later resumes never send a synced draft again', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    const { send, calls } = scripted((id) => ({ kind: 'ok', serverId: `srv-${id}` }));
    await outbox.resume(send, ONLINE);
    await outbox.resume(send, ONLINE);
    await outbox.resume(send, ONLINE);
    expect(calls.map((c) => c.id)).toEqual(['d1']);
    expect(outbox.state.entries[0]).toMatchObject({ status: 'synced', serverId: 'srv-d1', attempts: 1 });
  });

  it('several resumes at the same time run one drain, so each draft is sent once', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    await addDraft(outbox, 'd2');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { send, calls } = scripted(async (id) => {
      await gate;
      return { kind: 'ok', serverId: `srv-${id}` };
    });
    const runs = Promise.all([outbox.resume(send, ONLINE), outbox.resume(send, ONLINE), outbox.resume(send, ONLINE)]);
    release();
    await runs;
    expect(calls.map((c) => c.id)).toEqual(['d1', 'd2']);
    expect(statuses(outbox.state)).toEqual(['synced', 'synced']);
  });

  it('a draft added while a drain is running is sent in that same drain', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    let added = false;
    const { send, calls } = scripted(async (id) => {
      if (!added) {
        added = true;
        await addDraft(outbox, 'd2');
      }
      return { kind: 'ok', serverId: `srv-${id}` };
    });
    await outbox.resume(send, ONLINE);
    expect(calls.map((c) => c.id)).toEqual(['d1', 'd2']);
    expect(statuses(outbox.state)).toEqual(['synced', 'synced']);
  });

  it('a rejected draft is not sent again by later resumes', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    const { send, calls } = scripted(() => ({ kind: 'rejected' }));
    await outbox.resume(send, ONLINE);
    await outbox.resume(send, ONLINE);
    expect(calls).toHaveLength(1);
    expect(statusOf(outbox.state, 'd1')).toBe('rejected');
  });

  it('a deferred draft (not signed in) stays pending, and the drain stops at once', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    await addDraft(outbox, 'd2');
    const { send, calls } = scripted(() => ({ kind: 'deferred' }));
    await outbox.resume(send, ONLINE);
    expect(calls.map((c) => c.id)).toEqual(['d1']);
    expect(statuses(outbox.state)).toEqual(['pending', 'pending']);
    expect(outbox.state.entries.map((e) => e.attempts)).toEqual([0, 0]);
  });

  it('an unknown outcome is uncertain, never synced, and resume does not send it again', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    const { send, calls } = scripted(() => ({ kind: 'unknown' }));
    await outbox.resume(send, ONLINE);
    await outbox.resume(send, ONLINE);
    expect(calls).toHaveLength(1);
    expect(statusOf(outbox.state, 'd1')).toBe('uncertain');
  });

  it('a sender that throws counts as unknown, never as success', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    const send: Sender = async () => {
      throw new Error('network_lost_after_send');
    };
    await outbox.resume(send, ONLINE);
    expect(statusOf(outbox.state, 'd1')).toBe('uncertain');
  });

  it('after the user confirms, an uncertain draft is sent again with the same idempotency key', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    const { send, calls } = scripted((_id, call) => (call === 1 ? { kind: 'unknown' } : { kind: 'ok', serverId: 'srv-d1' }));
    await outbox.resume(send, ONLINE);
    expect(statusOf(outbox.state, 'd1')).toBe('uncertain');
    await outbox.confirmRetry('d1');
    await outbox.resume(send, ONLINE);
    expect(statusOf(outbox.state, 'd1')).toBe('synced');
    expect(calls.map((c) => c.key)).toEqual(['idem-d1', 'idem-d1']);
  });

  it('cancel stops a pending draft, and a synced or uncertain draft cannot be cancelled', async () => {
    const outbox = await Outbox.open(memoryStore());
    await addDraft(outbox, 'd1');
    await outbox.cancel('d1');
    expect(statusOf(outbox.state, 'd1')).toBe('cancelled');
    await addDraft(outbox, 'd2');
    await addDraft(outbox, 'd3');
    const { send, calls } = scripted((id) => (id === 'd3' ? { kind: 'unknown' } : { kind: 'ok', serverId: `srv-${id}` }));
    await outbox.resume(send, ONLINE);
    expect(calls.map((c) => c.id)).toEqual(['d2', 'd3']);
    await outbox.cancel('d2');
    await outbox.cancel('d3');
    expect(statusOf(outbox.state, 'd2')).toBe('synced');
    expect(statusOf(outbox.state, 'd3')).toBe('uncertain');
  });

  it('a draft that was syncing when the app closed is uncertain after reopening, and resume does not send it', async () => {
    const stored: OutboxState = { entries: [{ ...entryFor('d1'), status: 'syncing' }] };
    const outbox = await Outbox.open(memoryStore(stored));
    expect(statusOf(outbox.state, 'd1')).toBe('uncertain');
    const { send, calls } = scripted(() => ({ kind: 'ok', serverId: 's' }));
    await outbox.resume(send, ONLINE);
    expect(calls).toEqual([]);
  });

  it('drafts survive a restart: reopening the stored queue shows the same drafts, still pending', async () => {
    const store = memoryStore();
    const first = await Outbox.open(store);
    await addDraft(first, 'd1');
    await addDraft(first, 'd2');
    const second = await Outbox.open(store);
    expect(second.state.entries.map((e) => e.id)).toEqual(['d1', 'd2']);
    expect(statuses(second.state)).toEqual(['pending', 'pending']);
  });

  it('a duplicate draft id is refused, so one save cannot create two drafts', () => {
    const once = enqueue(EMPTY_STATE, { id: 'd1', draft: DRAFT, idempotencyKey: 'idem-d1', createdAt: '2026-10-31T18:00:00.000Z' });
    expect(() => enqueue(once, { id: 'd1', draft: DRAFT, idempotencyKey: 'idem-d1', createdAt: '2026-10-31T18:00:00.000Z' })).toThrow(
      'duplicate_entry:d1',
    );
  });

  it('the item sender posts the draft with its idempotency key and reads the server id from a 201', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ id: 'srv-1' }), { status: 201, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const outcome = await makeItemSender(fetchImpl, BASE, 'token')(entryFor('d1'));
    expect(outcome).toEqual({ kind: 'ok', serverId: 'srv-1' });
    expect(calls[0]?.url).toBe(`${BASE}/v1/items`);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['idempotency-key']).toBe('idem-d1');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      title: 'Máy giặt',
      brand: 'Hãng Y',
      model: null,
      purchased_on: '2026-05-02',
      currency: 'VND',
    });
  });

  it('the item sender maps refusals, auth problems and server faults to the right outcome', async () => {
    const sendWith = (status: number, body: string): ReturnType<typeof makeItemSender> =>
      makeItemSender((async () => new Response(body, { status })) as typeof fetch, BASE, 'token');
    const entry = entryFor('d1');
    expect(await sendWith(400, '{"code":"invalid_input"}')(entry)).toEqual({ kind: 'rejected' });
    expect(await sendWith(401, '{}')(entry)).toEqual({ kind: 'deferred' });
    expect(await sendWith(403, '{}')(entry)).toEqual({ kind: 'deferred' });
    expect(await sendWith(429, '{}')(entry)).toEqual({ kind: 'unknown' });
    expect(await sendWith(503, '{}')(entry)).toEqual({ kind: 'unknown' });
    expect(await sendWith(201, '{}')(entry)).toEqual({ kind: 'unknown' });
    const lost = makeItemSender((async () => {
      throw new TypeError('network request failed');
    }) as typeof fetch, BASE, 'token');
    expect(await lost(entry)).toEqual({ kind: 'unknown' });
  });

  it('the item sender without a token defers and does not touch the network', async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response('{}', { status: 201 });
    }) as typeof fetch;
    expect(await makeItemSender(fetchImpl, BASE, null)(entryFor('d1'))).toEqual({ kind: 'deferred' });
    expect(called).toBe(false);
  });

  it('the item sender calls fetch without a receiver, as the browser and device fetch require', async () => {
    const unbound = function (this: unknown): Promise<Response> {
      if (this !== undefined) return Promise.reject(new TypeError('Illegal invocation'));
      return Promise.resolve(new Response(JSON.stringify({ id: 'srv-x' }), { status: 201 }));
    } as unknown as typeof fetch;
    expect(await makeItemSender(unbound, BASE, 'token')(entryFor('d1'))).toEqual({ kind: 'ok', serverId: 'srv-x' });
  });

  it('the draft form is checked by the shared item rules before it is queued', () => {
    expect(draftFromForm({ title: '', brand: '', model: '', purchasedOn: '', currency: '' })).toEqual({ ok: false, field: 'title' });
    expect(draftFromForm({ title: 'Ghế', brand: '', model: '', purchasedOn: '', currency: 'vnd' })).toMatchObject({ ok: false, field: 'currency' });
    expect(draftFromForm({ title: 'Ghế', brand: '', model: '', purchasedOn: '2026-02-31', currency: '' })).toMatchObject({
      ok: false,
      field: 'purchased_on',
    });
    expect(draftFromForm({ title: ' Ghế ', brand: '  ', model: '', purchasedOn: '', currency: 'VND' })).toEqual({
      ok: true,
      value: { title: 'Ghế', brand: null, model: null, purchasedOn: null, currency: 'VND' },
    });
  });
});
