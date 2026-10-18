import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CALL_FIELDS, captureCall, isIsoDate, readCallLog } from '../../src/core/calls.js';
import { parseFrontmatter } from '../../src/core/plays.js';
import { BrainError } from '../../src/core/errors.js';
import { TOOLS_DEFINITIONS } from '../../src/mcp/tools.js';
import { withTmp } from './helpers.js';

const call = { rep: 'Ana Ruiz', prospect: 'Globex Inc', date: '2026-10-02', summary: 'Intro', stage: 'Discovery', outcome: 'Demo booked' };

test('isIsoDate accepts only real YYYY-MM-DD dates', () => {
  assert.equal(isIsoDate('2024-02-29'), true);
  for (const bad of ['2025-02-29', '2026-1-01', '2026-10-15T00:00', 20261015, null]) assert.equal(isIsoDate(bad), false);
});

test('captureCall writes a slugged log under the call month with optional sections', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, { ...call, objections: ['Too expensive'], actionItems: ['Send ROI'] });
    assert.equal(relPath, 'sales/calls/2026-10/2026-10-02_ana-ruiz_globex-inc.md');
    const content = fs.readFileSync(path.join(dir, relPath), 'utf8');
    assert.match(content, /## 3\. Detected Objections\n- Too expensive/);
    assert.match(content, /- \[ \] Send ROI/);
    assert.doesNotMatch(content, /Raw Call Transcript/);
  }));

test('captureCall rejects missing fields and bad dates with VALIDATION errors', () =>
  withTmp((dir) => {
    const isValidation = (err) => err instanceof BrainError && err.code === 'VALIDATION';
    assert.throws(() => captureCall(dir, { ...call, outcome: '' }), isValidation);
    assert.throws(() => captureCall(dir, { ...call, date: '2026-10-32' }), isValidation);
    assert.equal(fs.existsSync(path.join(dir, 'sales')), false);
  }));

function readLog(dir, relPath) {
  return fs.readFileSync(path.join(dir, relPath), 'utf8');
}

test('CALL_FIELDS maps input names to canonical frontmatter keys (S8.1)', () => {
  assert.equal(Object.isFrozen(CALL_FIELDS), true);
  assert.equal(CALL_FIELDS.prospect, 'prospect_company');
  assert.equal(CALL_FIELDS.stage, 'deal_stage');
  assert.equal(CALL_FIELDS.play, 'play');
  assert.equal(CALL_FIELDS.branch, 'branch');
  assert.equal(CALL_FIELDS.gateAdvanced, 'gate_advanced');
});

test('captureCall persists play, branch and gate_advanced with canonical keys (S8.1)', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, { ...call, play: 'cold-call', branch: 'B2', gateAdvanced: true });
    const fm = parseFrontmatter(readLog(dir, relPath));
    assert.equal(fm.play, 'cold-call');
    assert.equal(fm.branch, 'B2');
    assert.equal(fm.gate_advanced, 'true');
    assert.equal(fm.prospect_company, 'Globex Inc');
    assert.equal(fm.deal_stage, 'Discovery');
    assert.equal(fm.prospect, undefined);
    assert.equal(fm.stage, undefined);
  }));

test('captureCall omits absent optional fields (S8.2)', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, call);
    const content = readLog(dir, relPath);
    assert.doesNotMatch(content, /^(play|branch|gate_advanced):/m);
    assert.deepEqual(Object.keys(parseFrontmatter(content)), ['rep', 'prospect_company', 'date', 'deal_stage', 'outcome', 'created_at']);
  }));

test('captureCall requires gateAdvanced to be a boolean', () =>
  withTmp((dir) => {
    assert.throws(() => captureCall(dir, { ...call, gateAdvanced: 'yes' }), (e) => e instanceof BrainError && e.code === 'VALIDATION');
    assert.equal(fs.existsSync(path.join(dir, 'sales')), false);
  }));

test('captureCall escapes play and branch so newlines cannot inject keys', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, { ...call, play: 'cold-call\nadmin: true', branch: 'B1: x' });
    const fm = parseFrontmatter(readLog(dir, relPath));
    assert.equal(fm.admin, undefined);
    assert.equal(fm.play, 'cold-call\nadmin: true');
  }));

