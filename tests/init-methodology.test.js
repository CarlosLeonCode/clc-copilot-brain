// CLI tests for the sales methodology chosen at `init` (subprocess, no terminal).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { t } from '../src/core/i18n.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'bin', 'cli.js');
const MATRIX = path.join('sales', 'qualification', 'qualification-matrix.md');

function initWith(...flags) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-method-'));
  const brain = path.join(outer, 'brain');
  const res = spawnSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--areas', 'sales', ...flags], {
    encoding: 'utf8',
    input: '',
    env: { ...process.env, LC_ALL: '', LANG: 'en_US.UTF-8' }
  });
  const read = (rel) => (fs.existsSync(path.join(brain, rel)) ? fs.readFileSync(path.join(brain, rel), 'utf8') : null);
  const kernel = read('org-kernel.json');
  const out = { res, kernel: kernel && JSON.parse(kernel), matrix: read(MATRIX), glossary: read(path.join('sales', 'glossary.md')) };
  fs.rmSync(outer, { recursive: true, force: true });
  return out;
}

test('init --methodology sandler stores it and writes the Sandler sales set', () => {
  const { res, kernel, matrix, glossary } = initWith('--methodology', 'sandler');
  assert.equal(res.status, 0, res.stderr);
  assert.equal(kernel.methodology, 'sandler');
  assert.equal(matrix, fs.readFileSync(path.join(ROOT, 'templates', 'methodologies', 'sandler', 'areas', MATRIX), 'utf8'));
  assert.ok(glossary, 'the method glossary ships');
});

test('init --methodology is case-insensitive and Spanish brains get the Spanish Sandler set', () => {
  const { res, kernel, matrix } = initWith('--methodology', 'Sandler', '--language', 'es');
  assert.equal(res.status, 0, res.stderr);
  assert.equal(kernel.methodology, 'sandler');
  assert.match(matrix, /Matriz de calificación Sandler/);
});

test('init --yes without --methodology uses meddpicc', () => {
  const { res, kernel, matrix, glossary } = initWith();
  assert.equal(res.status, 0, res.stderr);
  assert.equal(kernel.methodology, 'meddpicc');
  assert.equal(matrix, fs.readFileSync(path.join(ROOT, 'templates', 'areas', MATRIX), 'utf8'));
  assert.equal(glossary, null);
});

test('init with an unknown or empty --methodology exits 1 with a plain message and writes nothing', () => {
  for (const bad of [['--methodology', 'bant'], ['--methodology']]) {
    const { res, kernel } = initWith(...bad);
    assert.equal(res.status, 1, bad.join(' '));
    assert.match(res.stdout + res.stderr, /"meddpicc" \(enterprise deals\) or "sandler" \(small and mid-size businesses\)/);
    assert.equal(kernel, null);
  }
});

test('the methodology question is in plain words in English and Spanish', () => {
  assert.equal(t('en', 'init.methodology.question'), 'How does your team sell?');
  assert.match(t('en', 'init.methodology.meddpicc'), /^Enterprise deals with many stakeholders \(MEDDPICC\)$/);
  assert.match(t('en', 'init.methodology.sandler'), /^Small and mid-size businesses, short cycles \(Sandler\)$/);
  assert.equal(t('es', 'init.methodology.question'), '¿Cómo vende tu equipo?');
  assert.match(t('es', 'init.methodology.meddpicc'), /\(MEDDPICC\)$/);
  assert.match(t('es', 'init.methodology.sandler'), /\(Sandler\)$/);
});
