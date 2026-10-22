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
const FLOW = path.join('.agents', 'skills', 'flow', 'SKILL.md');

// The oldest flow skill this package shipped: an untouched old copy that upgrade may replace.
const OLD_FLOW = (() => {
  try {
    const rel = 'templates/base/.agents/skills/flow/SKILL.md';
    const commits = execFileSync('git', ['log', '--format=%H', '--', rel], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
    return execFileSync('git', ['show', `${commits.at(-1)}:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // shallow clone without history
  }
})();
const needsHistory = (t) => (OLD_FLOW === null ? (t.skip('git history unavailable'), true) : false);

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

test('upgrade without a TTY and without --yes prints the plan, writes nothing and exits non-zero (S13.2)', (t) => {
  if (needsHistory(t)) return;
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, OLD_FLOW);
    const res = cli('upgrade', brain);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /flow\/SKILL\.md/);
    assert.match(res.stdout, /--yes/);
    assert.equal(fs.readFileSync(file, 'utf8'), OLD_FLOW);
    assert.equal(fs.existsSync(`${file}.bak`), false);
  });
});

test('upgrade --dry-run shows a diff and writes nothing, even with --yes', (t) => {
  if (needsHistory(t)) return;
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, OLD_FLOW);
    const res = cli('upgrade', brain, '--dry-run', '--yes');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Will replace.*flow\/SKILL\.md/);
    assert.match(res.stdout, /^ {4}[-+] /m, 'a diff is shown');
    assert.equal(fs.readFileSync(file, 'utf8'), OLD_FLOW);
    assert.equal(fs.existsSync(`${file}.bak`), false);
  });
});

test('upgrade --yes updates an untouched old copy, keeps a .bak and reports it', (t) => {
  if (needsHistory(t)) return;
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, OLD_FLOW);
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), OLD_FLOW);
    assert.match(res.stdout, /SKILL\.md\.bak/);
    assert.match(cli('upgrade', brain).stdout, /nothing to do/i);
  });
});

test('upgrade --yes reports skips (existing backup) and does not clobber it', (t) => {
  if (needsHistory(t)) return;
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, OLD_FLOW);
    fs.writeFileSync(`${file}.bak`, 'older backup');
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /backup-exists|backup already exists/i);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), 'older backup');
    assert.equal(fs.readFileSync(file, 'utf8'), OLD_FLOW);
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

test('upgrade without a folder argument targets the current directory (S17.2)', (t) => {
  if (needsHistory(t)) return;
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    fs.writeFileSync(file, OLD_FLOW);
    const res = spawnSync(process.execPath, [CLI, 'upgrade', '--yes'], { encoding: 'utf8', input: '', cwd: brain });
    assert.equal(res.status, 0);
    assert.notEqual(fs.readFileSync(file, 'utf8'), OLD_FLOW);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), OLD_FLOW);
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

const EDIT = '\n## Our method\nAlways qualify with Sandler: pain, budget, decision.\n';

test('upgrade keeps an edited skill (edited locally) and rebuilds its shortcut from the edited skill', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    const edited = `${fs.readFileSync(file, 'utf8')}${EDIT}`;
    fs.writeFileSync(file, edited);
    const preview = cli('upgrade', brain, '--dry-run');
    assert.equal(preview.status, 0);
    assert.match(preview.stdout, /flow\/SKILL\.md.*kept \(edited locally\)/);
    assert.doesNotMatch(preview.stdout, /Will replace/);
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), edited);
    assert.equal(fs.existsSync(`${file}.bak`), false);
    assert.match(fs.readFileSync(path.join(brain, '.claude', 'skills', 'flow', 'SKILL.md'), 'utf8'), /Always qualify with Sandler/, 'the shortcut follows the brain skill');
    const again = cli('upgrade', brain);
    assert.equal(again.status, 0, 'only kept files left: nothing to apply, so no --yes is needed');
    assert.match(again.stdout, /kept \(edited locally\)/);
    assert.match(again.stdout, /nothing to do|up to date/i);
  });
});

test('upgrade --force-skills replaces an edited skill, keeps a .bak and refreshes the shortcut', () => {
  withBrain((brain) => {
    const file = path.join(brain, FLOW);
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, `${original}${EDIT}`);
    const res = cli('upgrade', brain, '--yes', '--force-skills');
    assert.equal(res.status, 0);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.equal(fs.readFileSync(`${file}.bak`, 'utf8'), `${original}${EDIT}`);
    assert.doesNotMatch(fs.readFileSync(path.join(brain, '.claude', 'skills', 'flow', 'SKILL.md'), 'utf8'), /Always qualify with Sandler/);
  });
});

test('upgrade keeps a customized qualification matrix without criteria and says why', () => {
  withBrain((brain) => {
    const matrix = path.join(brain, 'sales', 'qualification', 'qualification-matrix.md');
    const sandler = '# Matriz Sandler\n\n| **1. Dolor** | El dolor |\n';
    fs.writeFileSync(matrix, sandler);
    const res = cli('upgrade', brain, '--yes');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /qualification-matrix\.md.*kept \(edited locally\)/);
    assert.equal(fs.readFileSync(matrix, 'utf8'), sandler);
    assert.equal(fs.existsSync(`${matrix}.bak`), false);
  });
});

test('doctor warns about a shortcut out of date with its edited skill and --fix rebuilds it', () => {
  withBrain((brain) => {
    fs.appendFileSync(path.join(brain, FLOW), EDIT);
    const before = cli('doctor', brain);
    assert.match(before.stdout, /out of date with their skill/);
    assert.match(before.stdout, /doctor --fix/);
    const fixed = cli('doctor', brain, '--fix');
    assert.equal(fixed.status, 0);
    assert.match(fs.readFileSync(path.join(brain, '.claude', 'skills', 'flow', 'SKILL.md'), 'utf8'), /Always qualify with Sandler/);
    assert.doesNotMatch(cli('doctor', brain).stdout, /out of date/);
  });
});
