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

// ---- slice 3b: computed metrics ----
import { computeSalesMetrics, buildSalesReport } from '../../src/core/sales-metrics.js';
import { withTmp, writeFiles } from './helpers.js';
import { loadSalesReport } from '../../src/core/sales-records.js';

const play = (o = {}) => ({ id: 'discovery', title: 'Discovery', goal: 'Understand the problem', success: 'Problem understood', successDefined: true, motions: 'all', firstStage: 2, branches: [{ id: 'B1', when: 'They say no budget' }, { id: 'B2', when: 'They go quiet' }], ...o });
const call = (o = {}) => ({ relPath: 'sales/calls/2026-09/x.md', date: '2026-09-10', month: '2026-09', rep: 'Ana', company: 'Acme', dealKey: 'acme', play: 'discovery', branch: '', outcome: 'advanced', ...o });
const data = (o = {}) => ({ calls: [], wins: [], plays: [play()], stageNames: new Map([['2', 'Discovery']]), skipped: [], demoExcluded: 0, ...o });

test('goal-met 3/1/2: 75% over 4 and notRecorded 2', () => {
  const calls = [true, true, true, false, undefined, undefined].map((g, i) => call({ goalMet: g, dealKey: `d${i}` }));
  const m = computeSalesMetrics(data({ calls }), { month: '2026-09' });
  const p = m.byPlay.find((x) => x.play === 'discovery');
  assert.deepEqual(p.success, { count: 3, of: 4, value: null, sample: 'count-only' });
  assert.equal(m.totals.notRecorded, 2);
  assert.equal(m.totals.calls, 6);
  // 12 calls: 9 true, 3 false, 0 missing -> 75% ok
  const many = [...Array(9).fill(true), ...Array(3).fill(false)].map((g, i) => call({ goalMet: g, dealKey: `e${i}` }));
  const r = computeSalesMetrics(data({ calls: many }), { month: '2026-09' }).totals.success;
  assert.equal(r.value, 0.75);
  assert.equal(r.sample, 'ok');
});

test('goal_met is never taken from the gate, stage advance is separate', () => {
  const calls = [call({ goalMet: true, gateAdvanced: false }), call({ goalMet: false, gateAdvanced: true }), call({ gateAdvanced: true })];
  const m = computeSalesMetrics(data({ calls }), { month: '2026-09' });
  assert.equal(m.totals.success.count, 1);
  assert.equal(m.totals.success.of, 2);
  assert.equal(m.totals.stageAdvance.count, 2);
  assert.equal(m.totals.stageAdvance.of, 3);
  assert.equal(m.totals.notRecorded, 1);
});

test('stall points: every goal_met=false call by play and branch trigger text', () => {
  const calls = [
    call({ goalMet: false, branch: 'B1', outcome: 'advanced' }),
    call({ goalMet: false, branch: 'B1', outcome: 'stalled' }),
    call({ goalMet: false, branch: 'B2' }),
    call({ goalMet: false, branch: '' }),
    call({ goalMet: true, branch: 'B1', outcome: 'stalled' })
  ];
  const stall = computeSalesMetrics(data({ calls }), { month: '2026-09' }).byPlay[0].stallPoints;
  assert.deepEqual(stall.map((s) => [s.when, s.count]), [['They say no budget', 2], ['They go quiet', 1], ['No branch recorded', 1]]);
  assert.equal(JSON.stringify(stall).includes('B1'), false);
});

test('legacy goal fallback is flagged as success not defined', () => {
  const m = computeSalesMetrics(data({ plays: [play({ successDefined: false, success: 'Understand the problem' })], calls: [call()] }), { month: '2026-09' });
  assert.equal(m.byPlay[0].successDefined, false);
  assert.equal(m.byPlay[0].successText, 'Understand the problem');
});

test('per motion: calls, deals won/lost/open and win rate; unclassified bucket', () => {
  const calls = [call({ motion: 'referral', dealKey: 'a' }), call({ motion: 'referral', dealKey: 'b' }), call({ dealKey: 'z', play: 'discovery' })];
  const wins = [
    { relPath: 'w1', date: '2026-09-20', dealKey: 'a', result: 'won' },
    { relPath: 'w2', date: '2026-09-21', dealKey: 'q', result: 'lost', motion: 'referral' },
    { relPath: 'w3', date: '2026-08-21', dealKey: 'r', result: 'won', motion: 'referral' }
  ];
  const m = computeSalesMetrics(data({ calls, wins }), { month: '2026-09' });
  const ref = m.byMotion.find((x) => x.motion === 'referral');
  assert.equal(ref.name, 'Referral');
  assert.equal(ref.calls, 2);
  assert.equal(ref.won, 1);
  assert.equal(ref.lost, 1);
  assert.equal(ref.open, 1);
  assert.equal(ref.winRate.of, 2);
  assert.equal(ref.winRate.value, null);
  const un = m.byMotion.find((x) => x.motion === 'unclassified');
  assert.equal(un.name, 'Not classified yet');
  assert.equal(un.calls, 1);
});

