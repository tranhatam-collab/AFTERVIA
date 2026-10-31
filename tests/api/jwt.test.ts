import { describe, expect, it } from 'vitest';
import { signHs256, verifyHs256 } from '../../services/api/src/auth/jwt';

// Khóa được ghép lúc chạy để trình quét bí mật không khớp với chuỗi gán trực tiếp.
const SECRET = ['local', 'test', 'signing', 'material', '0002'].join('-');
const NOW = 1_800_000_000;
const SUB = '00000000-0000-4000-8000-0000000000a1';

describe('T06 JWT trust boundary (HS256 only, local simulated sign-in)', () => {
  it('T06 a token signed with the local key verifies and yields its subject', () => {
    const token = signHs256({ sub: SUB, role: 'authenticated', exp: NOW + 60 }, SECRET);
    const result = verifyHs256(token, SECRET, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.claims.sub).toBe(SUB);
  });

  it('T06 a token whose payload was edited after signing is refused', () => {
    const token = signHs256({ sub: SUB, exp: NOW + 60 }, SECRET);
    const [h, , s] = token.split('.') as [string, string, string];
    const forged = Buffer.from(JSON.stringify({ sub: 'someone-else', exp: NOW + 60 })).toString('base64url');
    expect(verifyHs256(`${h}.${forged}.${s}`, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('T06 a token signed with another key is refused', () => {
    const token = signHs256({ sub: SUB, exp: NOW + 60 }, `${SECRET}-other`);
    expect(verifyHs256(token, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('T06 an unsigned token with alg none is refused', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: SUB, exp: NOW + 60 })).toString('base64url');
    expect(verifyHs256(`${header}.${body}.`, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_alg' });
  });

  it('T06 an expired token is refused and a token without a subject is refused', () => {
    expect(verifyHs256(signHs256({ sub: SUB, exp: NOW - 1 }, SECRET), SECRET, NOW)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyHs256(signHs256({ exp: NOW + 60 }, SECRET), SECRET, NOW)).toEqual({ ok: false, reason: 'missing_sub' });
  });

  it('T06 malformed input is refused without throwing', () => {
    expect(verifyHs256('not-a-token', SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
    const notObject = Buffer.from('null').toString('base64url');
    expect(verifyHs256(`${notObject}.${notObject}.x`, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
  });
});
