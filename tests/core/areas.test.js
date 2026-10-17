import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addCustomArea, addPresetArea, areaIdError, listAreas, resolveAllowedAreas, PRESET_AREA_IDS } from '../../src/core/areas.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

const kernel = (activeAreas) => JSON.stringify({ organization: { name: 'X' }, activeAreas, metadata: { updatedAt: 'old' } });
const readKernelFile = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'org-kernel.json'), 'utf8'));
const isCode = (code) => (err) => err instanceof BrainError && err.code === code;

test('areaIdError enforces ^[a-z0-9_-]+$ and uniqueness', () => {
  assert.equal(areaIdError('security_compliance'), null);
  assert.equal(areaIdError('dev-ops2'), null);
  for (const bad of ['', '  ', '../x', 'a/b', 'Upper', 'with space', '..']) assert.ok(areaIdError(bad), `"${bad}" must be invalid`);
  assert.match(areaIdError('sales', ['sales']), /already installed/);
});

test('addCustomArea rejects traversal and duplicate ids without touching disk', () =>
  withTmp((dir) => {
    const brain = path.join(dir, 'brain');
    writeFiles(brain, { 'org-kernel.json': kernel(['sales']) });
    assert.throws(() => addCustomArea(brain, { id: '../escaped' }), isCode('INVALID_AREA_ID'));
    assert.throws(() => addCustomArea(brain, { id: 'sales' }), isCode('INVALID_AREA_ID'));
    assert.equal(fs.existsSync(path.join(dir, 'escaped')), false);
    assert.deepEqual(readKernelFile(brain).activeAreas, ['sales']);
  }));

test('addCustomArea scaffolds boilerplate and records the area', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'org-kernel.json': kernel([]) });
    const { area } = addCustomArea(dir, { id: 'devops_infra' });
    assert.equal(area.name, 'Devops Infra');
    assert.ok(fs.existsSync(path.join(dir, 'devops_infra', 'docs')));
    assert.match(fs.readFileSync(path.join(dir, 'devops_infra', 'README.md'), 'utf8'), /# Devops Infra/);
    const k = readKernelFile(dir);
    assert.deepEqual(k.activeAreas, ['devops_infra']);
    assert.notEqual(k.metadata.updatedAt, 'old');
  }));

test('addPresetArea installs template + playbook and rejects unknown or installed presets', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'org-kernel.json': kernel(['sales']) });
    addPresetArea(dir, 'operations');
    assert.ok(fs.existsSync(path.join(dir, 'operations', 'sops')));
    assert.ok(fs.existsSync(path.join(dir, 'playbooks', '04-OPERATIONS-PLAYBOOK.md')));
    assert.deepEqual(readKernelFile(dir).activeAreas, ['sales', 'operations']);
    assert.throws(() => addPresetArea(dir, 'operations'), isCode('AREA_EXISTS'));
    assert.throws(() => addPresetArea(dir, 'nope'), isCode('INVALID_PRESET'));
  }));

test('add use cases fail with KERNEL_MISSING outside a brain', () =>
  withTmp((dir) => {
    assert.throws(() => addCustomArea(dir, { id: 'x' }), isCode('KERNEL_MISSING'));
    assert.throws(() => addPresetArea(dir, 'sales'), isCode('KERNEL_MISSING'));
  }));

test('listAreas reports installed (with disk status) and available presets', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'org-kernel.json': kernel(['sales', 'custom_x']), 'sales/README.md': '#' });
    const { installed, available } = listAreas(dir);
    assert.deepEqual(installed.map((a) => [a.id, a.onDisk]), [['sales', true], ['custom_x', false]]);
    assert.equal(installed[1].description, 'Custom Area');
    assert.ok(!available.some((a) => a.id === 'sales'));
  }));

test('resolveAllowedAreas = presets + valid kernel areas that stay inside the root', () =>
  withTmp((dir) => {
    const brain = path.join(dir, 'brain');
    fs.mkdirSync(path.join(dir, 'outside'));
    writeFiles(brain, { 'org-kernel.json': kernel(['security', '../evil', 'Bad Name', 'linked', 42]) });
    fs.symlinkSync(path.join(dir, 'outside'), path.join(brain, 'linked'));
    assert.deepEqual(resolveAllowedAreas(brain), [...PRESET_AREA_IDS, 'security']);
  }));

test('resolveAllowedAreas falls back to presets without a kernel', () =>
  withTmp((dir) => assert.deepEqual(resolveAllowedAreas(dir), [...PRESET_AREA_IDS])));