test('per rep: grouped case-insensitively', () => {
  const calls = [call({ rep: 'Ana', goalMet: true }), call({ rep: ' ana ', goalMet: false }), call({ rep: 'Bo' })];
  const reps = computeSalesMetrics(data({ calls }), { month: '2026-09' }).byRep;
  assert.equal(reps.length, 2);
  assert.equal(reps.find((r) => r.rep === 'Ana').calls, 2);
});

test('empty brain: zeroed metrics, no errors', () => {
  const report = buildSalesReport(data(), { now: new Date('2026-10-17T00:00:00Z') });
  assert.deepEqual(report.windows.map((w) => [w.month, w.complete, w.totals.calls]), [['2026-10', false, 0], ['2026-09', true, 0]]);
  assert.equal(report.comparison, null);
  assert.deepEqual(report.unclassified, []);
  assert.deepEqual(report.excluded, { demo: 0, skipped: 0 });
});

test('comparison only when both windows have 10 or more calls', () => {
  const mk = (month, n) => Array.from({ length: n }, (_, i) => call({ month, date: `${month}-05`, dealKey: `${month}${i}`, goalMet: i % 2 === 0 }));
  const now = new Date('2026-10-17T00:00:00Z');
  const both = buildSalesReport(data({ calls: [...mk('2026-10', 10), ...mk('2026-09', 12)] }), { now });
  assert.equal(both.comparison.from, '2026-09');
  assert.equal(both.comparison.to, '2026-10');
  assert.equal(both.comparison.calls, -2);
  const one = buildSalesReport(data({ calls: [...mk('2026-10', 9), ...mk('2026-09', 12)] }), { now });
  assert.equal(one.comparison, null);
});

test('month override reports that month and compares with the one before', () => {
  const mk = (month, n) => Array.from({ length: n }, (_, i) => call({ month, date: `${month}-05`, dealKey: `${month}${i}` }));
  const r = buildSalesReport(data({ calls: [...mk('2026-08', 10), ...mk('2026-07', 10)] }), { now: new Date('2026-10-17T00:00:00Z'), month: '2026-08' });
  assert.deepEqual(r.windows.map((w) => w.month), ['2026-08']);
  assert.equal(r.comparison.from, '2026-07');
});

test('journeys per motion with entry step; unclassified paths and exclusions reported', () => {
  const plays2 = [play({ id: 'cold-call', title: 'Cold call', motions: ['cold-outbound'], firstStage: 1 }), play({ firstStage: 2 })];
  const stageNames = new Map([['1', 'Reach out'], ['2', 'Discovery']]);
  const r = buildSalesReport(data({ plays: plays2, stageNames, calls: [call({ relPath: 'c1', play: 'discovery' })], skipped: [{ relPath: 's', reason: 'x' }], demoExcluded: 2 }), { now: new Date('2026-10-17T00:00:00Z') });
  const cold = r.journeys.find((j) => j.motion === 'cold-outbound');
  assert.deepEqual(cold.plays.map((p) => p.play), ['cold-call', 'discovery']);
  assert.equal(cold.entryName, 'Reach out');
  const inbound = r.journeys.find((j) => j.motion === 'inbound');
  assert.deepEqual(inbound.plays.map((p) => p.play), ['discovery']);
  assert.equal(inbound.entryName, 'Discovery');
  assert.deepEqual(r.unclassified, ['c1']);
  assert.deepEqual(r.excluded, { demo: 2, skipped: 1 });
});

test('loadSalesReport reads a brain and builds the report with an injected now', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/calls/2026-09/a.md': '---\nrep: "Ana"\nprospect_company: "Acme"\ndate: "2026-09-10"\noutcome: "Advanced"\nplay: "discovery"\nmotion: referral\ngoal_met: true\n---\n',
    'sales/plays/discovery.md': '---\nplay: discovery\nstages: 2\ngoal: g\nsuccess: understood\n---\n# Discovery\n'
  });
  const r = loadSalesReport(dir, { now: new Date('2026-10-17T00:00:00Z') });
  assert.equal(r.windows[1].month, '2026-09');
  assert.equal(r.windows[1].totals.calls, 1);
  assert.equal(r.windows[1].byMotion[0].motion, 'referral');
  assert.equal(loadSalesReport(dir, { now: new Date('2026-10-17T00:00:00Z'), month: '2026-09' }).windows.length, 1);
}));
