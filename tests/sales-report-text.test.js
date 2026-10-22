import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesReport } from '../src/core/sales-metrics.js';
import { formatSalesReport } from '../src/core/sales-report-text.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const call = (i, extra = {}) => ({ relPath: `sales/calls/2026-10/c${i}.md`, date: '2026-10-05', month: '2026-10', rep: 'Ana', company: `Co${i}`, dealKey: `co${i}`, play: 'cold-call', branch: 'B1', outcome: 'advanced', goalMet: true, ...extra });
const plays = [{ id: 'cold-call', title: 'Cold call', success: 'Books a meeting', successDefined: true, motions: ['cold-outbound'], firstStage: 1, branches: [{ id: 'B1', when: 'They say no budget' }] }];
const text = (calls, extra = {}) => formatSalesReport(buildSalesReport({ calls, wins: [], plays, stageNames: new Map(), skipped: [], demoExcluded: 0, ...extra }, { now: NOW }));

test('plain wording with month names, type of sale and per-person sections', () => {
  const out = text([call(1), call(2, { rep: 'Ben', goalMet: false }), call(3)]);
  assert.match(out, /October 2026/);
  assert.match(out, /so far/);
  assert.match(out, /September 2026/);
  assert.match(out, /Cold outreach/);
  assert.match(out, /By type of sale/);
  assert.match(out, /By person/);
  assert.match(out, /Ana/);
  assert.match(out, /They say no budget/, 'stall points use the branch trigger text');
  assert.doesNotMatch(out, /\bmotions?\b|\breps?\b/i, 'no jargon');
  assert.doesNotMatch(out, /sales\/|\.md|goal_met|goalMet|B1|cold-outbound|cold-call/, 'no paths, field names or ids');
});

test('small samples show counts only and 5-9 say too early to tell', () => {
  const few = text([call(1), call(2), call(3)]);
  assert.match(few, /2? ?of 3|3 of 3/);
  assert.doesNotMatch(few, /100%/);
  const some = text(Array.from({ length: 6 }, (_, i) => call(i, { goalMet: i < 3 })));
  assert.match(some, /too early to tell/i);
  const many = text(Array.from({ length: 10 }, (_, i) => call(i, { goalMet: i < 5 })));
  assert.match(many, /50%/);
});

test('empty month says there are no calls and unclassified and demo notes appear', () => {
  const out = text([], { demoExcluded: 2 });
  assert.match(out, /No calls logged/);
  assert.match(out, /sample/i);
  const un = text([call(1, { play: '' })]);
  assert.match(un, /Not classified yet/);
  assert.match(un, /type of sale/);
});

test('the text report lists calls by industry only when one is recorded', () => {
  assert.doesNotMatch(text([call(1)]), /By industry/);
  const out = text([call(1, { industry: 'Retail' }), call(2)]);
  assert.match(out, /By industry\n  Retail: 1 call, goal reached/);
  assert.match(out, /  No industry recorded: 1 call/);
});
