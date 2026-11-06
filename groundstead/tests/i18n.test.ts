import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, isLocale, localePath } from '../lib/i18n/locales.ts';
import { MESSAGES } from '../lib/i18n/messages.ts';

test('every locale has the same message keys and no empty strings', () => {
  const keys = (l: (typeof LOCALES)[number]) => Object.keys(MESSAGES[l]).sort();
  for (const l of LOCALES) {
    assert.deepEqual(keys(l), keys('en'));
    for (const [k, v] of Object.entries(MESSAGES[l])) {
      const values = Array.isArray(v) ? v : [v];
      assert.ok(values.length > 0 && values.every((s) => typeof s === 'string' && s.trim() !== ''), `${l}.${k} is empty`);
    }
    assert.equal(MESSAGES[l].coming.length, MESSAGES.en.coming.length);
  }
});

test('localePath builds trailing-slash paths and rejects paths without one', () => {
  assert.equal(localePath('vi'), '/vi/');
  assert.equal(localePath('en', '/emergency/'), '/en/emergency/');
  assert.throws(() => localePath('en', 'emergency'), /must end with/);
  assert.equal(isLocale('vi'), true);
  assert.equal(isLocale('fr'), false);
});
