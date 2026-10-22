import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withTmp, writeFiles } from './helpers.js';
import { initBrain } from '../../src/core/scaffold.js';
import { readSalesRecords } from '../../src/core/sales-records.js';

const call = (extra = '') => `---\nrep: "Ana"\nprospect_company: "Acme, Inc."\ndate: "2026-09-10"\ndeal_stage: "Discovery"\noutcome: "Advanced"\nplay: "discovery-call"\nbranch: "B1"\n${extra}---\n\nBody\n`;
const table = (outcome, close = '2026-09-18') => `# Post-mortem\n\n| Field | Detail |\n| :--- | :--- |\n| **Prospect / Customer** | **NexaPay Systems, Inc.** |\n| **Assigned Rep (AE)** | **Carlos** |\n| **Outcome** | **${outcome}** |\n| **Close Date** | ${close} |\n`;

test('three-level win-loss result: frontmatter, then filename, then table', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/win-loss/anything.md': '---\nresult: won\nmotion: referral\nlead_source: "Trade Show!"\ndeal_id: D-7\ndate: 2026-09-01\n---\n' + table('CLOSED LOST'),
    'sales/win-loss/2026-09-05_omnibank_lost.md': '# no table here\n',
    'sales/win-loss/legacy.md': table('CLOSED LOST', '2026-08-30'),
    'sales/win-loss/README.md': 'readme',
    'sales/win-loss/post-mortem-template.md': '---\nresult:\n---\n'
  });
  const { wins, skipped } = readSalesRecords(dir);
  const by = Object.fromEntries(wins.map((w) => [path.basename(w.relPath), w]));
  assert.equal(wins.length, 3);
  assert.equal(by['anything.md'].result, 'won');
  assert.equal(by['anything.md'].motion, 'referral');
  assert.equal(by['anything.md'].leadSource, 'trade-show');
  assert.equal(by['anything.md'].dealKey, 'd-7');
  assert.equal(by['2026-09-05_omnibank_lost.md'].result, 'lost');
  assert.equal(by['2026-09-05_omnibank_lost.md'].date, '2026-09-05');
  assert.equal(by['legacy.md'].result, 'lost');
  assert.equal(by['legacy.md'].company, 'NexaPay Systems, Inc.');
  assert.equal(by['legacy.md'].dealKey, 'nexapay systems');
  assert.equal(by['legacy.md'].rep, 'Carlos');
  assert.equal(by['legacy.md'].date, '2026-08-30');
  assert.deepEqual(skipped, []);
}));

test('legacy logs load: no motion, no goal_met, nested keys ignored, BOM ok', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/calls/2026-09/a.md': '﻿' + call('detected_objections:\n  - id: "x"\n    outcome: "nested"\n'),
    'sales/calls/2026-09/b.md': call('motion: Referral\ngoal_met: true\ngate_advanced: false\ndeal_id: D1\n')
  });
  const { calls } = readSalesRecords(dir);
  assert.equal(calls.length, 2);
  const a = calls.find((c) => c.relPath === 'sales/calls/2026-09/a.md');
  assert.equal(a.outcome, 'advanced');
  assert.equal(a.month, '2026-09');
  assert.equal(a.company, 'Acme, Inc.');
  assert.equal(a.dealKey, 'acme');
  assert.equal(a.motion, undefined);
  assert.equal(a.goalMet, undefined);
  const b = calls.find((c) => c.relPath.endsWith('b.md'));
  assert.deepEqual([b.motion, b.goalMet, b.gateAdvanced, b.dealKey], ['referral', true, false, 'd1']);
}));

test('demo excluded with count; user records kept', () => withTmp((dir) => {
  initBrain(dir, { areas: ['sales'], demo: true });
  writeFiles(dir, { 'sales/calls/2026-09/mine.md': call() });
  const { calls, wins, demoExcluded, plays } = readSalesRecords(dir);
  assert.deepEqual(calls.map((c) => c.relPath), ['sales/calls/2026-09/mine.md']);
  assert.equal(wins.length, 0);
  assert.equal(demoExcluded, 3);
  assert.equal(plays.length, 4);
}));

