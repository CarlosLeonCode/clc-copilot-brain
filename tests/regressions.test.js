// Regression tests for defects fixed during the hexagonal split (ADR 0001).
// Each test exercises a public interface (CLI subprocess, MCP tool, package manifest).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeTool } from '../src/mcp/tools.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');

function sandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'brain-regress-'));
}

// Pin the locale so a brain created here is English whatever the machine's language is.
const ENGLISH_ENV = { ...process.env, LC_ALL: '', LANG: 'en_US.UTF-8' };

function cli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: ENGLISH_ENV });
}

function initBrain(dir, extra = []) {
  execFileSync(process.execPath, [CLI, 'init', dir, '--name', 'RegCorp', '--industry', 'tech', '--tagline', 'Reg', '--areas', 'sales', ...extra], { encoding: 'utf8', env: ENGLISH_ENV });
}

test('add-area --custom rejects an id outside ^[a-z0-9_-]+$ (path traversal)', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--clean']);
    const res = cli('add-area', brain, '--custom', '../escaped');
    assert.notEqual(res.status, 0, 'invalid custom area id must fail');
    assert.equal(fs.existsSync(path.join(outer, 'escaped')), false, 'nothing may be written outside the brain');
    const kernel = JSON.parse(fs.readFileSync(path.join(brain, 'org-kernel.json'), 'utf8'));
    assert.deepEqual(kernel.activeAreas, ['sales']);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('brain_query accepts custom areas declared in org-kernel.json activeAreas', async () => {
  const rootDir = sandbox();
  try {
    fs.writeFileSync(path.join(rootDir, 'org-kernel.json'), JSON.stringify({ activeAreas: ['sales', 'security_compliance', '../evil'] }));
    fs.mkdirSync(path.join(rootDir, 'security_compliance'));
    fs.writeFileSync(path.join(rootDir, 'security_compliance', 'threat-model.md'), '# Threat model\nSOC2 controls');

    const ok = await executeTool('brain_query', { query: 'soc2', area: 'security_compliance' }, { rootDir });
    assert.notEqual(ok.isError, true);
    assert.match(ok.content[0].text, /threat-model\.md/);

    const bad = await executeTool('brain_query', { query: 'x', area: '../evil' }, { rootDir });
    assert.equal(bad.isError, true, 'kernel entries must still match the area id pattern');
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('every package.json "files" entry exists on disk', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const missing = pkg.files.filter((entry) => !fs.existsSync(path.join(REPO_ROOT, entry)));
  assert.deepEqual(missing, []);
});

test('clean-demo removes seeded demo calls but keeps real calls from the same month', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--demo']);
    const demoMonth = fs.readdirSync(path.join(REPO_ROOT, 'templates', 'areas', 'sales', 'calls'))
      .find((e) => /^\d{4}-\d{2}$/.test(e));
    const realCall = path.join(brain, 'sales', 'calls', demoMonth, `${demoMonth}-28_ana_globex.md`);
    fs.writeFileSync(realCall, '# Real customer call');

    execFileSync(process.execPath, [CLI, 'clean-demo', brain], { encoding: 'utf8' });

    assert.ok(fs.existsSync(realCall), 'a real call log must never be removed by clean-demo');
    const remaining = fs.readdirSync(path.dirname(realCall));
    assert.deepEqual(remaining, [path.basename(realCall)], 'the seeded demo call must be removed');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('init backs up an existing regular CLAUDE.md instead of deleting it', () => {
  const brain = sandbox();
  try {
    fs.writeFileSync(path.join(brain, 'CLAUDE.md'), '# My own Claude rules\n');
    initBrain(brain, ['--clean', '--yes']);
    assert.equal(fs.readFileSync(path.join(brain, 'CLAUDE.md.bak'), 'utf8'), '# My own Claude rules\n');
    assert.equal(fs.readlinkSync(path.join(brain, 'CLAUDE.md')), 'AGENTS.md');
  } finally {
    fs.rmSync(brain, { recursive: true, force: true });
  }
});

test('MCP tools/list advertises the custom areas declared in org-kernel.json', async () => {
  const { McpServer } = await import('../src/mcp/server.js');
  const rootDir = sandbox();
  try {
    fs.writeFileSync(path.join(rootDir, 'org-kernel.json'), JSON.stringify({ activeAreas: ['sales', 'legal_ops'] }));
    const res = await new McpServer({ rootDir }).handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const query = res.result.tools.find((t) => t.name === 'brain_query');
    assert.ok(query.inputSchema.properties.area.enum.includes('legal_ops'));
    assert.ok(query.inputSchema.properties.area.enum.includes('finance_legal'));
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('doctor exits 1 when the brain has errors and 0 when healthy or warnings-only', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--yes']);
    assert.equal(cli('doctor', brain).status, 0, 'fresh scaffold is healthy');

    fs.unlinkSync(path.join(brain, 'skills', 'skill_sales_copilot.md'));
    assert.equal(cli('doctor', brain, '--fix').status, 0, 'warnings repaired by --fix leave exit 0');

    fs.rmSync(path.join(brain, 'org-kernel.json'));
    const broken = cli('doctor', brain);
    assert.equal(broken.status, 1, 'missing org-kernel.json is an error');
    assert.equal(cli('doctor', brain, '--fix').status, 1, '--fix cannot repair errors, so exit stays 1');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('doctor without --fix and without a TTY does not prompt and exits 1 on errors', () => {
  const empty = sandbox();
  try {
    const res = spawnSync(process.execPath, [CLI, 'doctor', empty], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
    assert.equal(res.error, undefined, 'doctor must not hang');
    assert.equal(res.status, 1, 'an empty dir has errors (missing org-kernel.json, AGENTS.md)');
    assert.match(res.stdout, /--fix/, 'non-interactive runs print a hint to use --fix');
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

test('--help documents every flag the commands accept', () => {
  const { stdout, status } = cli('--help');
  assert.equal(status, 0);
  for (const flag of ['--name', '--industry', '--tagline', '--areas', '--language', '--demo', '--clean', '--yes', '--preset', '--custom', '--fix', '--dry-run', 'upgrade', 'view', '--open', '--draft', 'stats', '--month', '--json']) {
    assert.ok(stdout.includes(flag), `help is missing ${flag}`);
  }
});

test('init ends with tool-neutral next steps: plain onboarding phrase, first objection and an MCP config for this brain', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'acme brain');
    const { stdout, status } = cli('init', brain, '--yes', '--areas', 'sales');
    assert.equal(status, 0);
    assert.match(stdout, /Next steps/);
    assert.match(stdout, /Let's set up my brain/, 'onboarding works in any tool by asking in plain words');
    assert.match(stdout, /in Claude Code you can also type \/brain:onboarding/);
    assert.doesNotMatch(stdout, /Run \/brain:onboarding/);
    assert.match(stdout, /too expensive/i);
    assert.doesNotMatch(stdout, /\/objection/, 'examples must not rely on Claude Code slash commands');
    const config = JSON.parse(stdout.slice(stdout.indexOf('{\n  "mcpServers"'), stdout.indexOf('\n}\n') + 2));
    assert.deepEqual(config.mcpServers['acme brain'], { command: 'clc-brain', args: ['mcp', path.resolve(brain)] }, 'MCP snippet must be valid JSON with the absolute brain path');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('init next steps are tailored to the installed areas, not only sales', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'ops-brain');
    const { stdout, status } = cli('init', brain, '--yes', '--areas', 'operations,hr_people');
    assert.equal(status, 0);
    assert.doesNotMatch(stdout, /\/objection/);
    assert.match(stdout, /incident/i);
    assert.match(stdout, /onboarding plan/i);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('view writes the sales system page and prints its path in plain words', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--clean', '--yes']);
    const page = path.join(brain, 'sales', 'sales-system.html');
    fs.rmSync(page, { force: true });
    const { stdout, status } = cli('view', brain);
    assert.equal(status, 0);
    assert.ok(fs.existsSync(page), 'view must write sales/sales-system.html');
    assert.match(stdout, /Your sales system page is ready/);
    assert.ok(stdout.includes(page), 'the absolute path of the page is printed');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

const DRAFT_COLD_CALL = [
  '---', 'play: cold-call', 'stages: 1', 'goal: Book a discovery meeting', 'gate_unlocked: Stage 1 entry', 'version: 2', 'status: active', '---',
  '# Play: Cold Call', '', '## Decision Tree', '', '```mermaid', 'flowchart TD',
  '    B1{"Opener"} -->|"Asks for an email"| B9["Send a two-line email and call back Friday"]', '```', ''
].join('\n');

test('view --draft writes a preview outside the brain and leaves the saved page alone', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--clean', '--yes']);
    const page = path.join(brain, 'sales', 'sales-system.html');
    const before = fs.readFileSync(page, 'utf8');
    const draft = path.join(outer, 'cold-call-draft.md');
    fs.writeFileSync(draft, DRAFT_COLD_CALL);
    const pipeline = path.join(outer, 'pipeline-draft.md');
    fs.writeFileSync(pipeline, '```mermaid\nflowchart LR\n  A["1. Meet"] --> B["2. Win"]\n```\n');
    const { stdout, status } = cli('view', brain, '--draft', draft, '--draft', pipeline);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /preview/i);
    assert.match(stdout, /nothing is saved/i);
    const previewPath = /(\/\S+\.html)/.exec(stdout)[1];
    try {
      assert.ok(path.relative(brain, previewPath).startsWith('..'), 'preview lives outside the brain');
      const html = fs.readFileSync(previewPath, 'utf8');
      assert.match(html, /Draft — not saved yet/);
      assert.match(html, /Send a two-line email/);
      assert.match(html, /1\. Meet/);
    } finally {
      fs.rmSync(path.dirname(previewPath), { recursive: true, force: true });
    }
    assert.equal(fs.readFileSync(page, 'utf8'), before, 'sales-system.html is unchanged');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('view --draft exits 1 with a plain warning when a draft diagram cannot be drawn', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--clean', '--yes']);
    const page = path.join(brain, 'sales', 'sales-system.html');
    const before = fs.readFileSync(page, 'utf8');
    const draft = path.join(outer, 'broken-draft.md');
    fs.writeFileSync(draft, DRAFT_COLD_CALL.replace('B1{"Opener"}', 'B1{"Opener"'));
    const res = cli('view', brain, '--draft', draft);
    assert.equal(res.status, 1);
    const out = res.stdout + res.stderr;
    assert.match(out, /broken-draft\.md/);
    assert.match(out, /can't be drawn/);
    assert.equal(fs.readFileSync(page, 'utf8'), before);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('view --draft rejects a file that is neither a call guide nor a pipeline', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    initBrain(brain, ['--clean', '--yes']);
    const draft = path.join(outer, 'notes.md');
    fs.writeFileSync(draft, 'just notes');
    assert.equal(cli('view', brain, '--draft', draft).status, 1);
    assert.equal(cli('view', brain, '--draft').status, 1, 'a --draft without a file fails');
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('view outside a brain exits 1', () => {
  const empty = sandbox();
  try {
    assert.equal(cli('view', empty).status, 1);
    assert.equal(fs.existsSync(path.join(empty, 'sales', 'sales-system.html')), false);
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

test('init with sales generates the sales system page and mentions it in plain words', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    const { stdout, status } = cli('init', brain, '--yes', '--areas', 'sales');
    assert.equal(status, 0);
    assert.ok(fs.existsSync(path.join(brain, 'sales', 'sales-system.html')), 'init must generate sales/sales-system.html');
    assert.match(stdout, /Your sales system page: sales\/sales-system\.html/);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});

test('init without sales does not generate or mention the sales system page', () => {
  const outer = sandbox();
  try {
    const brain = path.join(outer, 'brain');
    const { stdout, status } = cli('init', brain, '--yes', '--areas', 'operations');
    assert.equal(status, 0);
    assert.equal(fs.existsSync(path.join(brain, 'sales', 'sales-system.html')), false);
    assert.doesNotMatch(stdout, /sales system page/i);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
});
