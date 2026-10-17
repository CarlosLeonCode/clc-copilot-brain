import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PLAY_KEYS, hasDecisionTree, parseFrontmatter, validatePlay } from '../../src/core/plays.js';

const valid = '---\nplay: cold-call\nstages: 1\ngoal: Book a meeting\ngate_unlocked: Stage 1 entry\nversion: 1\nstatus: active\n---\n# Play\n';

test('PLAY_KEYS lists the flat play frontmatter keys', () => {
  assert.deepEqual([...PLAY_KEYS], ['play', 'stages', 'goal', 'gate_unlocked', 'version', 'status']);
});

test('parseFrontmatter reads flat key: value lines and returns null without frontmatter', () => {
  assert.deepEqual(parseFrontmatter(valid), {
    play: 'cold-call', stages: '1', goal: 'Book a meeting', gate_unlocked: 'Stage 1 entry', version: '1', status: 'active'
  });
  assert.equal(parseFrontmatter('# no frontmatter'), null);
  assert.equal(parseFrontmatter('---\nplay: x\n'), null);
});

test('parseFrontmatter unquotes JSON double-quoted scalars and handles CRLF', () => {
  assert.equal(parseFrontmatter('---\r\nrep: "A: b"\r\n---\r\n').rep, 'A: b');
});

test('validatePlay accepts a valid play and legacy stage: (S12.3)', () => {
  assert.deepEqual(validatePlay('cold-call.md', valid), []);
  assert.deepEqual(validatePlay('cold-call.md', valid.replace('stages: 1', 'stage: 1')), []);
  assert.deepEqual(validatePlay('cold-call.md', valid.replace('stages: 1', 'stages: 2, 3, 4')), []);
});

test('validatePlay reports a missing key naming file and key (S12.1)', () => {
  const problems = validatePlay('cold-call.md', valid.replace('gate_unlocked: Stage 1 entry\n', ''));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /cold-call\.md/);
  assert.match(problems[0], /gate_unlocked/);
});

test('validatePlay reports stem mismatch, bad stages and non-integer version', () => {
  assert.ok(validatePlay('other.md', valid).some((p) => /play/.test(p) && /other/.test(p)));
  assert.ok(validatePlay('cold-call.md', valid.replace('stages: 1', 'stages: one')).some((p) => /stages/.test(p)));
  assert.ok(validatePlay('cold-call.md', valid.replace('version: 1', 'version: 1.5')).some((p) => /version/.test(p)));
});

test('validatePlay reports missing frontmatter', () => {
  assert.equal(validatePlay('x.md', '# nothing').length, 1);
});

test('hasDecisionTree detects mermaid decision nodes only inside mermaid fences', () => {
  const tree = '```mermaid\nflowchart TD\n  A[Open] --> B{Interested?}\n```\n';
  assert.equal(hasDecisionTree(tree), true);
  assert.equal(hasDecisionTree('```mermaid\nflowchart LR\n  S1["a"] --> S2["b"]\n```\n'), false);
  assert.equal(hasDecisionTree('plain text B{Interested?} outside a fence'), false);
});

test('hasDecisionTree does not fire on the shipped pipeline-stages template', () => {
  const file = path.join(import.meta.dirname, '..', '..', 'templates', 'areas', 'sales', 'stages', 'pipeline-stages.md');
  assert.equal(hasDecisionTree(fs.readFileSync(file, 'utf8')), false);
});
