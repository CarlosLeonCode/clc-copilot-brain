// Starter content follows the brain language: Spanish brains get the templates/locales/es overlay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initBrain } from '../../src/core/scaffold.js';
import { addPresetArea } from '../../src/core/areas.js';
import { applyUpgrade, planUpgrade } from '../../src/core/upgrade.js';
import { runDoctor } from '../../src/core/doctor.js';
import { cleanDemo } from '../../src/core/demo.js';
import { buildSalesView } from '../../src/core/sales-view.js';
import { PKG_ROOT, TEMPLATES_AREAS_DIR } from '../../src/core/package-paths.js';
import { withTmp, writeFiles } from './helpers.js';

const ES_SALES = path.join(PKG_ROOT, 'templates', 'locales', 'es', 'areas', 'sales');
const STARTER = ['system.md', 'stages/pipeline-stages.md', 'plays/cold-call.md', 'plays/discovery-call.md', 'plays/demo-call.md', 'plays/follow-up.md'];
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const brainOf = (dir) => path.join(dir, 'brain');

test('init with Spanish writes the Spanish starter guides, map and pipeline; other files stay as shipped', () =>
  withTmp((dir) => {
    initBrain(brainOf(dir), { companyName: 'Acme', areas: ['sales'], language: 'es' });
    for (const rel of STARTER) assert.equal(read(brainOf(dir), 'sales', rel), read(ES_SALES, rel), rel);
    assert.equal(read(brainOf(dir), 'sales', 'README.md'), read(TEMPLATES_AREAS_DIR, 'sales', 'README.md'));
    const { html } = buildSalesView(brainOf(dir));
    for (const text of ['Llamada en frío', 'Llamada de descubrimiento', 'Llamada de demostración', 'Seguimiento', 'Conseguir una reunión de descubrimiento']) {
      assert.ok(html.includes(text), `page shows ${text}`);
    }
    assert.doesNotMatch(html, /Cold Call|Book a discovery meeting/);
  }));

test('the Spanish page shows each guide\'s Spanish success text once calls are logged', () =>
  withTmp((dir) => {
    initBrain(brainOf(dir), { companyName: 'Acme', areas: ['sales'], language: 'es' });
    writeFiles(brainOf(dir), {
      'sales/calls/2026-10/2026-10-05_ana_globex.md': '---\ncall_id: "CALL-2026-10-05-01"\ndate: "2026-10-05"\nrep: "Ana"\nprospect_company: "Globex"\nmotion: "cold-outbound"\nplay: "cold-call"\nbranch: "B7"\ngoal_met: true\ngate_advanced: true\n---\n# Llamada\n'
    });
    const { html } = buildSalesView(brainOf(dir), { now: new Date('2026-10-18T12:00:00Z') });
    assert.ok(html.includes('Éxito significa: Reunión agendada'), 'Spanish success text');
  }));

test('init in English is unchanged', () =>
  withTmp((dir) => {
    initBrain(brainOf(dir), { areas: ['sales'], language: 'en' });
    for (const rel of STARTER) assert.equal(read(brainOf(dir), 'sales', rel), read(TEMPLATES_AREAS_DIR, 'sales', rel), rel);
  }));

test('a clean Spanish brain gets the Spanish guides but no sample calls', () =>
  withTmp((dir) => {
    initBrain(brainOf(dir), { areas: ['sales'], language: 'es', demo: false });
    assert.equal(read(brainOf(dir), 'sales', 'plays', 'cold-call.md'), read(ES_SALES, 'plays', 'cold-call.md'));
    assert.equal(fs.existsSync(path.join(brainOf(dir), 'sales', 'calls', '2026-09')), false);
  }));

test('adding the sales area to a Spanish brain writes the Spanish starter content', () =>
  withTmp((dir) => {
    initBrain(brainOf(dir), { areas: ['marketing'], language: 'es' });
    addPresetArea(brainOf(dir), 'sales');
    for (const rel of STARTER) assert.equal(read(brainOf(dir), 'sales', rel), read(ES_SALES, rel), rel);
  }));

