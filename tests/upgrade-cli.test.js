// CLI tests for `clc-brain upgrade` (subprocess, temp dirs). Core planning is covered in tests/core/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const FLOW = path.join('.claude', 'commands', 'flow.md');

function cli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '' });
}

function withBrain(fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-upgrade-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--name', 'UpCorp', '--industry', 'tech', '--tagline', 'Up', '--areas', 'sales'], { encoding: 'utf8' });
    fn(brain);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}

test('upgrade on an up-to-date brain says there is nothing to do', () => {
  withBrain((brain) => {
    const res = cli('upgrade', brain);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /nothing to do/i);
  });
});

test('upgrade without a TTY and without --yes prints the plan, writes nothing and exits non-zero (S13.2)', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, '# my edit\n');
    const res = cli('upgrade', brain);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /flow\.md/);
    assert.match(res.stdout, /--yes/);
    assert.equal(fs.readFileSync(file, 'utf8'), '# my edit\n');
    assert.equal(fs.existsSync(`${file}.bak`), false);
  });
});

test('upgrade --dry-run shows a diff and writes nothing, even with --yes', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, '# my edit\n');
    const res = cli('upgrade', brain, '--dry-run', '--yes');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /- # my edit/);
    assert.equal(fs.readFileSync(file, 'utf8'), '# my edit\n');
    assert.equal(fs.existsSync(`${file}.bak`), false);
  });
});

test('upgrade --yes restores the template file, keeps a .bak and reports it', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, '# my edit\n');
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), '# my edit\n');
    assert.match(res.stdout, /flow\.md\.bak/);
    assert.match(cli('upgrade', brain).stdout, /nothing to do/i);
  });
});

test('upgrade --yes reports skips (existing backup) and does not clobber it', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, '# my edit\n');
    fs.writeFileSync(`${file}.bak`, 'older backup');
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /backup-exists|backup already exists/i);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), 'older backup');
    assert.equal(fs.readFileSync(file, 'utf8'), '# my edit\n');
  });
});

test('upgrade outside a brain exits 1 with a clear message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'not-brain-'));
  try {
    const res = cli('upgrade', dir, '--yes');
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /not a brain/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('upgrade without a folder argument targets the current directory (S17.2)', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, '# my edit\n');
    const res = spawnSync(process.execPath, [CLI, 'upgrade', '--yes'], { encoding: 'utf8', input: '', cwd: brain });
    assert.equal(res.status, 0);
    assert.notEqual(fs.readFileSync(file, 'utf8'), '# my edit\n');
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), '# my edit\n');
  });
});

test('upgrade --yes restores the AGENTS.md assistant rules block, keeps a .bak and the CLAUDE.md symlink', () => {
  withBrain((brain) => {
    const agents = path.join(brain, 'AGENTS.md');
    const fresh = fs.readFileSync(agents, 'utf8');
    const start = fresh.indexOf('<!-- copilot-brain:managed:start -->');
    const end = fresh.indexOf('<!-- copilot-brain:managed:end -->') + '<!-- copilot-brain:managed:end -->'.length;
    const edited = `${fresh.slice(0, start)}${fresh.slice(end)}\nMy own note.\n`;
    fs.writeFileSync(agents, edited);
    const preview = cli('upgrade', brain, '--dry-run');
    assert.match(preview.stdout, /assistant rules/i);
    assert.match(preview.stdout, /AGENTS\.md/);
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    const now = fs.readFileSync(agents, 'utf8');
    assert.ok(now.includes(fresh.slice(start, end)), 'managed block restored');
    assert.match(now, /My own note\./, 'user edits outside the block survive');
    assert.equal(fs.readFileSync(`${agents}.bak`, 'utf8'), edited);
    assert.ok(fs.lstatSync(path.join(brain, 'CLAUDE.md')).isSymbolicLink());
    assert.equal(fs.readlinkSync(path.join(brain, 'CLAUDE.md')), 'AGENTS.md');
  });
});
