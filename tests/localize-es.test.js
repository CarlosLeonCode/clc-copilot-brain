// Spanish brains get Spanish details: script, glossary and call guide problems, upgrade reasons, the "not a brain"
// error, and area names. Parser messages and --json output stay English for tools.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from '../src/core/sales-scripts.js';
import { parseGlossary } from '../src/core/sales-glossary.js';
import { playProblems, validatePlay } from '../src/core/plays.js';
import { checkSalesLibrary } from '../src/core/sales-library.js';
import { runDoctor } from '../src/core/doctor.js';
import { initBrain } from '../src/core/scaffold.js';
import { diagnosticText } from '../src/core/diagnostics.js';
import { listAreas, presetAreaText } from '../src/core/areas.js';
import { MANAGED_END } from '../src/core/upgrade.js';
import { withTmp, writeFiles } from './core/helpers.js';

const CLI = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'bin', 'cli.js');
const BAD_SCRIPT = '---\nscript: other\nversion: x\nstatus: live\n---\n## Call\n\n### Open\ntone: loud\nfoo bar\n';
const ENGLISH_DETAIL = /Frontmatter is missing|must be draft or active|must be an integer|Unknown tone|Unknown line|was ignored|has no "say:" line|should match the file name|missing frontmatter key|expected 3|columns/;

test('parser diagnostics keep their English message and carry a code and values for translation', () => {
  const { diagnostics } = parseScript(BAD_SCRIPT, { fileStem: 'cold' });
  assert.ok(diagnostics.length >= 5);
  for (const d of diagnostics) {
    assert.equal(typeof d.code, 'string', d.message);
    assert.equal(diagnosticText('en', d), d.message);
    assert.doesNotMatch(diagnosticText('es', d), ENGLISH_DETAIL, d.message);
  }
  assert.ok(diagnostics.some((d) => d.message === 'Frontmatter is missing "title".'));
  assert.ok(diagnostics.some((d) => d.message === 'Unknown tone "loud"; use start, plain, action, yes, no, follow.'));
  const glossary = parseGlossary('| a | b | c |\n## G\n| a | b |\n|---|---|\n| x | y |\n');
  for (const d of glossary.diagnostics) {
    assert.equal(typeof d.code, 'string');
    assert.doesNotMatch(diagnosticText('es', d), ENGLISH_DETAIL, d.message);
  }
  const problems = playProblems('x.md', '---\nplay: y\nversion: v\n---\n');
  assert.deepEqual(problems.map((p) => diagnosticText('en', p)), validatePlay('x.md', '---\nplay: y\nversion: v\n---\n'));
  for (const p of problems) assert.doesNotMatch(diagnosticText('es', p), ENGLISH_DETAIL);
});

test('doctor in a Spanish brain words script, glossary and call guide details in Spanish', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], language: 'es' });
    writeFiles(dir, {
      'sales/scripts/cold.md': BAD_SCRIPT,
      'sales/glossary.md': '# Glosario\n| a | b | c |\n',
      'sales/plays/extra.md': '---\nplay: otra\n---\n# Guía: Extra\n'
    });
    const messages = runDoctor(dir, { lang: 'es' }).issues.map((i) => i.message).join('\n');
    assert.match(messages, /sales\/scripts\/cold\.md/);
    assert.doesNotMatch(messages, ENGLISH_DETAIL);
    const en = checkSalesLibrary(dir).join('\n');
    assert.match(en, /Unknown tone "loud"/, 'English brains keep the English details');
  }));

function withEsBrain(fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-es-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--areas', 'sales', '--language', 'es'], { encoding: 'utf8' });
    fn(brain, outer);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}

test('upgrade in a Spanish brain explains skipped files in Spanish', () =>
  withEsBrain((brain) => {
    const agents = path.join(brain, 'AGENTS.md');
    fs.writeFileSync(agents, fs.readFileSync(agents, 'utf8').replace(MANAGED_END, ''));
    const res = spawnSync(process.execPath, [CLI, 'upgrade', brain, '--dry-run'], { encoding: 'utf8', input: '' });
    assert.match(res.stdout, /AGENTS\.md/);
    assert.doesNotMatch(res.stdout, /managed-markers-invalid/);
    assert.match(res.stdout, /marcas/);
  }));

test('upgrade outside a brain says so in the computer language', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-none-'));
  try {
    const res = spawnSync(process.execPath, [CLI, 'upgrade', dir], { encoding: 'utf8', input: '', env: { ...process.env, LC_ALL: 'es_ES.UTF-8' } });
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /no es un cerebro/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('area names and descriptions follow the brain language', () =>
  withEsBrain((brain) => {
    assert.deepEqual(presetAreaText('es', 'sales').name, 'Ventas');
    assert.equal(presetAreaText('en', 'sales').name, 'Sales');
    assert.equal(presetAreaText('es', 'my_area'), null);
    assert.equal(listAreas(brain).installed[0].name, 'Sales', 'core data stays as it is');
    const res = spawnSync(process.execPath, [CLI, 'list-areas', brain], { encoding: 'utf8', input: '' });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /Ventas/);
    assert.match(res.stdout, /Mercadeo|Marketing/);
    assert.doesNotMatch(res.stdout, /Installed Areas|Revenue enablement/);
  }));
