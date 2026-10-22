import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesReport } from '../../src/core/sales-metrics.js';
import { renderDashboard } from '../../src/core/sales-dashboard.js';
import { escapeHtml as fromHtmlEscape } from '../../src/core/html-escape.js';
import { escapeHtml as fromSalesView, buildSalesView } from '../../src/core/sales-view.js';
import { initBrain } from '../../src/core/scaffold.js';
import { withTmp, writeFiles } from './helpers.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const call = (i, extra = {}) => ({ relPath: `sales/calls/2026-10/c${i}.md`, date: '2026-10-05', month: '2026-10', rep: 'Ana', company: `Co${i}`, dealKey: `co${i}`, play: 'cold-call', branch: 'B1', motion: 'cold-outbound', outcome: 'advanced', goalMet: true, ...extra });
const play = (extra = {}) => ({ id: 'cold-call', title: 'Cold call', success: 'Books a meeting', successDefined: true, motions: ['cold-outbound'], firstStage: 1, branches: [{ id: 'B1', when: 'They say no budget' }], ...extra });
const html = (calls, extra = {}) => renderDashboard(buildSalesReport({ calls, wins: [], plays: [play()], stageNames: new Map([['1', 'Prospecting']]), skipped: [], demoExcluded: 0, ...extra }, { now: NOW }));

test('escapeHtml lives in html-escape and sales-view re-exports it', () => {
  assert.equal(fromHtmlEscape('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  assert.equal(fromSalesView, fromHtmlEscape);
});

test('shows this month so far and the last complete month with totals, bars and plain wording', () => {
  const out = html([call(1), call(2, { goalMet: false }), call(3, { rep: 'Ben' }), call(4), call(5), call(6)]);
  assert.match(out, /How it&#39;s going/);
  assert.match(out, /October 2026 \(so far\)/);
  assert.match(out, /September 2026/);
  assert.match(out, /No calls logged yet/, 'the empty last month says so');
  assert.match(out, /5 of 6 calls \(83%, too early to tell\)/);
  assert.match(out, /style="width:83%"/);
  assert.match(out, /By type of sale/);
  assert.match(out, /Cold outreach/);
  assert.match(out, /Success means: Books a meeting/);
  assert.match(out, /Where calls miss their goal/);
  assert.match(out, /They say no budget/);
});

test('per person numbers are shown on the page', () => {
  const out = html([call(1), call(2, { rep: 'Ben', goalMet: false })]);
  assert.match(out, /By person/);
  assert.match(out, /Ana/);
  assert.match(out, /Ben/);
});

test('small samples show counts only, 5 to 9 say too early to tell, 10 or more show the percentage', () => {
  const few = html([call(1), call(2), call(3, { goalMet: false })]);
  assert.match(few, /2 of 3 calls/);
  assert.doesNotMatch(few, /67%|width:67/);
  const some = html(Array.from({ length: 6 }, (_, i) => call(i, { goalMet: i < 3 })));
  assert.match(some, /too early to tell/);
  const many = html(Array.from({ length: 10 }, (_, i) => call(i, { goalMet: i < 5 })));
  assert.match(many, /5 of 10 calls \(50%\)/);
  assert.doesNotMatch(many, /5 of 10 calls \(50%, too early/);
});

test('win rate per type of sale and journeys with entry step and call guides', () => {
  const wins = [{ relPath: 'sales/win-loss/a.md', date: '2026-10-03', company: 'Co1', dealKey: 'co1', result: 'won', motion: 'cold-outbound' }];
  const out = html([call(1)], { wins });
  assert.match(out, /Deals won: 1 of 1 deals/);
  assert.match(out, /How deals start/);
  assert.match(out, /Starts at Prospecting/);
  assert.match(out, /Cold call/);
});

test('guides without a success definition say success not defined yet', () => {
  const out = html([call(1, { goalMet: undefined })], { plays: [play({ success: 'Book a meeting', successDefined: false })] });
  assert.match(out, /Success not defined yet/);
  assert.doesNotMatch(out, /Success means/);
});

test('records without a type of sale show Not classified yet with a plain hint', () => {
  const out = html([call(1, { motion: undefined, play: '' })]);
  assert.match(out, /Not classified yet/);
  assert.match(out, /ask your assistant to classify your older calls/i);
});

test('notes: sample records left out and unreadable records', () => {
  const out = html([call(1)], { demoExcluded: 3, skipped: [{ relPath: 'sales/calls/x.md', reason: 'bad' }] });
  assert.match(out, /Sample records are left out/);
  assert.match(out, /could not be read/);
  assert.doesNotMatch(html([call(1)]), /Sample records are left out/);
});

test('no scripts, links, images or URLs, and no jargon, ids, paths or markdown leftovers', () => {
  const out = html([call(1), call(2, { goalMet: false }), call(3, { motion: undefined, play: '' })], { demoExcluded: 1 });
  assert.doesNotMatch(out, /<script|<link|<img|<a\b|https?:\/\/|url\(/i);
  const text = out.replace(/<[^>]*>/g, ' ');
  for (const jargon of [/\bmotions?\b/i, /\bplays?\b/i, /\bgates?\b/i, /goal_met|goalMet|gate_advanced/, /cold-outbound|cold-call/, /sales\//, /\.md\b/, /`/, /\|/, /\bB1\b/]) {
    assert.doesNotMatch(text, jargon);
  }
});

test('escapes record and guide text', () => {
  const out = html([call(1, { rep: '<script>alert(1)</script>' })], { plays: [play({ title: '<img src=x>', success: '<b>x</b>' })] });
  assert.doesNotMatch(out, /<script>|<img src|<b>x/);
  assert.match(out, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('a fresh brain page gets the section without any data', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const page = buildSalesView(dir, { now: NOW }).html;
    assert.match(page, /How it&#39;s going/);
    assert.match(page, /No calls logged yet/);
    assert.ok(page.indexOf('How your sales system works') < page.indexOf('How it&#39;s going'));
    assert.ok(page.indexOf('How it&#39;s going') < page.indexOf('Your pipeline'));
  }));

test('the page shows computed numbers from call logs on disk and leaves sample data out', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const log = (rep, met) => ['---', 'rep: ' + rep, 'prospect: Globex', 'date: 2026-10-04', 'stage: 1', 'outcome: advanced', 'motion: inbound', 'play: cold-call', `goal_met: ${met}`, '---', ''].join('\n');
    writeFiles(dir, { 'sales/calls/2026-10/a.md': log('Zoe', true), 'sales/calls/2026-10/b.md': log('Zed', false) });
    const page = buildSalesView(dir, { now: NOW }).html;
    assert.match(page, /1 of 2 calls/);
    assert.match(page, /Zoe/);
    assert.match(page, /Inbound/);
  }));

test('"By industry" shows only when a call has an industry; a per-industry branch stalls under the generic trigger', () => {
  assert.doesNotMatch(html([call(1)]), /By industry/);
  const out = html([call(1, { industry: 'Retail', goalMet: false }), call(2, { industry: 'retail' }), call(3)]);
  assert.match(out, /By industry/);
  assert.match(out, /Retail[\s\S]*2 calls/);
  assert.match(out, /No industry recorded[\s\S]*1 call/);
  assert.match(out, /They say no budget/);
  const es = renderDashboard(buildSalesReport({ calls: [call(1, { industry: 'Retail' })], wins: [], plays: [play()], stageNames: new Map(), skipped: [], demoExcluded: 0 }, { now: NOW, lang: 'es' }), 'es');
  assert.match(es, /Por industria/);
});
