// Whether a brain has been set up (org-kernel.json `setup`), with a fallback for brains made before the field existed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getBrainSummary, getSetupState } from '../../src/core/setup-state.js';
import { INIT_DEFAULTS, initBrain } from '../../src/core/scaffold.js';
import { withTmp, writeFiles } from './helpers.js';

const kernel = (extra = {}, name = 'Real Co') => JSON.stringify({ organization: { name }, ...extra });

test('a brain made by init starts as pending', () => withTmp((dir) => {
  initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'org-kernel.json'), 'utf8'));
  assert.deepEqual(written.setup, { completed: false });
  assert.equal(getSetupState(dir), 'pending');
}));

test('setup.completed decides the state when present', () => withTmp((dir) => {
  writeFiles(dir, { 'org-kernel.json': kernel({ setup: { completed: true, completedAt: '2026-10-19T10:00:00.000Z' } }) });
  assert.equal(getSetupState(dir), 'done');
  writeFiles(dir, { 'org-kernel.json': kernel({ setup: { completed: false } }, 'Real Co') });
  assert.equal(getSetupState(dir), 'pending');
}));

test('older brains without the field: default company name means pending, otherwise unknown', () => withTmp((dir) => {
  writeFiles(dir, { 'org-kernel.json': kernel({}, INIT_DEFAULTS.companyName) });
  assert.equal(getSetupState(dir), 'pending');
  writeFiles(dir, { 'org-kernel.json': kernel({}, 'Real Co') });
  assert.equal(getSetupState(dir), 'unknown');
  writeFiles(dir, { 'org-kernel.json': kernel({ setup: { completed: 'yes' } }, 'Real Co') });
  assert.equal(getSetupState(dir), 'unknown', 'a malformed field is treated as missing');
}));

test('a missing or unreadable kernel is unknown', () => withTmp((dir) => {
  assert.equal(getSetupState(dir), 'unknown');
  writeFiles(dir, { 'org-kernel.json': '{ not json' });
  assert.equal(getSetupState(dir), 'unknown');
}));

test('getBrainSummary gives name, language, setup state and areas; null outside a brain', () => withTmp((dir) => {
  assert.equal(getBrainSummary(dir), null);
  initBrain(dir, { companyName: 'Acme', areas: ['sales'], language: 'es' });
  assert.deepEqual(getBrainSummary(dir), { name: 'Acme', language: 'es', setup: 'pending', areas: ['sales'] });
}));
