import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleOf, makeAverage, makeRate, computeSalesMetrics, buildSalesReport } from '../../src/core/sales-metrics.js';
import { resolveCriteria, NOT_ENOUGH } from '../../src/core/scorecard.js';

const card = (scores = {}, extra = {}) => ({ status: 'scored', statusImplied: false, scores, counts: {}, qualification: {}, problems: [], ...extra });
const call = (i, scorecard, month = '2026-09') => ({ relPath: `sales/calls/${month}/c${i}.md`, date: `${month}-10`, month, rep: 'Ana', company: `Co${i}`, dealKey: `d${month}${i}`, outcome: 'advanced', scorecard });
const data = (calls, extra = {}) => ({ calls, wins: [], plays: [], stageNames: new Map(), skipped: [], demoExcluded: 0, ...extra });
const sc = (calls, month = '2026-09', extra) => computeSalesMetrics(data(calls, extra), { month }).scorecard;
const dim = (s, id) => s.dimensions.find((d) => d.id === id);

test('sampleOf matches makeRate thresholds 4/5/9/10', () => {
  assert.deepEqual([4, 5, 9, 10].map(sampleOf), ['count-only', 'too-early', 'too-early', 'ok']);
  assert.equal(makeRate(3, 4).sample, 'count-only');
});

test('makeAverage rounds to one decimal and keeps n', () => {
  assert.deepEqual(makeAverage(11, 3), { average: 3.7, count: 3, sample: 'count-only' });
  assert.deepEqual(makeAverage(0, 0), { average: null, count: 0, sample: 'count-only' });
  assert.equal(makeAverage(24, 6).average, 4);
});

test('averages skip not-enough-evidence and too-thin calls: 4,2,NEE,5 = 3.7 n=3', () => {
  const calls = [4, 2, NOT_ENOUGH, 5].map((v, i) => call(i, card({ discovery: v })));
  calls.push(call(9, card({ discovery: 5 }, { status: 'too-thin' })));
  const s = sc(calls);
  assert.equal(s.scored, 4);
  assert.equal(s.tooThin, 1);
  assert.deepEqual(dim(s, 'discovery'), { id: 'discovery', average: 3.7, count: 3, sample: 'count-only', low: false });
});

test('dimension sample label and low flag follow the thresholds', () => {
  const five = sc([2, 2, 2, 2, 3].map((v, i) => call(i, card({ listening: v }))));
  assert.equal(dim(five, 'listening').sample, 'too-early');
  assert.equal(dim(five, 'listening').average, 2.2);
  assert.equal(dim(five, 'listening').low, true);
  const four = sc([1, 1, 1, 1].map((v, i) => call(i, card({ listening: v }))));
  assert.equal(dim(four, 'listening').low, false);
  const ten = sc(Array.from({ length: 10 }, (_, i) => call(i, card({ listening: 4 }))));
  assert.deepEqual([dim(ten, 'listening').sample, dim(ten, 'listening').low], ['ok', false]);
});

test('unscored calls are counted; no scored calls keeps every dimension empty', () => {
  const s = sc([call(1, null), call(2, null)]);
  assert.deepEqual([s.scored, s.tooThin, s.notScored], [0, 0, 2]);
  assert.equal(s.dimensions.length, 6);
  assert.deepEqual(s.dimensions.map((d) => [d.average, d.count]), Array(6).fill([null, 0]));
});

test('estimated counts average only over calls that record the value', () => {
  const s = sc([call(1, card({}, { counts: { questionsAsked: 10, repTalkShare: 60 } })), call(2, card({}, { counts: { questionsAsked: 15 } })), call(3, card())]);
  assert.deepEqual(s.counts.questionsAsked, { average: 12.5, count: 2 });
  assert.equal(s.counts.repTalkShare.average, 60);
  assert.equal(s.counts.repTalkShare.count, 1);
  assert.equal(s.counts.longestMonologueSeconds.average, null);
});

test('coverage 3 evidenced, 1 missing, 2 not recorded = 75% over 4', () => {
  const q = (v) => card({}, { qualification: v === undefined ? {} : { metrics: v } });
  const s = sc(['evidenced', 'evidenced', 'evidenced', 'missing', undefined, undefined].map((v, i) => call(i, q(v))));
  const metrics = s.criteria.find((c) => c.id === 'metrics');
  assert.deepEqual(metrics.coverage, { count: 3, of: 4, value: 0.75, sample: 'count-only' });
  assert.equal(metrics.notRecorded, 2);
  assert.equal(metrics.label, 'Metrics');
  assert.deepEqual(s.criteria.map((c) => c.id).slice(0, 2), ['metrics', 'economic_buyer']);
  assert.equal(s.criteriaSource, 'fallback');
});

test('criteria come from records.criteria in matrix order; unknown qual ids are ignored; too-thin excluded', () => {
  const criteria = resolveCriteria({ criteria: 'budget, need', label_need: 'The real problem' });
  const calls = [
    call(1, card({}, { qualification: { budget: 'evidenced', need: 'missing', gone: 'evidenced' } })),
    call(2, card({}, { status: 'too-thin', qualification: { budget: 'missing' } }))
  ];
  const s = sc(calls, '2026-09', { criteria });
  assert.deepEqual(s.criteria.map((c) => [c.id, c.label, c.coverage.of]), [['budget', 'Budget', 1], ['need', 'The real problem', 1]]);
  assert.equal(s.criteriaSource, 'matrix');
});

test('legacy windows keep their existing keys; scorecard is additive', () => {
  const m = computeSalesMetrics(data([call(1, null)]), { month: '2026-09' });
  assert.deepEqual(Object.keys(m), ['month', 'complete', 'totals', 'outcomes', 'byMotion', 'byPlay', 'byRep', 'byIndustry', 'scorecard']);
});

const many = (n, month, value, offset = 0) => Array.from({ length: n }, (_, i) => call(offset + i, card({ discovery: value }, { qualification: { metrics: 'evidenced' } }), month));
const NOW = new Date('2026-10-15T12:00:00Z');

test('comparison.scorecard appears only when both months have 10+ scored calls', () => {
  const both = buildSalesReport(data([...many(10, '2026-09', 3), ...many(10, '2026-10', 4, 50)]), { now: NOW });
  assert.deepEqual(both.comparison.scorecard.dimensions.find((d) => d.id === 'discovery'), { id: 'discovery', delta: 1 });
  assert.deepEqual(both.comparison.scorecard.criteria.find((c) => c.id === 'metrics'), { id: 'metrics', delta: 0 });
  const short = buildSalesReport(data([...many(9, '2026-09', 3), ...many(12, '2026-10', 4, 50)]), { now: NOW });
  assert.equal(Object.hasOwn(short.comparison ?? {}, 'scorecard'), false);
  const unscored = buildSalesReport(data([...Array.from({ length: 10 }, (_, i) => call(i, null, '2026-09')), ...many(10, '2026-10', 4, 50)]), { now: NOW });
  assert.equal(Object.hasOwn(unscored.comparison, 'scorecard'), false);
});