test('upgrade adds missing guides in the brain language and never overwrites existing ones', () =>
  withTmp((dir) => {
    const root = brainOf(dir);
    initBrain(root, { areas: ['sales'], language: 'es' });
    fs.rmSync(path.join(root, 'sales', 'plays', 'demo-call.md'));
    fs.rmSync(path.join(root, 'sales', 'system.md'));
    fs.writeFileSync(path.join(root, 'sales', 'plays', 'cold-call.md'), 'mi guía\n');
    const plan = planUpgrade(root);
    assert.deepEqual(plan.actions.map((a) => `${a.kind} ${a.path}`).sort(), ['add sales/plays/demo-call.md', 'add sales/system.md']);
    applyUpgrade(root, plan);
    assert.equal(read(root, 'sales', 'plays', 'demo-call.md'), read(ES_SALES, 'plays', 'demo-call.md'));
    assert.equal(read(root, 'sales', 'system.md'), read(ES_SALES, 'system.md'));
    assert.equal(read(root, 'sales', 'plays', 'cold-call.md'), 'mi guía\n');
  }));

test('upgrade falls back to the English guide when the brain language has no translation of it', () =>
  withTmp((dir) => {
    const tplAreas = path.join(dir, 'pkg', 'areas');
    const tplLocales = path.join(dir, 'pkg', 'locales');
    const root = path.join(dir, 'b');
    writeFiles(tplAreas, { 'sales/system.md': 'system\n', 'sales/plays/a.md': 'a en\n', 'sales/plays/b.md': 'b en\n' });
    writeFiles(tplLocales, { 'es/areas/sales/plays/a.md': 'a es\n' });
    writeFiles(root, { 'org-kernel.json': JSON.stringify({ activeAreas: ['sales'], language: 'es' }) });
    const plan = planUpgrade(root, { templatesBaseDir: path.join(dir, 'pkg', 'base'), templatesAreasDir: tplAreas, templatesLocalesDir: tplLocales });
    const next = Object.fromEntries(plan.actions.map((a) => [a.path, a.next]));
    assert.deepEqual(next, { 'sales/system.md': 'system\n', 'sales/plays/a.md': 'a es\n', 'sales/plays/b.md': 'b en\n' });
  }));

test('a fresh Spanish brain is healthy and clean-demo keeps its starter guides', () =>
  withTmp((dir) => {
    const root = brainOf(dir);
    initBrain(root, { areas: ['sales'], language: 'es', demo: true });
    const report = runDoctor(root);
    assert.equal(report.errors, 0, JSON.stringify(report.issues));
    assert.equal(report.warnings, 0, JSON.stringify(report.issues));
    const { removed } = cleanDemo(root);
    assert.ok(removed.length > 0, 'demo files removed');
    for (const rel of STARTER) assert.equal(read(root, 'sales', rel), read(ES_SALES, rel), `${rel} kept`);
  }));

test('the starter scripts do not ship: fresh en and es brains hold only the scripts README, no glossary, and 0 doctor warnings', () =>
  withTmp((dir) => {
    for (const language of ['en', 'es']) {
      const root = path.join(dir, `brain-${language}`);
      initBrain(root, { areas: ['sales'], language, demo: true });
      assert.deepEqual(fs.readdirSync(path.join(root, 'sales', 'scripts')), ['README.md'], language);
      assert.equal(fs.existsSync(path.join(root, 'sales', 'glossary.md')), false, `${language}: no glossary ships`);
      const readme = read(root, 'sales', 'scripts', 'README.md');
      assert.equal(readme, read(language === 'es' ? ES_SALES : path.join(TEMPLATES_AREAS_DIR, 'sales'), 'scripts', 'README.md'), language);
      const report = runDoctor(root);
      assert.equal(report.errors, 0, JSON.stringify(report.issues));
      assert.equal(report.warnings, 0, `${language}: ${JSON.stringify(report.issues)}`);
      const { html } = buildSalesView(root);
      assert.doesNotMatch(html, /Sample Co|cold-outreach-email|discovery-call-framework/, language);
    }
  }));
