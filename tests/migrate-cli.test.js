// CLI tests for `clc-brain migrate` (subprocess, temp dirs). Planning and applying are covered in tests/core/migrate.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const BODY = '# Cold calls\n\n## First call\n\n### Opening\nsay: Hi, do you have two minutes?\n';

const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '', env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: '' } });

function withBrain(language, fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-migrate-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--areas', 'sales', '--language', language, '--methodology', 'sandler'], { encoding: 'utf8' });
    const kernelFile = path.join(brain, 'org-kernel.json');
    const kernel = JSON.parse(fs.readFileSync(kernelFile, 'utf8'));
    delete kernel.methodology;
    fs.writeFileSync(kernelFile, JSON.stringify(kernel, null, 2));
    fs.writeFileSync(path.join(brain, 'sales', 'scripts', 'cold-calls.md'), BODY);
    fs.writeFileSync(path.join(brain, 'sales', 'scripts', 'notes.md'), '# Notes\n\nJust prose.\n');
    fn(brain, outer);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}

test('migrate previews a plain plan by default and writes nothing', () =>
  withBrain('en', (brain) => {
    const before = fs.readFileSync(path.join(brain, 'org-kernel.json'), 'utf8');
    const res = cli('migrate', brain);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /sandler/i);
    assert.match(res.stdout, /sales\/scripts\/cold-calls\.md/);
    assert.match(res.stdout, /sales\/scripts\/notes\.md[^\n]*assistant/);
    assert.match(res.stdout, /--yes/);
    assert.equal(fs.readFileSync(path.join(brain, 'org-kernel.json'), 'utf8'), before);
    assert.equal(fs.existsSync(path.join(brain, 'org-kernel.json.bak')), false);
  }));

test('migrate --yes applies the plan with backups, and a second run has nothing to do', () =>
  withBrain('en', (brain) => {
    const res = cli('migrate', brain, '--yes');
    assert.equal(res.status, 0, res.stderr);
    assert.equal(JSON.parse(fs.readFileSync(path.join(brain, 'org-kernel.json'), 'utf8')).methodology, 'sandler');
    assert.match(fs.readFileSync(path.join(brain, 'sales', 'scripts', 'cold-calls.md'), 'utf8'), /^---\nscript: cold-calls\n/);
    assert.ok(fs.existsSync(path.join(brain, 'sales', 'scripts', 'cold-calls.md.bak')));
    assert.equal(fs.readFileSync(path.join(brain, 'sales', 'scripts', 'notes.md'), 'utf8'), '# Notes\n\nJust prose.\n');
    const again = cli('migrate', brain);
    assert.equal(again.status, 0);
    assert.doesNotMatch(again.stdout, /--yes/, 'nothing left to apply');
  }));

test('migrate speaks the brain language', () =>
  withBrain('es', (brain) => {
    const res = cli('migrate', brain);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Migración del cerebro/);
    assert.match(res.stdout, /asistente/);
    assert.doesNotMatch(res.stdout, /Will change|Dry run/);
  }));

test('migrate on a folder that is not a brain fails with a plain message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-migrate-none-'));
  try {
    const res = cli('migrate', dir);
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /not a brain/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('help lists migrate', () => {
  const res = cli('--help');
  assert.match(res.stdout, /migrate/);
  assert.match(res.stdout, /MIGRATE OPTIONS/);
});
