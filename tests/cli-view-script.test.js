// CLI tests for scripts in `clc-brain view` (subprocess, temp brains, neutral sample).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE } from './fixtures/sample-script.js';

const CLI = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'bin', 'cli.js');
const ENV = { ...process.env, LC_ALL: '', LANG: 'en_US.UTF-8' };
const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '', env: ENV });
const BROKEN = '---\nscript: broken\ntitle: Broken\nversion: 1\nstatus: active\n---\nno conversations\n';

function withBrain(fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-view-script-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--name', 'Sample Co', '--industry', 'tech', '--tagline', 'S', '--areas', 'sales'], { encoding: 'utf8', env: ENV });
    fs.mkdirSync(path.join(brain, 'sales', 'scripts'), { recursive: true });
    fn(brain, outer);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}
const scripts = (brain, name) => path.join(brain, 'sales', 'scripts', name);

test('view writes scripts/<slug>.html and the page with a Scripts section, exit 0', () => withBrain((brain) => {
  fs.writeFileSync(scripts(brain, 'sample-co.md'), SAMPLE);
  const res = run('view', brain);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(fs.existsSync(scripts(brain, 'sample-co.html')));
  assert.match(fs.readFileSync(path.join(brain, 'sales', 'sales-system.html'), 'utf8'), /Open the script/);
  assert.match(res.stdout, /sample-co\.html/);
}));

test('an invalid script is skipped with a warning and the other pages still render', () => withBrain((brain) => {
  fs.writeFileSync(scripts(brain, 'sample-co.md'), SAMPLE);
  fs.writeFileSync(scripts(brain, 'broken.md'), BROKEN);
  const res = run('view', brain);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /broken/);
  assert.match(res.stdout, /needs fixing/i);
  assert.ok(fs.existsSync(scripts(brain, 'sample-co.html')));
  assert.equal(fs.existsSync(scripts(brain, 'broken.html')), false);
}));

test('hand-made html without the generator meta is not overwritten and a warning is shown', () => withBrain((brain) => {
  fs.writeFileSync(scripts(brain, 'sample-co.md'), SAMPLE);
  fs.writeFileSync(scripts(brain, 'sample-co.html'), '<html>mine</html>');
  const res = run('view', brain);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /hand-made/);
  assert.equal(fs.readFileSync(scripts(brain, 'sample-co.html'), 'utf8'), '<html>mine</html>');
}));

test('view --draft <script.md> previews the page and script pages in a temp folder, nothing saved, --open targets the script', () => withBrain((brain, outer) => {
  const draft = path.join(outer, 'draft.md');
  fs.writeFileSync(draft, SAMPLE.replace('status: active', 'status: draft'));
  const res = run('view', brain, '--draft', draft);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /nothing is saved/i);
  const preview = /(\/\S+sales-system-preview\.html)/.exec(res.stdout)[1];
  const dir = path.dirname(preview);
  try {
    assert.ok(path.relative(brain, preview).startsWith('..'));
    const page = fs.readFileSync(path.join(dir, 'scripts', 'sample-co.html'), 'utf8');
    assert.match(page, /Draft — not saved yet/);
    assert.match(res.stdout, /scripts\/sample-co\.html/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  assert.deepEqual(fs.readdirSync(scripts(brain, '')).filter((f) => f.endsWith('.html') || f.startsWith('sample-co')), []);
  assert.equal(fs.existsSync(path.join(brain, 'sales', 'sales-system-preview.html')), false);
}));

test('view --draft with a script that has no steps exits 1 with readable lines and no preview claim', () => withBrain((brain, outer) => {
  const draft = path.join(outer, 'bad.md');
  fs.writeFileSync(draft, BROKEN);
  const res = run('view', brain, '--draft', draft);
  assert.equal(res.status, 1);
  const out = res.stdout + res.stderr;
  assert.match(out, /bad\.md/);
  assert.match(out, /line \d+/i);
  assert.doesNotMatch(out, /Preview ready/);
}));