test('skipped list carries a reason for each unreadable or incomplete record', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/calls/2026-09/nofm.md': 'just text',
    'sales/calls/2026-09/baddate.md': call().replace('2026-09-10', 'someday'),
    'sales/win-loss/undecided.md': '# nothing to read\n'
  });
  const { calls, wins, skipped } = readSalesRecords(dir);
  assert.equal(calls.length + wins.length, 0);
  const reasons = Object.fromEntries(skipped.map((s) => [s.relPath, s.reason]));
  assert.match(reasons['sales/calls/2026-09/nofm.md'], /frontmatter/);
  assert.match(reasons['sales/calls/2026-09/baddate.md'], /date/);
  assert.match(reasons['sales/win-loss/undecided.md'], /won or lost/);
}));

test('empty or missing sales folder returns zeroed data', () => withTmp((dir) => {
  const r = readSalesRecords(dir);
  assert.deepEqual([r.calls, r.wins, r.plays, r.skipped, r.demoExcluded], [[], [], [], [], 0]);
  assert.ok(r.stageNames instanceof Map);
}));

test('stays inside sales/, symlinks skipped', () => withTmp((dir) => {
  writeFiles(dir, { 'sales/calls/2026-09/ok.md': call(), 'outside/evil.md': call() });
  fs.symlinkSync(path.join(dir, 'outside', 'evil.md'), path.join(dir, 'sales/calls/2026-09/link.md'));
  fs.symlinkSync(path.join(dir, 'outside'), path.join(dir, 'sales/calls/2026-10'));
  const { calls, skipped } = readSalesRecords(dir);
  assert.deepEqual(calls.map((c) => c.relPath), ['sales/calls/2026-09/ok.md']);
  assert.ok(skipped.some((s) => s.relPath.endsWith('link.md') && /symlink/.test(s.reason)));
  assert.ok(skipped.some((s) => s.relPath.endsWith('2026-10') && /symlink/.test(s.reason)));
}));

test('tagged demo samples carry motion data', () => {
  const sales = path.join(import.meta.dirname, '..', '..', 'templates', 'areas', 'sales');
  const demoCall = fs.readFileSync(path.join(sales, 'calls/2026-09/2026-09-15_carlos_acme-corp.md'), 'utf8');
  assert.match(demoCall, /^motion: "inbound"$/m);
  assert.match(demoCall, /^goal_met: true$/m);
  for (const f of ['sample-closed-won-fintech.md', 'sample-closed-lost-legacy.md']) {
    assert.match(fs.readFileSync(path.join(sales, 'win-loss', f), 'utf8'), /^---\n[\s\S]*?^result: (won|lost)$/m);
  }
});

test('call records carry disqualify: true only when the flag is true, else false', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/calls/2026-09/a.md': call('disqualify: true\n'),
    'sales/calls/2026-09/b.md': call('disqualify: garbage\n'),
    'sales/calls/2026-09/c.md': call('')
  });
  const by = Object.fromEntries(readSalesRecords(dir).calls.map((c) => [c.relPath.split('/').pop(), c.disqualify]));
  assert.deepEqual(by, { 'a.md': true, 'b.md': false, 'c.md': false });
}));

test('Spanish win-loss names and results: _ganado / _perdido files and result ganado / perdido', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/win-loss/2026-09-05_hotel-faro_ganado.md': '# sin tabla\n',
    'sales/win-loss/2026-09-06_tienda-sol_perdido.md': '# sin tabla\n',
    'sales/win-loss/notas.md': '---\nresult: perdido\ndate: 2026-09-07\ncompany: Agencia Mar\n---\n'
  });
  const by = Object.fromEntries(readSalesRecords(dir).wins.map((w) => [w.relPath.split('/').pop(), w]));
  assert.equal(by['2026-09-05_hotel-faro_ganado.md'].result, 'won');
  assert.equal(by['2026-09-05_hotel-faro_ganado.md'].company, 'hotel faro');
  assert.equal(by['2026-09-06_tienda-sol_perdido.md'].result, 'lost');
  assert.equal(by['notas.md'].result, 'lost');
}));
