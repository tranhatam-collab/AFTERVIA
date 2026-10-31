import { describe, expect, it } from 'vitest';
import { redactedLine } from '../../services/api/src/observability/log';

// WO16-03 với mã T37 (rò bí mật và nhật ký). Kiểm dòng nhật ký: chỉ trường cho phép, không có token, tài liệu,
// dữ liệu cá nhân hay thông điệp lỗi; chuỗi dạng bí mật bị thay; giá trị lồng và chuỗi quá dài bị xử lý đúng.

describe('WO16-03 structured log lines: allow-list, redaction and no error text (T37)', () => {
  it('T37 a log line keeps only allow-listed fields, so tokens, document bodies, personal fields and error text never reach the log', () => {
    const line = redactedLine('request.internal_error', {
      request_id: 'req-0001',
      authorization: 'Bearer abc.def.ghi',
      token: 'tok-1',
      document_body: 'nội dung tài liệu riêng tư',
      email: 'khach@example.test',
      password: 'mk-1',
      service_role_key: 'khoa-thu',
      error_message: 'select * from items where email = $1',
    });
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['dropped_fields', 'event', 'request_id']);
    expect(parsed.dropped_fields).toBe(7);
    expect(line).not.toContain('Bearer');
    expect(line).not.toContain('tok-1"');
    expect(line).not.toContain('nội dung tài liệu');
    expect(line).not.toContain('khach@example.test');
    expect(line).not.toContain('select * from items');
  });

  it('T37 a token-shaped or key-shaped value under an allowed field is replaced by [redacted]', () => {
    const parsed = JSON.parse(
      redactedLine('request.check', {
        request_id: ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxIn0', 'abcdefghijk'].join('.'),
        route: ['sk', 'live', 'ABCDEFGH12345678'].join('_'),
        code: 'Bearer abcdefghijklmnop',
      }),
    ) as Record<string, unknown>;
    expect(parsed.request_id).toBe('[redacted]');
    expect(parsed.route).toBe('[redacted]');
    expect(parsed.code).toBe('[redacted]');
  });

  it('T37 nested values are dropped and long strings are cut to 200 characters', () => {
    const parsed = JSON.parse(redactedLine('request.check', { route: 'a'.repeat(500), nested: { inner: 1 } })) as Record<string, unknown>;
    expect(parsed.route).toBe(`${'a'.repeat(200)}…`);
    expect(parsed.dropped_fields).toBe(1);
    expect(parsed).not.toHaveProperty('nested');
  });

  it('T37 the internal error line names the error class only, never the error message', () => {
    const line = redactedLine('request.internal_error', { error_class: 'Error', error_message: 'chi tiết nội bộ không được ghi' });
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.error_class).toBe('Error');
    expect(parsed.event).toBe('request.internal_error');
    expect(line).not.toContain('chi tiết nội bộ');
  });
});
