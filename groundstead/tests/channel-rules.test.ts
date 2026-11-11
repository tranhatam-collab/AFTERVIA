import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelFrom } from '../lib/channel.ts';
import { publishable } from '../lib/content/review.ts';

test('G-07 the channel comes from GS_CHANNEL: unset or empty is production, preview only when named, anything else is refused', () => {
  assert.equal(channelFrom({}), 'production', 'unset is production');
  assert.equal(channelFrom({ GS_CHANNEL: '' }), 'production', 'empty is production');
  assert.equal(channelFrom({ GS_CHANNEL: 'production' }), 'production');
  assert.equal(channelFrom({ GS_CHANNEL: 'preview' }), 'preview');
  assert.throws(() => channelFrom({ GS_CHANNEL: 'Preview' }), /GS_CHANNEL/, 'a misspelt channel stops the build');
  assert.throws(() => channelFrom({ GS_CHANNEL: 'prod' }), /GS_CHANNEL/);
});

test('G-07 only a card a person has checked may be published: AI_DRAFT, STALE and a review without its reviewer are refused', () => {
  assert.equal(publishable({ status: 'AI_DRAFT' }), false);
  assert.equal(publishable({ status: 'STALE', stale_reason: 'source changed' }), false);
  assert.equal(publishable({ status: 'COMMUNITY_CHECKED' }), false, 'no reviewer named');
  assert.equal(publishable({ status: 'COMMUNITY_CHECKED', reviewer: { name: 'A' }, reviewed_on: '2026-11-01' }), true);
  assert.equal(publishable({ status: 'EXPERT_REVIEWED', reviewer: { name: 'A' }, reviewed_on: '2026-11-01' }), false, 'no expertise named');
  assert.equal(publishable({ status: 'EXPERT_REVIEWED', reviewer: { name: 'A', expertise: 'first aid' }, reviewed_on: '2026-11-01' }), true);
});
