import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesReport } from '../../src/core/sales-metrics.js';
import { formatSalesReport } from '../../src/core/sales-report-text.js';
import { renderDashboard } from '../../src/core/sales-dashboard.js';
import { resolveCriteria, DIMENSIONS } from '../../src/core/scorecard.js';
import { DICTIONARIES, t } from '../../src/core/i18n.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const card = (scores = {}, extra = {}) => ({ status: 'scored', statusImplied: false, scores, counts: {}, qualification: {}, problems: [], ...extra });
const call = (i, scorecard, extra = {}) => ({ relPath: `sales/calls/2026-10/c${i}.md`, date: '2026-10-05', month: '2026-10', rep: 'Ana', company: `Co${i}`, dealKey: `co${i}`, outcome: 'advanced', scorecard, ...extra });
const full = (v) => Object.fromEntries(DIMENSIONS.map((d) => [d, v]));
const scored = (n, extra = {}) => Array.from({ length: n }, (_, i) => call(i, card(full(4), { counts: { repTalkShare: 62, questionsAsked: 12 }, qualification: { metrics: 'evidenced', champion: 'missing' }, ...extra })));
const report = (calls, extra = {}) => buildSalesReport({ calls, wins: [], plays: [], stageNames: new Map(), skipped: [], demoExcluded: 0, ...extra }, { now: NOW });
const text = (calls, extra) => formatSalesReport(report(calls, extra));
const html = (calls, extra) => renderDashboard(report(calls, extra));

test('en and es define the same score keys', () => {
  const keys = (d) => Object.keys(d).filter((k) => k.startsWith('score.')).sort();
  assert.ok(keys(DICTIONARIES.en).length >= 20);
  assert.deepEqual(keys(DICTIONARIES.es), keys(DICTIONARIES.en));
  for (const id of DIMENSIONS) assert.ok(DICTIONARIES.en[`score.dim.${id}`] && DICTIONARIES.es[`score.dim.${id}`]);
});

test('text: scored calls show plain dimension names, averages and the estimate label next to 62%', () => {
  const out = text(scored(6));
  assert.match(out, /Finding out what matters: 4 out of 5 \(6 calls, too early to tell\)/);
  assert.match(out, /62% \(estimated\)/);
  assert.match(out, /Metrics: 6 of 6 calls/);
  assert.match(out, /Economic Buyer: not recorded yet\n/);
  assert.doesNotMatch(out, /score_|qual_|discovery_|MEDDPICC/);
});

test('text: fewer than 5 scored calls show counts only, never an average or percentage', () => {
  const out = text(scored(4));
  assert.match(out, /4 scores so far/);
  assert.doesNotMatch(out, /out of 5/);
  assert.doesNotMatch(out, /100%/);
  assert.doesNotMatch(out, /62%/);
});

test('text and page say "not scored yet" for legacy calls, in both languages', () => {
  const legacy = [call(1, null), call(2, null)];
  assert.match(text(legacy), /2 calls not scored yet/);
  assert.match(html(legacy), /2 calls not scored yet/);
  assert.match(formatSalesReport(report(legacy), 'es'), /2 llamadas sin puntuar todavía/);
  assert.equal(t('es', 'score.dim.listening'), 'Escuchar');
});

test('text: too-thin calls are counted separately', () => {
  const out = text([...scored(5), call(9, card({}, { status: 'too-thin' }))]);
  assert.match(out, /1 too thin to score/);
});

test('page: criterion labels come from the matrix, bars are divs, no ids or jargon', () => {
  const criteria = resolveCriteria({ criteria: 'budget, need', label_need: 'The <real> problem' });
  const calls = Array.from({ length: 6 }, (_, i) => call(i, card(full(3), { qualification: { budget: 'evidenced', need: 'missing' } })));
  const out = html(calls, { criteria });
  assert.match(out, /Budget/);
  assert.match(out, /The &lt;real&gt; problem/);
  assert.match(out, /class="fill" style="width:60%"/);
  assert.doesNotMatch(out, /<script|<link|<img|http|url\(|`|\|/);
  assert.doesNotMatch(out, /\w_\w/);
  assert.doesNotMatch(out, /MEDDPICC|\bgate\b|\bplay\b/i);
});

test('page: estimated counts carry the label; empty state renders without scored calls', () => {
  assert.match(html(scored(6)), /62% \(estimated\)/);
  assert.match(html([call(1, null)]), /not scored yet/);
});

test('comparison with 10+ scored calls in both months is mentioned in plain words', () => {
  const sept = Array.from({ length: 10 }, (_, i) => call(i, card(full(3)), { month: '2026-09', date: '2026-09-05' }));
  const out = text([...sept, ...scored(10).map((c, i) => ({ ...c, relPath: `x${i}`, dealKey: `n${i}` }))]);
  assert.match(out, /Scores compared with September 2026: .*Listening \+1/);
});
