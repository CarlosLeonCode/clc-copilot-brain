// CLI messages of doctor, upgrade, view and add-area follow the brain language (the computer's outside a brain).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initBrain } from '../src/core/scaffold.js';
import { runDoctor } from '../src/core/doctor.js';
import { checkSalesLibrary } from '../src/core/sales-library.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js');
const cli = (args, env = {}) => {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '', env: { ...process.env, LANG: '', LC_ALL: '', ...env } });
  return { code: res.status, out: res.stdout + res.stderr };
};
function withBrain(language, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-es-'));
  try {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'], language });
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('doctor speaks Spanish in a Spanish brain, including the checks and the warnings', () => withBrain('es', (dir) => {
  fs.writeFileSync(path.join(dir, 'sales', 'glosario-sandler.md'), '# Glosario\n\n## Base\n\n| Término | Qué significa | Ejemplo |\n|---|---|---|\n| **Dolor** | Un problema | Pierden ventas |\n');
  fs.writeFileSync(path.join(dir, 'sales', 'scripts', 'acuerdo-previo.md'), '# Acuerdo previo\n');
  const { out } = cli(['doctor', dir]);
  assert.match(out, /Resumen/);
  assert.match(out, /Revisiones correctas: \d+/);
  assert.match(out, /Avisos: 2/);
  assert.match(out, /El glosario \(sales\/glosario-sandler\.md\) no está enlazado desde sales\/system\.md/);
  assert.match(out, /no se reconocen como guiones/);
  assert.match(out, /La estructura de org-kernel\.json es válida/);
  assert.doesNotMatch(out, /Audit Summary|Checks passed|Issues Found/);
}));

test('core doctor messages stay English by default and follow lang when asked', () => withBrain('es', (dir) => {
  assert.ok(runDoctor(dir).passed.includes('org-kernel.json structure is valid.'));
  assert.ok(runDoctor(dir, { lang: 'es' }).passed.includes('La estructura de org-kernel.json es válida.'));
  fs.writeFileSync(path.join(dir, 'sales', 'scripts', 'nota.md'), 'texto\n');
  assert.match(checkSalesLibrary(dir).join('\n'), /not recognized as scripts/);
  assert.match(checkSalesLibrary(dir, { lang: 'es' }).join('\n'), /no se reconocen como guiones/);
}));

test('doctor stays English in an English brain', () => withBrain('en', (dir) => {
  const { out } = cli(['doctor', dir], { LANG: 'es_ES.UTF-8' });
  assert.match(out, /Audit Summary/);
}));

test('view speaks Spanish in a Spanish brain, and outside a brain uses the computer language', () => withBrain('es', (dir) => {
  const { code, out } = cli(['view', dir]);
  assert.equal(code, 0);
  assert.match(out, /Tu página del sistema de ventas está lista/);
  assert.match(out, /clc-brain view --open/);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-es-out-'));
  try {
    assert.match(cli(['view', outside], { LANG: 'es_MX.UTF-8' }).out, /no es un cerebro/);
    assert.match(cli(['view', outside]).out, /is not a brain/);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }
}));

test('upgrade speaks Spanish in a Spanish brain', () => withBrain('es', (dir) => {
  const { out } = cli(['upgrade', dir, '--dry-run']);
  assert.match(out, /Actualización del cerebro/);
  assert.match(out, /Tu cerebro está al día|no se cambió ningún archivo/);
  assert.doesNotMatch(out, /Brain is up to date|Dry run/);
}));

test('add-area speaks Spanish in a Spanish brain', () => withBrain('es', (dir) => {
  const { code, out } = cli(['add-area', dir, '--preset', 'operations']);
  assert.equal(code, 0);
  assert.match(out, /Agregar un área/);
  assert.match(out, /instalada/);
}));
