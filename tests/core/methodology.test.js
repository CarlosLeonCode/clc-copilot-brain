// The brain's sales methodology (org-kernel.json `methodology`) and its qualification fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { DEFAULT_METHODOLOGY, BUILT_IN_METHODOLOGIES, effectiveMethodology, getMethodology, inferMethodology, parseMethodology } from '../../src/core/methodology.js';
import { FALLBACK_CRITERIA, DEFAULT_ADVANCE_REQUIRES, qualificationDefaults, resolveCriteria } from '../../src/core/scorecard.js';
import { readSalesRecords } from '../../src/core/sales-records.js';
import { validateAgainstSchema } from '../../src/core/schema-validator.js';
import { withTmp, writeFiles } from './helpers.js';

const kernel = (extra = {}) => ({
  version: '1.0.0',
  organization: { name: 'Org', industry: 'Software', tagline: 'Tag' },
  activeAreas: ['sales'],
  governance: { owner: 'Owner', reviewCadenceDays: 30 },
  ...extra
});

test('methodology: meddpicc is the default and sandler is built in', () => {
  assert.equal(DEFAULT_METHODOLOGY, 'meddpicc');
  assert.deepEqual([...BUILT_IN_METHODOLOGIES], ['meddpicc', 'sandler']);
});

test('parseMethodology accepts any slug (case and spaces ignored) and rejects the rest', () => {
  assert.equal(parseMethodology(' Sandler '), 'sandler');
  assert.equal(parseMethodology('meddpicc'), 'meddpicc');
  assert.equal(parseMethodology('bant'), 'bant');
  assert.equal(parseMethodology('my-method-2'), 'my-method-2');
  for (const bad of ['', '   ', 'two words', '-x', 'a/b', null, undefined, 3]) assert.equal(parseMethodology(bad), null, String(bad));
});

test('getMethodology: missing, invalid or unreadable kernel means meddpicc; an explicit value is kept', () => withTmp((dir) => {
  assert.equal(getMethodology(path.join(dir, 'none')), 'meddpicc', 'no kernel');
  writeFiles(dir, { 'a/org-kernel.json': JSON.stringify(kernel()) });
  assert.equal(getMethodology(path.join(dir, 'a')), 'meddpicc', 'old brain without the field');
  writeFiles(dir, { 'b/org-kernel.json': JSON.stringify(kernel({ methodology: 'sandler' })) });
  assert.equal(getMethodology(path.join(dir, 'b')), 'sandler');
  writeFiles(dir, { 'c/org-kernel.json': JSON.stringify(kernel({ methodology: 'two words' })) });
  assert.equal(getMethodology(path.join(dir, 'c')), 'meddpicc', 'invalid value');
  writeFiles(dir, { 'd/org-kernel.json': '{ not json' });
  assert.equal(getMethodology(path.join(dir, 'd')), 'meddpicc', 'corrupt kernel');
  writeFiles(dir, { 'e/org-kernel.json': JSON.stringify(kernel({ methodology: 'bant' })) });
  assert.equal(getMethodology(path.join(dir, 'e')), 'bant', 'a custom method is kept');
}));

test('org-kernel schema: methodology is optional and must be a slug', () => {
  assert.deepEqual(validateAgainstSchema('org-kernel', kernel()).errors, [], 'old brains stay valid');
  for (const ok of ['meddpicc', 'sandler', 'bant']) assert.deepEqual(validateAgainstSchema('org-kernel', kernel({ methodology: ok })).errors, [], ok);
  for (const bad of ['', 'Two Words', 7]) assert.notDeepEqual(validateAgainstSchema('org-kernel', kernel({ methodology: bad })).errors, [], String(bad));
});

test('qualification fallback is per methodology; meddpicc keeps today\'s values, unknown methods use meddpicc', () => {
  assert.deepEqual(qualificationDefaults('meddpicc').criteria, [...FALLBACK_CRITERIA]);
  assert.deepEqual(qualificationDefaults('meddpicc').advanceRequires, [...DEFAULT_ADVANCE_REQUIRES]);
  assert.deepEqual(qualificationDefaults('sandler').criteria, ['upfront_contract', 'pain', 'budget', 'decision']);
  assert.deepEqual(qualificationDefaults('sandler').advanceRequires, ['pain', 'budget', 'decision']);
  assert.deepEqual(qualificationDefaults('bant'), qualificationDefaults('meddpicc'));
  assert.deepEqual(qualificationDefaults(undefined), qualificationDefaults('meddpicc'));
});

test('resolveCriteria uses the methodology fallback but still prefers the matrix list', () => {
  const sandler = resolveCriteria(null, 'sandler');
  assert.deepEqual(sandler.ids, ['upfront_contract', 'pain', 'budget', 'decision']);
  assert.deepEqual(sandler.advanceRequires, ['pain', 'budget', 'decision']);
  assert.equal(sandler.source, 'fallback');
  assert.deepEqual(resolveCriteria(null).ids, [...FALLBACK_CRITERIA], 'no methodology: meddpicc');
  const matrix = resolveCriteria({ criteria: 'budget, need' }, 'sandler');
  assert.deepEqual(matrix.ids, ['budget', 'need']);
  assert.deepEqual(matrix.advanceRequires, ['budget'], 'sandler defaults that the matrix lists');
  assert.equal(matrix.source, 'matrix');
});

test('a sandler brain without matrix criteria reads the sandler fallback; meddpicc brains are unchanged', () => withTmp((dir) => {
  writeFiles(dir, {
    'sandler/org-kernel.json': JSON.stringify(kernel({ methodology: 'sandler' })),
    'sandler/sales/qualification/qualification-matrix.md': '# Matrix\n',
    'old/org-kernel.json': JSON.stringify(kernel()),
    'old/sales/qualification/qualification-matrix.md': '# Matrix\n'
  });
  assert.deepEqual(readSalesRecords(path.join(dir, 'sandler')).criteria.ids, ['upfront_contract', 'pain', 'budget', 'decision']);
  assert.deepEqual(readSalesRecords(path.join(dir, 'old')).criteria.ids, [...FALLBACK_CRITERIA]);
}));

test('inferMethodology reads Sandler terms in the matrix or the system map; effectiveMethodology prefers the field', () => withTmp((dir) => {
  writeFiles(dir, { 'a/org-kernel.json': JSON.stringify(kernel()) });
  assert.equal(inferMethodology(path.join(dir, 'a')), 'meddpicc', 'nothing to read');
  writeFiles(dir, { 'b/org-kernel.json': JSON.stringify(kernel()), 'b/sales/system.md': '# Mapa\n\nUsamos el método Sandler.\n' });
  assert.equal(inferMethodology(path.join(dir, 'b')), 'sandler');
  assert.equal(effectiveMethodology(path.join(dir, 'b')), 'sandler', 'missing field: inferred');
  writeFiles(dir, { 'c/sales/qualification/qualification-matrix.md': '# Q\n\n- Up-Front Contract agreed\n' });
  assert.equal(inferMethodology(path.join(dir, 'c')), 'sandler');
  writeFiles(dir, { 'd/sales/qualification/qualification-matrix.md': '# Q\n\n- Metrics, Economic buyer\n' });
  assert.equal(inferMethodology(path.join(dir, 'd')), 'meddpicc');
  writeFiles(dir, { 'e/org-kernel.json': JSON.stringify(kernel({ methodology: 'meddpicc' })), 'e/sales/system.md': 'Sandler\n' });
  assert.equal(effectiveMethodology(path.join(dir, 'e')), 'meddpicc', 'an explicit field wins');
}));
