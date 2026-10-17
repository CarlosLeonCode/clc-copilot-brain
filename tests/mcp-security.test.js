import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executeTool, TOOLS_DEFINITIONS } from '../src/mcp/tools.js';

const validCall = {
  rep: 'Carlos',
  prospect: 'Acme Corp',
  date: '2026-10-15',
  summary: 'Prospect showed interest in enterprise plan.',
  stage: 'Discovery',
  outcome: 'Next step scheduled',
};

function withSandbox(fn) {
  // outer/ holds a sentinel so we can detect writes escaping the brain root.
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-sec-'));
  const rootDir = path.join(outer, 'brain');
  fs.mkdirSync(rootDir);
  return Promise.resolve(fn({ outer, rootDir })).finally(() =>
    fs.rmSync(outer, { recursive: true, force: true })
  );
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)));
}

function frontmatterKeys(content) {
  const block = content.split('---')[1];
  return block.split('\n').filter(Boolean).map((line) => line.split(':')[0]);
}

test('brain_capture_call rejects a path-traversal date and writes nothing', () =>
  withSandbox(async ({ outer, rootDir }) => {
    const res = await executeTool('brain_capture_call', { ...validCall, date: '../../../evil' }, { rootDir });
    assert.equal(res.isError, true);
    assert.deepEqual(listFiles(outer), []);
  }));

test('brain_capture_call rejects malformed and impossible dates', () =>
  withSandbox(async ({ rootDir }) => {
    for (const date of ['2026-13-01', '2026-02-30', '2026/10/15', '15-10-2026', '2026-10-15x', '']) {
      const res = await executeTool('brain_capture_call', { ...validCall, date }, { rootDir });
      assert.equal(res.isError, true, `date "${date}" must be rejected`);
    }
    assert.deepEqual(listFiles(rootDir), []);
  }));

test('brain_capture_call quotes frontmatter so newlines cannot inject keys', () =>
  withSandbox(async ({ rootDir }) => {
    const res = await executeTool(
      'brain_capture_call',
      { ...validCall, prospect: 'Acme\nadmin: true', stage: 'Discovery: phase 1' },
      { rootDir }
    );
    assert.equal(res.isError, false);
    const [file] = listFiles(path.join(rootDir, 'sales', 'calls'));
    const content = fs.readFileSync(path.join(rootDir, 'sales', 'calls', file), 'utf8');
    assert.deepEqual(frontmatterKeys(content), ['rep', 'prospect_company', 'date', 'deal_stage', 'outcome', 'created_at']);
    assert.ok(content.includes('prospect_company: "Acme\\nadmin: true"'));
    assert.ok(content.includes('deal_stage: "Discovery: phase 1"'));
  }));

test('brain_capture_call never overwrites an existing call log', () =>
  withSandbox(async ({ rootDir }) => {
    await executeTool('brain_capture_call', { ...validCall, summary: 'first' }, { rootDir });
    await executeTool('brain_capture_call', { ...validCall, summary: 'second' }, { rootDir });
    const res = await executeTool('brain_capture_call', { ...validCall, summary: 'third' }, { rootDir });
    assert.equal(res.isError, false);
    const dir = path.join(rootDir, 'sales', 'calls', '2026-10');
    assert.deepEqual(listFiles(dir).sort(), [
      '2026-10-15_carlos_acme-corp-2.md',
      '2026-10-15_carlos_acme-corp-3.md',
      '2026-10-15_carlos_acme-corp.md',
    ]);
    assert.ok(fs.readFileSync(path.join(dir, '2026-10-15_carlos_acme-corp.md'), 'utf8').includes('first'));
    assert.ok(res.content[0].text.includes('2026-10-15_carlos_acme-corp-3.md'));
  }));

test('brain_query rejects an area outside the allowed list', () =>
  withSandbox(async ({ outer, rootDir }) => {
    fs.writeFileSync(path.join(outer, 'secret.md'), 'TOPSECRET token');
    for (const area of ['../..', '..', '/etc', 'unknown']) {
      const res = await executeTool('brain_query', { query: 'topsecret', area }, { rootDir });
      assert.equal(res.isError, true, `area "${area}" must be rejected`);
    }
  }));

test('brain_query accepts every area advertised in its input schema', () =>
  withSandbox(async ({ rootDir }) => {
    const def = TOOLS_DEFINITIONS.find((t) => t.name === 'brain_query');
    for (const area of def.inputSchema.properties.area.enum) {
      const res = await executeTool('brain_query', { query: 'x', area }, { rootDir });
      assert.notEqual(res.isError, true, `area "${area}" must be accepted`);
    }
  }));

test('brain_capture_objection validates against the JSON schema (suggestedNextStep minLength)', () =>
  withSandbox(async ({ rootDir }) => {
    const res = await executeTool('brain_capture_objection', {
      id: 'timing-bad',
      title: 'Not now',
      category: 'timing',
      severity: 'medium',
      rootCause: 'Buyer has competing priorities this quarter.',
      pivotScript: 'Understood. What milestones need to happen first?',
      counterArguments: ['Delay costs more'],
      suggestedNextStep: 'No',
    }, { rootDir });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /suggestedNextStep/);
    assert.deepEqual(listFiles(rootDir), []);
  }));

test('brain_capture_objection rejects a traversal id', () =>
  withSandbox(async ({ outer, rootDir }) => {
    const res = await executeTool('brain_capture_objection', {
      id: '../../evil',
      title: 'Not now',
      category: 'timing',
      severity: 'medium',
      rootCause: 'Buyer has competing priorities this quarter.',
      pivotScript: 'Understood. What milestones need to happen first?',
      counterArguments: ['Delay costs more'],
    }, { rootDir });
    assert.equal(res.isError, true);
    assert.deepEqual(listFiles(outer), []);
  }));

test('brain_doctor does not advertise an unimplemented "fix" parameter', () => {
  const def = TOOLS_DEFINITIONS.find((t) => t.name === 'brain_doctor');
  assert.equal(def.inputSchema.properties.fix, undefined);
});
