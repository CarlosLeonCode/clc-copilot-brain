// CLI tests for `clc-brain stats` (subprocess, temp brains, call logs dated relative to now).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'bin', 'cli.js');
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '' });
const month = new Date().toISOString().slice(0, 7);

// Pin the locale so `init --yes` picks English whatever the machine's language is.
const ENGLISH_ENV = { ...process.env, LC_ALL: '', LANG: 'en_US.UTF-8' };

function withBrain(areas, fn, extra = []) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-stats-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--name', 'StatCorp', '--industry', 'tech', '--tagline', 'S', '--areas', areas, ...extra], { encoding: 'utf8', env: ENGLISH_ENV });
    fn(brain);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}

function addCall(brain, i) {
  const dir = path.join(brain, 'sales', 'calls', month);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${month}-01_c${i}.md`), `---\nrep: "Ana"\nprospect_company: "Co${i}"\ndate: "${month}-01"\ndeal_stage: "Discovery"\noutcome: "Advanced"\nmotion: inbound\ngoal_met: ${i % 2 === 0}\n---\n\nBody\n`);
}

test('stats prints a plain-text table for humans', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 3; i++) addCall(brain, i);
    const res = run('stats', brain);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /so far/);
    assert.match(res.stdout, /Inbound/);
    assert.match(res.stdout, /By person/);
    assert.doesNotMatch(res.stdout, /goal_met|\.md/);
  });
});

test('stats speaks the brain language; --json keeps English keys and says the language', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 3; i++) addCall(brain, i);
    const res = run('stats', brain);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /en lo que va del mes/);
    assert.match(res.stdout, /Por persona/);
    assert.match(res.stdout, /Inbound: 3 llamadas/);
    assert.doesNotMatch(res.stdout, /so far|By person|goal reached/);
    const report = JSON.parse(run('stats', brain, '--json').stdout);
    assert.equal(report.language, 'es');
    assert.equal(report.windows[0].totals.calls, 3);
  }, ['--language', 'es']);
});

test('stats --json prints the full report for the assistant', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 3; i++) addCall(brain, i);
    const res = run('stats', brain, '--json');
    assert.equal(res.status, 0, res.stderr);
    const report = JSON.parse(res.stdout);
    assert.equal(report.windows[0].month, month);
    assert.equal(report.windows[0].totals.calls, 3);
    assert.ok(Array.isArray(report.journeys));
    assert.equal(report.language, 'en');
    const picked = JSON.parse(run('stats', brain, '--month', month, '--json').stdout);
    assert.equal(picked.windows.length, 1);
  });
});

test('stats with a bad --month exits 1 with a plain message', () => {
  withBrain('sales', (brain) => {
    for (const bad of ['2026-13', 'october', '2026-1', '']) {
      const res = run('stats', brain, '--month', bad);
      assert.equal(res.status, 1, `month "${bad}"`);
      assert.match(res.stdout + res.stderr, /YYYY-MM/);
    }
  });
});

test('stats outside a brain exits 1', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'not-brain-'));
  try {
    const res = run('stats', dir);
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /not a brain/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('stats on a brain without the sales area says so clearly', () => {
  withBrain('product', (brain) => {
    const res = run('stats', brain);
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /no sales area/i);
  });
});

function addScored(brain, i, status = 'scored') {
  const dir = path.join(brain, 'sales', 'calls', month);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${month}-02_s${i}.md`), `---\nrep: "Ana"\nprospect_company: "Sc${i}"\ndate: "${month}-02"\ndeal_stage: "Discovery"\noutcome: "Advanced"\nscorecard_status: ${status}\nscore_discovery: ${i % 5 + 1}\nscore_talk_ratio: 3\nscore_listening: 3\nscore_objection_handling: 3\nscore_value_framing: 3\nscore_next_step: 4\nqual_metrics: evidenced\nrep_talk_share: 60\n---\n\nBody\n`);
}

test('stats --json reports scorecard dimensions, sample label and matrix criteria', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 6; i++) addScored(brain, i);
    const res = run('stats', brain, '--json');
    assert.equal(res.status, 0, res.stderr);
    const s = JSON.parse(res.stdout).windows[0].scorecard;
    assert.equal(s.scored, 6);
    assert.deepEqual(s.dimensions.map((d) => d.id), ['talk_ratio', 'discovery', 'listening', 'objection_handling', 'value_framing', 'next_step']);
    assert.ok(s.dimensions.every((d) => d.count === 6 && d.sample === 'too-early'));
    assert.equal(s.dimensions.find((d) => d.id === 'discovery').average, 2.7);
    assert.equal(s.criteriaSource, 'matrix');
    assert.equal(s.criteria.length, 8);
  });
});

test('stats works on an old brain with no scored calls', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 3; i++) addCall(brain, i);
    const res = run('stats', brain, '--json');
    assert.equal(res.status, 0, res.stderr);
    const s = JSON.parse(res.stdout).windows[0].scorecard;
    assert.deepEqual([s.scored, s.notScored], [0, 3]);
  });
});
