import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDealVerdicts, VERDICTS, CLOSE_REASONS } from '../../src/core/deal-verdict.js';
import { resolveCriteria } from '../../src/core/scorecard.js';

const card = (ids = [], extra = {}) => ({
  status: 'scored', statusImplied: false, scores: {}, counts: {}, problems: [],
  qualification: Object.fromEntries(ids.map((id) => [id, 'evidenced'])), ...extra
});
let n = 0;
const call = (dealKey, over = {}) => {
  n += 1;
  const date = over.date ?? '2026-09-10';
  const month = date.slice(0, 7);
  return { relPath: `sales/calls/${month}/c${n}.md`, date, month, rep: 'Ana', company: `Co ${dealKey}`, dealKey, outcome: 'advanced', disqualify: false, scorecard: null, ...over };
};
const ALL = ['champion', 'economic_buyer', 'identified_pain', 'deal_size'];
const one = (calls, wins = []) => computeDealVerdicts({ calls, wins }).deals;

test('constants', () => {
  assert.deepEqual(VERDICTS, ['advance', 'close', 'not-enough-information']);
  assert.deepEqual(CLOSE_REASONS, ['outcome', 'flag', 'lost-record']);
});

test('S1: calls of all months group into one deal; different keys are separate', () => {
  const deals = one([call('acme', { date: '2026-08-02' }), call('acme', { date: '2026-09-02' }), call('beta')]);
  assert.equal(deals.length, 2);
  assert.equal(deals.find((d) => d.dealKey === 'acme').calls, 2);
});

test('S2: last call is by date then relPath, not by month directory', () => {
  const a = call('acme', { date: '2026-09-10', relPath: 'sales/calls/2026-08/x.md', rep: 'Late', outcome: 'stalled' });
  const b = call('acme', { date: '2026-09-01', relPath: 'sales/calls/2026-09/y.md', rep: 'Early' });
  const [d] = one([b, a]);
  assert.equal(d.lastDate, '2026-09-10');
  assert.equal(d.rep, 'Late');
  assert.equal(d.lastOutcome, 'stalled');
  const t1 = call('tie', { date: '2026-09-10', relPath: 'sales/calls/2026-09/a.md', rep: 'A' });
  const t2 = call('tie', { date: '2026-09-10', relPath: 'sales/calls/2026-09/b.md', rep: 'B' });
  assert.equal(one([t2, t1])[0].rep, 'B');
});

test('S3: only scored calls give evidence; too-thin and null are ignored', () => {
  const [d] = one([
    call('acme', { scorecard: card(['champion'], { status: 'too-thin' }) }),
    call('acme', { scorecard: null }),
    call('acme', { scorecard: card(['economic_buyer']) })
  ]);
  assert.deepEqual(d.evidenced.map((e) => e.id), ['economic_buyer']);
  assert.equal(d.scoredCalls, 1);
  assert.ok(!d.missing.some((m) => m.id === 'economic_buyer'));
  assert.ok(d.missing.some((m) => m.id === 'champion'));
});

test('S4.1: evidence is the union across scored calls, not just the last', () => {
  const [d] = one([
    call('acme', { date: '2026-09-01', scorecard: card(['champion']) }),
    call('acme', { date: '2026-09-05', scorecard: card(['economic_buyer']) })
  ]);
  assert.deepEqual(d.evidenced.map((e) => e.id), ['economic_buyer', 'champion']); // matrix criteria order
});

test('S5: advance when every requirement is evidenced; missing is in requirement order, labelled', () => {
  const [ok] = one([call('acme', { scorecard: card(ALL) })]);
  assert.equal(ok.verdict, 'advance');
  assert.deepEqual(ok.missing, []);
  assert.equal(ok.reason, null);
  const [part] = one([call('beta', { scorecard: card(['identified_pain', 'champion']) })]);
  assert.equal(part.verdict, 'not-enough-information');
  assert.deepEqual(part.missing.map((m) => m.id), ['economic_buyer', 'deal_size']);
  assert.equal(part.missing[0].label, 'Economic Buyer');
});

