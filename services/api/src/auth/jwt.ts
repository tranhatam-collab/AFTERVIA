// JWT HS256 tối giản dùng node:crypto. Chỉ chấp nhận HS256 (không có alg "none"), kiểm chữ ký bằng so sánh hằng số thời gian.
// Đây là cơ chế đăng nhập GIẢ LẬP cho môi trường cục bộ và kiểm thử (DEC-ENG-11). Không dùng cho production.
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtClaims {
  sub: string;
  role?: string;
  exp: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  simulated?: boolean;
}

// Nhà phát hành và đối tượng nhận của phiên cục bộ. Đặt theo mặc định của phiên người dùng Supabase
// (aud = authenticated), để khi đổi sang nhà cung cấp thật thì chỉ đổi giá trị, không đổi cách kiểm.
export const LOCAL_ISSUER = 'aftervia-local';
export const LOCAL_AUDIENCE = 'authenticated';

// Độ dài tối thiểu của khóa ký. HMAC-SHA256 nhận khóa rỗng, nên phải tự kiểm (D-09).
export const MIN_JWT_SECRET_LENGTH = 32;

export interface VerifyOptions {
  // Chặn trên cho exp - iat. Chính sách của tầng gọi, không phải của JWT, nên mặc định là không chặn.
  maxLifetimeSeconds?: number;
  // Dung sai đồng hồ cho nbf và iat.
  clockSkewSeconds?: number;
  // Khi người gọi đặt, token phải mang đúng iss và aud; thiếu hoặc sai là bị từ chối (D-09).
  expectedIssuer?: string;
  expectedAudience?: string;
}

export type VerifyResult =
  | { ok: true; claims: JwtClaims }
  | {
      ok: false;
      reason: 'malformed' | 'bad_alg' | 'bad_signature' | 'expired' | 'missing_sub' | 'not_yet_valid' | 'bad_iat' | 'lifetime_too_long' | 'bad_iss' | 'bad_aud';
    };

// Ký phiên cục bộ: luôn gắn iss và aud. Mọi nơi phát phiên cục bộ đều đi qua đây (kể cả kiểm thử),
// để không có phiên "thiếu nhà phát hành" nào được ký ra từ đường chính thức.
export function signLocalSession(payload: Record<string, unknown>, secret: string): string {
  return signHs256({ ...payload, iss: LOCAL_ISSUER, aud: LOCAL_AUDIENCE }, secret);
}

export function signHs256(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyHs256(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  options: VerifyOptions = {},
): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [header64, body64, signature64] = parts as [string, string, string];
  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(Buffer.from(header64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(body64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof header !== 'object' || header === null || typeof payload !== 'object' || payload === null) {
    return { ok: false, reason: 'malformed' };
  }
  if ((header as { alg?: unknown }).alg !== 'HS256') return { ok: false, reason: 'bad_alg' };
  const expected = createHmac('sha256', secret).update(`${header64}.${body64}`).digest();
  const given = Buffer.from(signature64, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' };
  const claims = payload as Partial<JwtClaims>;
  const skew = options.clockSkewSeconds ?? 60;
  // nbf và iat chỉ được kiểm khi có mặt: hệ thống này vẫn phát token không có iat ở một số đường.
  if (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > nowSeconds + skew)) {
    return { ok: false, reason: 'not_yet_valid' };
  }
  if (claims.iat !== undefined && (typeof claims.iat !== 'number' || claims.iat > nowSeconds + skew)) {
    return { ok: false, reason: 'bad_iat' };
  }
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return { ok: false, reason: 'expired' };
  if (
    options.maxLifetimeSeconds !== undefined &&
    typeof claims.iat === 'number' &&
    claims.exp - claims.iat > options.maxLifetimeSeconds
  ) {
    return { ok: false, reason: 'lifetime_too_long' };
  }
  if (options.expectedIssuer !== undefined && claims.iss !== options.expectedIssuer) return { ok: false, reason: 'bad_iss' };
  if (options.expectedAudience !== undefined && !audienceIncludes(claims.aud, options.expectedAudience)) {
    return { ok: false, reason: 'bad_aud' };
  }
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) return { ok: false, reason: 'missing_sub' };
  return { ok: true, claims: claims as JwtClaims };
}

// aud có thể là một chuỗi hoặc một danh sách (RFC 7519). Không khớp kiểu thì không khớp.
function audienceIncludes(aud: unknown, expected: string): boolean {
  if (typeof aud === 'string') return aud === expected;
  if (Array.isArray(aud)) return aud.some((item) => item === expected);
  return false;
}
