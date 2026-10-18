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

function withBrain(areas, fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-stats-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--name', 'StatCorp', '--industry', 'tech', '--tagline', 'S', '--areas', areas], { encoding: 'utf8' });
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

test('stats --json prints the full report for the assistant', () => {
  withBrain('sales', (brain) => {
    for (let i = 0; i < 3; i++) addCall(brain, i);
    const res = run('stats', brain, '--json');
    assert.equal(res.status, 0, res.stderr);
    const report = JSON.parse(res.stdout);
    assert.equal(report.windows[0].month, month);
    assert.equal(report.windows[0].totals.calls, 3);
    assert.ok(Array.isArray(report.journeys));
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