test('S5: close by outcome beats advance; disqualified and closed-lost both close', () => {
  for (const outcome of ['disqualified', 'closed-lost']) {
    const [d] = one([call('acme', { outcome, scorecard: card(ALL) })]);
    assert.equal(d.verdict, 'close');
    assert.equal(d.reason, 'outcome');
  }
});

test('S5: the disqualify flag is sticky across later calls', () => {
  const [d] = one([
    call('acme', { date: '2026-09-01' }),
    call('acme', { date: '2026-09-05', disqualify: true }),
    call('acme', { date: '2026-09-09', scorecard: card(ALL) })
  ]);
  assert.equal(d.verdict, 'close');
  assert.equal(d.reason, 'flag');
});

test('S5: a lost record closes; reason precedence outcome > flag > lost-record', () => {
  const lost = [{ dealKey: 'acme', result: 'lost' }];
  const [a] = one([call('acme', { scorecard: card(ALL) })], lost);
  assert.deepEqual([a.verdict, a.reason], ['close', 'lost-record']);
  const [b] = one([call('acme', { disqualify: true })], lost);
  assert.equal(b.reason, 'flag');
  const [c] = one([call('acme', { disqualify: true, outcome: 'closed-lost' })], lost);
  assert.equal(c.reason, 'outcome');
});

test('S5: closed-won is excluded (last outcome or won record) and counted; won beats close', () => {
  const r = computeDealVerdicts({
    calls: [call('w1', { outcome: 'closed-won' }), call('w2', { disqualify: true }), call('live')],
    wins: [{ dealKey: 'w2', result: 'won' }]
  });
  assert.deepEqual(r.deals.map((d) => d.dealKey), ['live']);
  assert.equal(r.summary.excludedWon, 2);
});

test('S5.7: a deal with zero scored calls is listed as not enough information, missing all requirements', () => {
  const [d] = one([call('acme')]);
  assert.equal(d.verdict, 'not-enough-information');
  assert.equal(d.scoredCalls, 0);
  assert.deepEqual(d.missing.map((m) => m.id), ALL.slice());
});

test('calls without a deal key are counted, never listed', () => {
  const r = computeDealVerdicts({ calls: [call(''), call('')] });
  assert.deepEqual(r.deals, []);
  assert.equal(r.summary.noDeal, 2);
});

test('list order: advance, not-enough-information, close; then last date desc; then key', () => {
  const deals = one([
    call('c-close', { outcome: 'disqualified' }),
    call('b-nei', { date: '2026-09-01' }),
    call('a-nei', { date: '2026-09-01' }),
    call('z-nei', { date: '2026-09-20' }),
    call('adv', { scorecard: card(ALL) })
  ]);
  assert.deepEqual(deals.map((d) => d.dealKey), ['adv', 'z-nei', 'a-nei', 'b-nei', 'c-close']);
});

test('summary counts and requirement labels follow the criteria', () => {
  const criteria = resolveCriteria({ criteria: 'budget, need', label_need: 'The real problem', advance_requires: 'need' });
  const r = computeDealVerdicts({ calls: [call('a', { scorecard: card(['need']) }), call('b'), call('c', { outcome: 'disqualified' })], criteria });
  assert.deepEqual([r.summary.advance, r.summary.notEnough, r.summary.close], [1, 1, 1]);
  assert.deepEqual(r.summary.requires, [{ id: 'need', label: 'The real problem' }]);
  assert.equal(r.summary.requiresSource, 'matrix');
  assert.equal(r.deals.find((d) => d.dealKey === 'b').missing[0].label, 'The real problem');
});

test('empty input gives empty deals and zero summary', () => {
  const r = computeDealVerdicts();
  assert.deepEqual(r.deals, []);
  assert.deepEqual([r.summary.advance, r.summary.close, r.summary.notEnough, r.summary.excludedWon, r.summary.noDeal], [0, 0, 0, 0, 0]);
  assert.equal(r.summary.requires.length, 4);
});
