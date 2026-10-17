import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateAgainstSchema } from '../src/core/schema-validator.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('validateAgainstSchema returns { valid, errors } for a known schema', () => {
  const ok = validateAgainstSchema('sales-objection', {
    id: 'pricing-too-high',
    title: 'Too expensive',
    category: 'pricing',
    severity: 'high',
    triggerPhrases: ['too expensive'],
    rootCause: 'Budget was not allocated this quarter.',
    pivotScript: 'Totally fair. What would it cost to keep doing this manually?',
    counterArguments: ['ROI in 30 days'],
    suggestedNextStep: 'Book an ROI workshop',
  });
  assert.deepEqual(ok, { valid: true, errors: [] });

  const bad = validateAgainstSchema('sales-objection', { id: 'Bad ID' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length > 1, 'allErrors mode must report every violation');
});

test('validateAgainstSchema enforces formats (date, date-time)', () => {
  const res = validateAgainstSchema('sop', { effectiveDate: '2026-02-30' });
  assert.ok(res.errors.some((e) => e.includes('effectiveDate') && e.includes('date')));
});

test('validateAgainstSchema throws on an unknown schema name', () => {
  assert.throws(() => validateAgainstSchema('../package', {}), /Unknown schema/);
});

test('schemas resolve relative to the module, not process.cwd()', () => {
  const moduleUrl = pathToFileURL(path.join(REPO_ROOT, 'src', 'core', 'schema-validator.js')).href;
  const script = `import(${JSON.stringify(moduleUrl)}).then(m => {
    process.stdout.write(String(m.validateAgainstSchema('sop', {}).valid));
  });`;
  const out = execFileSync(process.execPath, ['-e', script], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(out, 'false');
});
