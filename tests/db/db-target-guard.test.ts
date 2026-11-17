import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from '../../tools/db/migrate.mjs';
import { checkLocalTestDatabaseUrl } from '../../tools/db/db-target-guard.mjs';
import { checkLocalDatabaseUrl } from '../../services/api/src/local/start-local';

// OWN-A-07 (audit 10/11, D-07, A-10, D-11). Every tool that migrates, resets, restores or drops a database
// now shares one rule set. The case that used to slip through: `new URL('postgres:///x_test').hostname` is
// the empty string, and the old check in start-local skipped an empty target (`target !== ''`), so libpq
// would take the server from PGHOST and a remote database could be reset.
const ACCEPTED = [
  'postgres://tester@localhost/aftervia_test',
  'postgres://tester@127.0.0.1:5432/aftervia_test',
  'postgres://tester@[::1]:5432/aftervia_test',
  'postgres:///aftervia_test?host=/var/run/postgresql',
  'postgres://tester@127.0.0.1/aftervia_test?hostaddr=127.0.0.1',
  'postgres://tester@localhost/aftervia_test?host=/var/run/postgresql,localhost',
];

const REFUSED: Array<[string, RegExp]> = [
  // D-07: no host at all. The connection would follow PGHOST, PGHOSTADDR or PGSERVICE.
  ['postgres:///aftervia_test', /has no host/],
  // In a URL `postgres://aftervia_test` is a HOST, not a database name, so the empty name is refused first.
  ['postgres://aftervia_test', /must end with _test/],
  // Another machine, in the URL or in a parameter.
  ['postgres://tester@db.example.com:5432/aftervia_test', /must point to this machine only/],
  ['postgres://tester@localhost/aftervia_test?host=db.example.com', /must point to this machine only/],
  ['postgres://tester@localhost/aftervia_test?host=/var/run/postgresql,db.example.com', /must point to this machine only/],
  ['postgres://tester@localhost/aftervia_test?hostaddr=10.0.0.5', /must point to this machine only/],
  // Name rules.
  ['postgres://tester@localhost/aftervia', /must end with _test/],
  ['postgres://tester@localhost/', /must end with _test/],
  ['postgres://tester@localhost/aftervia?dbname=aftervia_test', /must not use a dbname parameter/],
  ['not a url', /is not a valid URL/],
];

describe('OWN-A-07 one guard for every database target', () => {
  for (const url of ACCEPTED) {
    it(`accepts a loopback target: ${url}`, () => {
      expect(checkLocalTestDatabaseUrl(url)).toBeNull();
      expect(assertTestDatabase(url)).toMatch(/_test$/);
    });
  }

  for (const [url, pattern] of REFUSED) {
    it(`refuses ${url}`, () => {
      expect(checkLocalTestDatabaseUrl(url)).toMatch(pattern);
      expect(() => assertTestDatabase(url)).toThrow(pattern);
    });
  }

  it('the local API entry point and the database tools agree on every case', () => {
    for (const url of ACCEPTED) {
      expect(checkLocalDatabaseUrl(url), url).toBeNull();
    }
    for (const [url, pattern] of REFUSED) {
      // start-local reports an invalid URL in its own words, so only compare the shape of the refusal.
      expect(checkLocalDatabaseUrl(url), url).toMatch(url === 'not a url' ? /is not a valid URL/ : pattern);
    }
  });

  it('start-local keeps its own scheme check, which the shared guard does not make', () => {
    expect(checkLocalDatabaseUrl('mysql://tester@localhost/aftervia_test')).toMatch(/must use the postgres:\/\/ or postgresql:\/\/ scheme/);
    expect(checkLocalTestDatabaseUrl('mysql://tester@localhost/aftervia_test')).toBeNull();
  });
});