test('readCallLog loads a legacy log without play fields (S9.1)', () => {
  const legacy = '---\nrep: "Ana"\nprospect: "Old Co"\ndate: "2026-01-02"\nstage: "Discovery"\noutcome: "ok"\n---\n\n# body\n';
  const rec = readCallLog(legacy);
  assert.equal(rec.play, undefined);
  assert.equal(rec.branch, undefined);
  assert.equal(rec.gateAdvanced, undefined);
});

test('readCallLog aliases deal_stage ?? stage and prospect_company ?? prospect', () => {
  const canon = readCallLog('---\nrep: "A"\nprospect_company: "New Co"\ndeal_stage: "Validation"\ngate_advanced: true\nplay: "demo-call"\n---\n');
  assert.equal(canon.prospect, 'New Co');
  assert.equal(canon.stage, 'Validation');
  assert.equal(canon.gateAdvanced, true);
  assert.equal(canon.play, 'demo-call');
  const legacy = readCallLog('---\nprospect: "Old Co"\nstage: "Discovery"\n---\n');
  assert.equal(legacy.prospect, 'Old Co');
  assert.equal(legacy.stage, 'Discovery');
});

test('captureCall stores motion, lead_source and deal_id as slugs and writes the fields in order (R1.2)', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, {
      ...call, motion: 'Cold Outbound', leadSource: 'Trade Show!', dealId: 'Deal 7', play: 'cold-call', branch: 'B2', goalMet: false, gateAdvanced: true
    });
    const fm = parseFrontmatter(readLog(dir, relPath));
    assert.equal(fm.motion, 'cold-outbound');
    assert.equal(fm.lead_source, 'trade-show');
    assert.equal(fm.deal_id, 'deal-7');
    assert.equal(fm.goal_met, 'false');
    assert.deepEqual(Object.keys(fm), [
      'rep', 'prospect_company', 'date', 'deal_stage', 'outcome', 'motion', 'lead_source', 'deal_id', 'play', 'branch', 'goal_met', 'gate_advanced', 'created_at'
    ]);
  }));

test('captureCall omits motion fields that slug to nothing', () =>
  withTmp((dir) => {
    const { relPath } = captureCall(dir, { ...call, motion: '!!!', leadSource: '', goalMet: true });
    const fm = parseFrontmatter(readLog(dir, relPath));
    assert.equal(fm.motion, undefined);
    assert.equal(fm.lead_source, undefined);
    assert.equal(fm.goal_met, 'true');
  }));

test('captureCall rejects a non-boolean goalMet with VALIDATION and writes nothing', () =>
  withTmp((dir) => {
    assert.throws(() => captureCall(dir, { ...call, goalMet: 'yes' }), (e) => e instanceof BrainError && e.code === 'VALIDATION');
    assert.equal(fs.existsSync(path.join(dir, 'sales')), false);
  }));

test('readCallLog reads the new fields tolerantly and ignores nested keys', () => {
  const rec = readCallLog('---\nrep: "A"\nmotion: "Bad Slug"\nlead_source: "referral"\ndeal_id: "D1"\ngoal_met: false\ndetected_objections:\n  goal_met: true\n---\n');
  assert.equal(rec.motion, 'bad-slug');
  assert.equal(rec.leadSource, 'referral');
  assert.equal(rec.dealId, 'd1');
  assert.equal(rec.goalMet, false);
  const legacy = readCallLog('---\nrep: "A"\n---\n');
  assert.equal(legacy.motion, undefined);
  assert.equal(legacy.goalMet, undefined);
});

test('CALL_FIELDS gains the new keys while the MCP brain_capture_call schema stays unchanged (decision 11)', () => {
  assert.equal(CALL_FIELDS.leadSource, 'lead_source');
  assert.equal(CALL_FIELDS.dealId, 'deal_id');
  assert.equal(CALL_FIELDS.goalMet, 'goal_met');
  assert.equal(CALL_FIELDS.motion, 'motion');
  const tool = TOOLS_DEFINITIONS.find((t) => t.name === 'brain_capture_call');
  assert.deepEqual(Object.keys(tool.inputSchema.properties), [
    'rep', 'prospect', 'date', 'summary', 'stage', 'outcome', 'play', 'branch', 'gateAdvanced', 'notes', 'objections', 'actionItems', 'rawTranscript'
  ]);
  assert.deepEqual(tool.inputSchema.required, ['rep', 'prospect', 'date', 'summary', 'stage', 'outcome']);
});
