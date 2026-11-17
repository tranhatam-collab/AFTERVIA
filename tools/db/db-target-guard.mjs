// One rule set for every tool that migrates, resets, restores or drops a database (D-07, A-10, D-11).
// Used by tools/db/migrate.mjs (and through it tools/db/restore-drill.mjs and the reset in
// tools/e2e/web-e2e.mjs) and by services/api/src/local/start-local.ts, which is a local dev entry point.
//
// Why a host is always required: `new URL('postgres:///x_test').hostname` is the empty string, and libpq
// then takes the server from PGHOST, PGHOSTADDR or PGSERVICE. A URL with no host of its own therefore says
// nothing about which machine will be reset, so it is refused. With a host always present and checked, the
// PG* variables cannot redirect the connection, because explicit connection parameters win over them.
//
// Never put a database URL in an error message: it can carry a password.

export const LOOPBACK_NAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

// A libpq host may be a comma-separated list, and an entry starting with '/' is a Unix socket directory.
export function isLoopbackTarget(value) {
  const parts = value.split(',');
  return parts.length > 0 && parts.every((part) => part.startsWith('/') || LOOPBACK_NAMES.has(part));
}

export const HOST_MESSAGE =
  'the database URL must point to this machine only (localhost, 127.0.0.1, ::1 or a Unix socket path)';
export const NO_HOST_MESSAGE =
  'the database URL has no host, so PGHOST, PGHOSTADDR or PGSERVICE would choose the server: give an explicit loopback host';

export function databaseNameOf(url) {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

// Returns the reason for refusing, or null when the URL may be used.
export function checkLocalTestDatabaseUrl(raw) {
  if (!raw) return 'the database URL is missing';
  let url;
  try {
    url = new URL(raw);
  } catch {
    return 'the database URL is not a valid URL';
  }
  // A dbname parameter would change the target database behind the name taken from the path.
  if (url.searchParams.has('dbname')) {
    return 'the database URL must not use a dbname parameter: the name comes from the path';
  }
  let name;
  try {
    name = databaseNameOf(raw);
  } catch {
    return 'the database URL has an invalid database name';
  }
  if (!name.endsWith('_test')) {
    return `refusing to use database "${name}": its name must end with _test`;
  }
  const params = [url.searchParams.get('host'), url.searchParams.get('hostaddr')].filter((v) => v !== null && v !== '');
  if (url.hostname === '' && params.length === 0) return NO_HOST_MESSAGE;
  for (const target of [url.hostname, ...params]) {
    if (target !== '' && !isLoopbackTarget(target)) return HOST_MESSAGE;
  }
  return null;
}

// Throwing form for the tools. Returns the database name.
export function assertLocalTestDatabase(url) {
  const reason = checkLocalTestDatabaseUrl(url);
  if (reason !== null) throw new Error(reason);
  return databaseNameOf(url);
}
