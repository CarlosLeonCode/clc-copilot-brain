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

function cli(...args) {
  return spawnSync('node', [CLI, ...args], { encoding: 'utf8' });
}

function initBrain(dir, extra = []) {
  execFileSync('node', [CLI, 'init', dir, '--name', 'RegCorp', '--industry', 'tech', '--tagline', 'Reg', '--areas', 'sales', ...extra], { encoding: 'utf8' });
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

    execFileSync('node', [CLI, 'clean-demo', brain], { encoding: 'utf8' });

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
