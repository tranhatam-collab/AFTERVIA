import { signHs256 } from '../../services/api/src/auth/jwt';

// One home for "a session issued just after a deletion cutoff". Getting this wrong twice cost two red CI
// runs (see docs/plan/evidence/OWN-A-08.md), so the rule lives here instead of being copied:
//
//   * `iat` must be AFTER the cutoff, or authenticateSession refuses the session on every route. The cutoff
//     comes from Postgres, so deriving iat from it keeps that comparison independent of the runner clock.
//   * `iat` must NOT be more than 60 seconds ahead of the RUNNER clock, or verifyHs256 answers bad_iat
//     (OWN-A-08, D-09). On CI, Postgres and the runner are different machines, so a large offset after the
//     cutoff turns into a future-dated token and the request answers 401.
//   * `exp - iat` must not exceed the session TTL of 900 seconds, or verifyHs256 answers lifetime_too_long.
//
// AFTER_CUTOFF_SECONDS is small on purpose: it still lands after the cutoff, and it tolerates a Postgres
// clock up to about 55 seconds ahead of the runner.
export const AFTER_CUTOFF_SECONDS = 5;
export const SESSION_TTL_SECONDS = 900;

export function sessionAfterCutoff(userId: string, cutoff: number, secret: string): string {
  const iat = cutoff + AFTER_CUTOFF_SECONDS;
  return signHs256({ sub: userId, role: 'authenticated', iat, exp: iat + SESSION_TTL_SECONDS, simulated: true }, secret);
}
