import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, isLocale, localePath } from '../lib/i18n/locales.ts';
import { LANDING, MESSAGES } from '../lib/i18n/messages.ts';

test('every locale has the same message keys and no empty strings', () => {
  const keys = (l: (typeof LOCALES)[number]) => Object.keys(MESSAGES[l]).sort();
  for (const l of LOCALES) {
    assert.deepEqual(keys(l), keys('en'));
    for (const [k, v] of Object.entries(MESSAGES[l])) {
      assert.ok(typeof v === 'string' && v.trim() !== '', `${l}.${k} is empty`);
    }
  }
});

test('every locale has the same landing keys, no empty text, and the same number of rows', () => {
  const keys = (l: (typeof LOCALES)[number]) => Object.keys(LANDING[l]).sort();
  for (const l of LOCALES) {
    assert.deepEqual(keys(l), keys('en'));
    for (const [k, v] of Object.entries(LANDING[l])) {
      const items: readonly unknown[] = Array.isArray(v) ? v : [v];
      assert.ok(items.length > 0, `${l}.${k} is empty`);
      for (const item of items) {
        if (typeof item === 'string') {
          assert.ok(item.trim() !== '', `${l}.${k} has an empty string`);
        } else {
          const row = item as { name: string; text: string };
          assert.ok(row.name.trim() !== '' && row.text.trim() !== '', `${l}.${k} has an empty row`);
        }
      }
    }
    // Rows in the lists must line up, so each row has a counterpart in the other language.
    for (const k of ['pillars', 'path', 'dont'] as const) {
      assert.equal(LANDING[l][k].length, LANDING.en[k].length, `${l}.${k} has the same rows as en`);
    }
  }
});

test('localePath builds trailing-slash paths and rejects paths without one', () => {
  assert.equal(localePath('vi'), '/vi/');
  assert.equal(localePath('en', '/emergency/'), '/en/emergency/');
  assert.throws(() => localePath('en', 'emergency'), /must end with/);
  assert.equal(isLocale('vi'), true);
  assert.equal(isLocale('fr'), false);
});
