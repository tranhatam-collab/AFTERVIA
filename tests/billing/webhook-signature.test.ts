import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MIN_WEBHOOK_SECRET_LENGTH,
  WEBHOOK_TOLERANCE_SECONDS,
  signWebhook,
  verifyWebhook,
} from '../../services/api/src/billing/webhook';

// WO12-01 (T27): một webhook giả phải bị từ chối. Dữ liệu tổng hợp, không có khóa live.
// Bí mật được sinh lúc chạy, nên repo không chứa chuỗi nào trông giống bí mật, và kiểm thử
// chứng minh mã không phụ thuộc vào một giá trị cố định nào.
const SECRET = randomBytes(24).toString('hex');
const BODY = JSON.stringify({ event_id: 'evt-0001', event_type: 'purchase' });
const NOW = 1_762_000_000;

function header(timestamp: number, body: string = BODY, secret: string = SECRET): string {
  return `t=${timestamp},v1=${signWebhook(secret, body, timestamp)}`;
}

describe('T27 a webhook without a usable signature never passes', () => {
  it('T27 refuses a missing, empty or whitespace header', () => {
    for (const bad of [undefined, null, '', '   ']) {
      expect(verifyWebhook(SECRET, BODY, bad, NOW)).toEqual({ ok: false, reason: 'missing_signature' });
    }
  });

  it('T27 refuses a header that is not in the expected shape', () => {
    const malformed = [
      `v1=${signWebhook(SECRET, BODY, NOW)}`, // thiếu mốc thời gian
      `t=${NOW}`, // thiếu chữ ký
      `t=${NOW},v1=`, // chữ ký rỗng
      `t=${NOW},v1=nothex${'0'.repeat(58)}`,
      `t=${NOW},v1=${signWebhook(SECRET, BODY, NOW).slice(0, 63)}`, // ngắn một ký tự
      `t=${NOW},v1=${signWebhook(SECRET, BODY, NOW).toUpperCase()}`, // chỉ nhận chữ thường
      `t=${NOW},t=${NOW},v1=${signWebhook(SECRET, BODY, NOW)}`, // hai mốc thời gian
      `t=abc,v1=${signWebhook(SECRET, BODY, NOW)}`,
      'garbage',
    ];
    for (const bad of malformed) {
      expect(verifyWebhook(SECRET, BODY, bad, NOW), bad).toEqual({ ok: false, reason: 'malformed_signature' });
    }
  });

  it('T27 refuses a signature made with another secret, and one made over a different body', () => {
    const otherSecret = randomBytes(24).toString('hex');
    expect(verifyWebhook(SECRET, BODY, header(NOW, BODY, otherSecret), NOW)).toEqual({ ok: false, reason: 'bad_signature' });
    // Thân bị sửa sau khi ký: chữ ký cũ không còn khớp.
    expect(verifyWebhook(SECRET, `${BODY} `, header(NOW), NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('T27 refuses a secret too short to be a secret at all', () => {
    expect(MIN_WEBHOOK_SECRET_LENGTH).toBe(32);
    const weak = 'short';
    expect(verifyWebhook(weak, BODY, `t=${NOW},v1=${signWebhook(weak, BODY, NOW)}`, NOW)).toEqual({ ok: false, reason: 'weak_secret' });
  });
});

describe('T27 the timestamp window is enforced even when the signature is right', () => {
  it('T27 accepts inside the window and refuses outside it, in both directions', () => {
    expect(WEBHOOK_TOLERANCE_SECONDS).toBe(300);
    const old = NOW - WEBHOOK_TOLERANCE_SECONDS;
    expect(verifyWebhook(SECRET, BODY, header(old), NOW)).toEqual({ ok: true, timestamp: old });

    const tooOld = NOW - WEBHOOK_TOLERANCE_SECONDS - 1;
    expect(verifyWebhook(SECRET, BODY, header(tooOld), NOW)).toEqual({ ok: false, reason: 'timestamp_outside_window' });

    // Mốc ở tương lai xa cũng bị từ chối: đồng hồ lệch nhiều là dấu hiệu đáng nghi, không phải chuyện thường.
    const tooNew = NOW + WEBHOOK_TOLERANCE_SECONDS + 1;
    expect(verifyWebhook(SECRET, BODY, header(tooNew), NOW)).toEqual({ ok: false, reason: 'timestamp_outside_window' });
  });

  it('T27 a correctly signed body replayed a day later is refused', () => {
    const captured = header(NOW);
    expect(verifyWebhook(SECRET, BODY, captured, NOW)).toEqual({ ok: true, timestamp: NOW });
    expect(verifyWebhook(SECRET, BODY, captured, NOW + 86_400)).toEqual({ ok: false, reason: 'timestamp_outside_window' });
  });
});

describe('T27 a genuine signature passes', () => {
  it('T27 accepts the header the signer produces, and accepts a second signature during key rotation', () => {
    expect(verifyWebhook(SECRET, BODY, header(NOW), NOW)).toEqual({ ok: true, timestamp: NOW });
    const rotated = `t=${NOW},v1=${'0'.repeat(64)},v1=${signWebhook(SECRET, BODY, NOW)}`;
    expect(verifyWebhook(SECRET, BODY, rotated, NOW)).toEqual({ ok: true, timestamp: NOW });
    // Khóa lạ của phiên bản sau bị bỏ qua, nhưng không bao giờ thay cho chữ ký.
    expect(verifyWebhook(SECRET, BODY, `t=${NOW},v9=anything,v1=${signWebhook(SECRET, BODY, NOW)}`, NOW)).toEqual({ ok: true, timestamp: NOW });
    expect(verifyWebhook(SECRET, BODY, `t=${NOW},v9=${signWebhook(SECRET, BODY, NOW)}`, NOW)).toEqual({ ok: false, reason: 'malformed_signature' });
  });
});
