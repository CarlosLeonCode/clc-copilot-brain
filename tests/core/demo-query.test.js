import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cleanDemo, demoAssetPaths, isDemoTemplateAsset } from '../../src/core/demo.js';
import { queryBrain } from '../../src/core/query.js';
import { initBrain } from '../../src/core/scaffold.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

test('demo assets are derived from the templates (no hard-coded month)', () => {
  const paths = demoAssetPaths();
  assert.ok(paths.includes(path.join('sales', 'objections', 'pricing-too-high.json')));
  assert.ok(paths.some((p) => /calls[\\/]\d{4}-\d{2}[\\/]/.test(p)));
  assert.ok(!paths.some((p) => p.endsWith('README.md')));
  assert.equal(isDemoTemplateAsset('/x/sales/calls/2031-01'), true);
  assert.equal(isDemoTemplateAsset('/x/sales/calls/README.md'), false);
});

test('cleanDemo removes only seeded files and prunes emptied directories', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], demo: true });
    writeFiles(dir, { 'sales/objections/real-objection.json': '{}' });
    const { removed } = cleanDemo(dir);
    assert.ok(removed.includes(path.join('sales', 'objections', 'pricing-too-high.json')));
    assert.ok(fs.existsSync(path.join(dir, 'sales', 'objections', 'real-objection.json')));
    assert.ok(fs.existsSync(path.join(dir, 'sales', 'calls', 'README.md')));
    assert.deepEqual(fs.readdirSync(path.join(dir, 'sales', 'calls')), ['README.md']);
    assert.deepEqual(cleanDemo(dir).removed, []);
  }));

test('cleanDemo keeps demo files the user edited and reports them', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], demo: true });
    const edited = path.join('sales', 'objections', 'pricing-too-high.json');
    fs.appendFileSync(path.join(dir, edited), '\n');
    const { removed, kept } = cleanDemo(dir);
    assert.ok(fs.existsSync(path.join(dir, edited)));
    assert.ok(!removed.includes(edited));
    assert.deepEqual(kept, [edited]);
    assert.ok(removed.includes(path.join('sales', 'battlecards', 'competitor-alpha.json')));
  }));

test('queryBrain searches allowed areas plus playbooks and returns snippets', () =>
  withTmp((dir) => {
    writeFiles(dir, {
      'org-kernel.json': JSON.stringify({ activeAreas: ['legal_ops'] }),
      'legal_ops/nda.md': 'line one\nMutual NDA template\nline three',
      'playbooks/x.md': 'nda playbook',
      'private/nda.md': 'not an area'
    });
    const { matches } = queryBrain(dir, { query: '  NDA ' });
    assert.deepEqual(matches.map((m) => m.file).sort(), [path.join('legal_ops', 'nda.md'), path.join('playbooks', 'x.md')]);
    assert.match(matches.find((m) => m.file.startsWith('legal_ops')).snippet, /Mutual NDA/);
  }));

test('queryBrain validates query and area', () =>
  withTmp((dir) => {
    assert.throws(() => queryBrain(dir, { query: ' ' }), (e) => e instanceof BrainError && e.code === 'VALIDATION');
    assert.throws(() => queryBrain(dir, { query: 'x', area: 'private' }), (e) => e instanceof BrainError && e.code === 'INVALID_AREA');
  }));
