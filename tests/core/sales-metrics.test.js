import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNT_ONLY_BELOW, TOO_EARLY_BELOW, monthWindows, makeRate, buildDealIndex, resolveMotion
} from '../../src/core/sales-metrics.js';

test('monthWindows: current month to date and last complete month, at month and year edges', () => {
  assert.deepEqual(monthWindows(new Date('2026-10-17T12:00:00Z')), { current: '2026-10', lastComplete: '2026-09' });
  assert.deepEqual(monthWindows(new Date('2026-01-01T00:00:00Z')), { current: '2026-01', lastComplete: '2025-12' });
  assert.deepEqual(monthWindows(new Date('2026-03-31T23:59:59Z')), { current: '2026-03', lastComplete: '2026-02' });
});

test('rate thresholds 4/5/9/10', () => {
  assert.equal(COUNT_ONLY_BELOW, 5);
  assert.equal(TOO_EARLY_BELOW, 10);
  assert.deepEqual(makeRate(3, 4), { count: 3, of: 4, value: null, sample: 'count-only' });
  assert.deepEqual(makeRate(4, 5), { count: 4, of: 5, value: 0.8, sample: 'too-early' });
  assert.deepEqual(makeRate(9, 9), { count: 9, of: 9, value: 1, sample: 'too-early' });
  assert.deepEqual(makeRate(5, 10), { count: 5, of: 10, value: 0.5, sample: 'ok' });
  assert.deepEqual(makeRate(0, 0), { count: 0, of: 0, value: null, sample: 'count-only' });
});

const plays = new Map([
  ['cold-call', { id: 'cold-call', motions: ['cold-outbound'] }],
  ['demo', { id: 'demo', motions: 'all' }],
  ['multi', { id: 'multi', motions: ['inbound', 'referral'] }]
]);

test('resolveMotion order: own motion, deal earliest tagged, single-motion play, not classified', () => {
  const calls = [
    { dealKey: 'acme', date: '2026-09-05', play: 'demo', motion: 'referral' },
    { dealKey: 'acme', date: '2026-09-10', play: 'demo' },
    { dealKey: 'zeta', date: '2026-09-02', play: 'cold-call' },
    { dealKey: 'nope', date: '2026-09-03', play: 'demo' },
    { dealKey: 'multi', date: '2026-09-03', play: 'multi' }
  ];
  const wins = [{ dealKey: 'acme', date: '2026-08-01', result: 'won', motion: 'inbound' }];
  const index = buildDealIndex(calls, wins);
  assert.equal(index.get('acme'), 'inbound');
  assert.equal(resolveMotion({ dealKey: 'acme', motion: 'expansion' }, index, plays), 'expansion');
  assert.equal(resolveMotion(calls[1], index, plays), 'inbound');
  assert.equal(resolveMotion(calls[2], index, plays), 'cold-outbound');
  assert.equal(resolveMotion(calls[3], index, plays), 'unclassified');
  assert.equal(resolveMotion(calls[4], index, plays), 'unclassified');
});

test('buildDealIndex groups by deal key and picks the earliest tagged record', () => {
  const index = buildDealIndex(
    [{ dealKey: 'a', date: '2026-09-09', motion: 'referral' }, { dealKey: 'a', date: '2026-09-01', motion: 'inbound' }, { dealKey: 'a', date: '2026-08-01' }, { dealKey: '', date: '2026-09-01', motion: 'inbound' }],
    []
  );
  assert.equal(index.get('a'), 'inbound');
  assert.equal(index.has(''), false);
});
