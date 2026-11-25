#!/usr/bin/env node
// Runs a command with a new Ed25519 key pair in its environment (GS-022). For the tests and the verify gate only: the
// pair is created for this run, lives in memory and in the child's environment, and is never written to disk.
// Production builds get their keys from the host's secrets.
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('usage: with-test-pack-key.mjs <command> [args...]');
  process.exit(2);
}
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const publicRaw = Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url').toString('base64');
const env = {
  ...process.env,
  GROUNDSTEAD_PACK_PRIVATE_KEY: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  NEXT_PUBLIC_GROUNDSTEAD_PACK_PUBLIC_KEY: publicRaw,
  GROUNDSTEAD_TEST_PACK_FIXTURES: '1',
};
console.log('test pack key: a new Ed25519 pair for this run only (not a production key)');
const result = spawnSync(command, args, { env, stdio: 'inherit' });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
