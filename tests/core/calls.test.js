import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { captureCall, isIsoDate } from '../../src/core/calls.js';
import { BrainError } from '../../src/core/errors.js';
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
