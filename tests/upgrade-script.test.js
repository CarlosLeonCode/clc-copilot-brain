// An older brain gets the script skill, its shortcuts and the refreshed assistant rules, and nothing under sales/ changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const START = '<!-- copilot-brain:managed:start -->';
const END = '<!-- copilot-brain:managed:end -->';
const SCRIPT_FILES = ['.agents/skills/script/SKILL.md', '.claude/skills/script/SKILL.md', '.gemini/commands/script.toml', '.windsurf/workflows/script.md'];
const USER_FILES = {
  'sales/scripts/cold-outreach-email.md': '# Old starter\nEnglish example.\n',
  'sales/scripts/hand-made.html': '<html><body>made by hand</body></html>\n',
  'sales/scripts/mine.md': '---\nscript: mine\ntitle: Mine\nversion: 1\nstatus: draft\n---\n',
  'sales/glossary.md': '# Glossary\n',
  'sales/system.md': '# My own map\n',
  'sales/plays/cold-call.md': '# My own play\n'
};

test('upgrade adds the script skill and shortcuts, refreshes the AGENTS block, never touches sales/', () => {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-upgrade-script-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--name', 'UpCorp', '--industry', 'tech', '--tagline', 'Up', '--areas', 'sales'], { encoding: 'utf8' });
    for (const rel of SCRIPT_FILES) fs.rmSync(path.join(brain, rel), { force: true });
    fs.rmSync(path.join(brain, '.agents/skills/script'), { recursive: true, force: true });
    const agents = path.join(brain, 'AGENTS.md');
    const fresh = fs.readFileSync(agents, 'utf8');
    const old = `${fresh.slice(0, fresh.indexOf(START))}${START}\nold rules\n${END}${fresh.slice(fresh.indexOf(END) + END.length)}`;
    fs.writeFileSync(agents, old);
    for (const [rel, text] of Object.entries(USER_FILES)) {
      fs.mkdirSync(path.dirname(path.join(brain, rel)), { recursive: true });
      fs.writeFileSync(path.join(brain, rel), text);
    }

    const res = spawnSync(process.execPath, [CLI, 'upgrade', brain, '--yes'], { encoding: 'utf8', input: '' });
    assert.equal(res.status, 0, res.stderr);

    for (const rel of SCRIPT_FILES) assert.ok(fs.existsSync(path.join(brain, rel)), `${rel} added`);
    const now = fs.readFileSync(agents, 'utf8');
    assert.doesNotMatch(now, /old rules/);
    assert.match(now, /Scripts and glossary:/);
    assert.equal(fs.readFileSync(`${agents}.bak`, 'utf8'), old);
    for (const [rel, text] of Object.entries(USER_FILES)) assert.equal(fs.readFileSync(path.join(brain, rel), 'utf8'), text, `${rel} untouched`);
    assert.equal(fs.existsSync(path.join(brain, 'sales/scripts/cold-outreach-email.md.bak')), false);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});
