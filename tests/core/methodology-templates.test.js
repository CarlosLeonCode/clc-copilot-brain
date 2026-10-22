// Methodology template sets: the Sandler starter sales set (en + es) overlays the MEDDPICC base set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initBrain } from '../../src/core/scaffold.js';
import { addPresetArea } from '../../src/core/areas.js';
import { applyUpgrade, planUpgrade } from '../../src/core/upgrade.js';
import { runDoctor } from '../../src/core/doctor.js';
import { buildSalesView } from '../../src/core/sales-view.js';
import { parseFrontmatter, readPlayMeta, validatePlay } from '../../src/core/plays.js';
import { parseFlowchart } from '../../src/core/flowchart.js';
import { parseGlossary } from '../../src/core/sales-glossary.js';
import { stageNames } from '../../src/core/sales-stages.js';
import { qualificationDefaults, resolveCriteria } from '../../src/core/scorecard.js';
import { getMethodology } from '../../src/core/methodology.js';
import { PKG_ROOT, TEMPLATES_AREAS_DIR, TEMPLATES_METHODOLOGIES_DIR } from '../../src/core/package-paths.js';
import { withTmp } from './helpers.js';

const SANDLER_EN = path.join(TEMPLATES_METHODOLOGIES_DIR, 'sandler', 'areas', 'sales');
const SANDLER_ES = path.join(TEMPLATES_METHODOLOGIES_DIR, 'sandler', 'locales', 'es', 'areas', 'sales');
const BASE_ES = path.join(PKG_ROOT, 'templates', 'locales', 'es', 'areas', 'sales');
const SET = [
  'system.md', 'glossary.md', 'stages/pipeline-stages.md', 'qualification/qualification-matrix.md',
  'plays/cold-call.md', 'plays/discovery-call.md', 'plays/demo-call.md', 'plays/follow-up.md'
];
const PLAYS = SET.filter((rel) => rel.startsWith('plays/'));
const MATRIX = 'sales/qualification/qualification-matrix.md';
const MERMAID = /```mermaid\r?\n([\s\S]*?)```/;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const brainOf = (dir, name = 'brain') => path.join(dir, name);
const STAGES = {
  en: ['Contact', 'Pain', 'Budget and decision', 'Presentation', 'Close'],
  es: ['Contacto', 'Dolor', 'Presupuesto y decisión', 'Presentación', 'Cierre']
};

test('the Sandler set ships every file in English and Spanish', () => {
  for (const rel of SET) {
    assert.ok(fs.existsSync(path.join(SANDLER_EN, rel)), `en ${rel}`);
    assert.ok(fs.existsSync(path.join(SANDLER_ES, rel)), `es ${rel}`);
  }
});

test('Sandler plays are valid, and the Spanish ones keep ids, stages and branches', () => {
  for (const rel of PLAYS) {
    const file = path.basename(rel);
    const en = read(SANDLER_EN, rel);
    const es = read(SANDLER_ES, rel);
    assert.deepEqual(validatePlay(file, en), [], `en ${file}`);
    assert.deepEqual(validatePlay(file, es), [], `es ${file}`);
    for (const key of ['play', 'stages', 'motions', 'version', 'status']) assert.equal(parseFrontmatter(es)[key], parseFrontmatter(en)[key], `${file}: ${key}`);
    assert.deepEqual(readPlayMeta(file, es).branches.map((b) => b.id), readPlayMeta(file, en).branches.map((b) => b.id), `${file}: branches`);
    for (const text of [en, es]) {
      const graph = parseFlowchart(MERMAID.exec(text)[1]);
      assert.ok(graph.nodes.length > 0 && graph.edges.length > 0, `${file}: diagram draws`);
    }
  }
});

test('Sandler map, pipeline and matrix agree on the stages and qualification', () => {
  for (const [lang, dir] of [['en', SANDLER_EN], ['es', SANDLER_ES]]) {
    const names = stageNames(read(dir, 'system.md'));
    assert.deepEqual([...names.values()], STAGES[lang], lang);
    const pipeline = read(dir, 'stages/pipeline-stages.md');
    for (const [n, name] of names) assert.ok(pipeline.includes(`"${n}. ${name}<br>`), `${lang}: pipeline uses ${name}`);
    assert.ok(parseFlowchart(MERMAID.exec(pipeline)[1]).nodes.length >= 5, `${lang}: pipeline draws`);
    const criteria = resolveCriteria(parseFrontmatter(read(dir, 'qualification/qualification-matrix.md')), 'sandler');
    assert.equal(criteria.source, 'matrix', lang);
    assert.deepEqual(criteria.ids, [...qualificationDefaults('sandler').criteria], lang);
    assert.deepEqual(criteria.advanceRequires, [...qualificationDefaults('sandler').advanceRequires], lang);
    assert.equal(Object.keys(criteria.labels).length, criteria.ids.length, `${lang}: every criterion has a label`);
  }
});

test('the Sandler glossary is canonical, method terms only, with the same groups in en and es', () => {
  const en = parseGlossary(read(SANDLER_EN, 'glossary.md'));
  const es = parseGlossary(read(SANDLER_ES, 'glossary.md'));
  assert.deepEqual(en.diagnostics, []);
  assert.deepEqual(es.diagnostics, []);
  assert.ok(en.groups.length >= 4);
  assert.deepEqual(es.groups.map((g) => g.terms.length), en.groups.map((g) => g.terms.length));
  assert.ok(en.groups.flatMap((g) => g.terms).some((t) => t.term === 'Upfront contract'));
  assert.ok(es.groups.flatMap((g) => g.terms).some((t) => t.term === 'Acuerdo previo'));
});

test('the Sandler set holds no MEDDPICC wording and the Spanish set no voseo', () => {
  for (const dir of [SANDLER_EN, SANDLER_ES]) {
    for (const rel of SET) assert.doesNotMatch(read(dir, rel), /meddpicc|economic buyer|champion/i, rel);
  }
  for (const rel of SET) assert.doesNotMatch(read(SANDLER_ES, rel), /\b(vos|tenés|querés|podés|pedile|contale|decile)\b/i, rel);
});

for (const language of ['en', 'es']) {
  test(`init --methodology sandler (${language}) writes the Sandler set, records the method and passes doctor`, () =>
    withTmp((dir) => {
      const root = brainOf(dir);
      initBrain(root, { areas: ['sales', 'marketing'], language, methodology: 'sandler' });
      const src = language === 'es' ? SANDLER_ES : SANDLER_EN;
      for (const rel of SET) assert.equal(read(root, 'sales', rel), read(src, rel), rel);
      assert.equal(JSON.parse(read(root, 'org-kernel.json')).methodology, 'sandler');
      assert.equal(getMethodology(root), 'sandler');
      const scriptsReadme = language === 'es' ? read(BASE_ES, 'scripts', 'README.md') : read(TEMPLATES_AREAS_DIR, 'sales', 'scripts', 'README.md');
      assert.equal(read(root, 'sales', 'scripts', 'README.md'), scriptsReadme, 'files outside the set keep the base translation');
      const report = runDoctor(root);
      assert.equal(report.errors, 0, JSON.stringify(report.issues));
      assert.equal(report.warnings, 0, JSON.stringify(report.issues));
      const { html } = buildSalesView(root);
      for (const name of STAGES[language]) assert.ok(html.includes(name), `page shows ${name}`);
      assert.deepEqual(planUpgrade(root).actions, [], 'a fresh Sandler brain is up to date');
    }));

  test(`init without a methodology (${language}) is meddpicc: base set, no glossary, doctor clean`, () =>
    withTmp((dir) => {
      const root = brainOf(dir);
      initBrain(root, { areas: ['sales'], language });
      assert.equal(JSON.parse(read(root, 'org-kernel.json')).methodology, 'meddpicc');
      assert.equal(read(root, MATRIX), read(TEMPLATES_AREAS_DIR, MATRIX));
      assert.equal(fs.existsSync(path.join(root, 'sales', 'glossary.md')), false);
      const report = runDoctor(root);
      assert.equal(report.warnings, 0, JSON.stringify(report.issues));
      assert.deepEqual(planUpgrade(root).actions, [], 'a fresh meddpicc brain is up to date');
    }));
}

test('initBrain rejects a methodology without a starter set', () => withTmp((dir) => {
  assert.throws(() => initBrain(brainOf(dir), { areas: ['sales'], methodology: 'bant' }), /methodology/i);
}));

test('adding the sales area to a Sandler brain writes the Sandler set in the brain language', () => withTmp((dir) => {
  const root = brainOf(dir);
  initBrain(root, { areas: ['marketing'], language: 'es', methodology: 'sandler' });
  addPresetArea(root, 'sales');
  for (const rel of SET) assert.equal(read(root, 'sales', rel), read(SANDLER_ES, rel), rel);
}));

test('upgrade restores a missing Sandler play from the Sandler set, in the brain language', () => withTmp((dir) => {
  const root = brainOf(dir);
  initBrain(root, { areas: ['sales'], language: 'es', methodology: 'sandler' });
  fs.rmSync(path.join(root, 'sales', 'plays', 'demo-call.md'));
  applyUpgrade(root, planUpgrade(root));
  assert.equal(read(root, 'sales', 'plays', 'demo-call.md'), read(SANDLER_ES, 'plays', 'demo-call.md'));
}));

function sandlerBrainWithMatrix(dir, matrix, { language = 'en', methodology = 'sandler' } = {}) {
  const root = brainOf(dir, `${methodology}-${language}`);
  initBrain(root, { areas: ['sales'], language, methodology: methodology === 'bant' ? 'meddpicc' : methodology });
  if (methodology === 'bant') {
    const kernel = JSON.parse(read(root, 'org-kernel.json'));
    fs.writeFileSync(path.join(root, 'org-kernel.json'), JSON.stringify({ ...kernel, methodology: 'bant' }));
  }
  fs.writeFileSync(path.join(root, MATRIX), matrix);
  return root;
}
const matrixAction = (root) => planUpgrade(root).actions.find((a) => a.path === MATRIX);

test('upgrade on a Sandler brain whose Sandler matrix has no criteria adds the Sandler criteria, never MEDDPICC', () => withTmp((dir) => {
  for (const language of ['en', 'es']) {
    const body = '# Our Sandler matrix\n\n| Qualifier | What |\n| **Pain** | The pain |\n';
    const root = sandlerBrainWithMatrix(dir, body, { language });
    assert.equal(matrixAction(root).kind, 'replace', language);
    applyUpgrade(root, planUpgrade(root));
    const fm = parseFrontmatter(read(root, MATRIX));
    assert.equal(fm.criteria, 'upfront_contract, pain, budget, decision', language);
    assert.equal(fm.advance_requires, 'pain, budget, decision', language);
    assert.equal(fm.label_pain, parseFrontmatter(read(language === 'es' ? SANDLER_ES : SANDLER_EN, 'qualification/qualification-matrix.md')).label_pain, `${language} labels`);
    assert.doesNotMatch(read(root, MATRIX), /economic_buyer|champion|metrics|deal_size/);
    assert.ok(read(root, MATRIX).endsWith(body));
  }
}));

test('upgrade on a Sandler brain keeps a matrix that is not Sandler wording, or still MEDDPICC, and never injects MEDDPICC', () => withTmp((dir) => {
  const own = sandlerBrainWithMatrix(path.join(dir, 'a'), '# Our qualification\n\n| Pillar | Focus |\n');
  assert.deepEqual([matrixAction(own).kind, matrixAction(own).reason], ['skip', 'edited-locally']);
  const meddpicc = sandlerBrainWithMatrix(path.join(dir, 'b'), read(TEMPLATES_AREAS_DIR, MATRIX).replace(/^---[\s\S]*?---\n/, ''));
  assert.deepEqual([matrixAction(meddpicc).kind, matrixAction(meddpicc).reason], ['skip', 'edited-locally']);
  applyUpgrade(meddpicc, planUpgrade(meddpicc));
  assert.equal(parseFrontmatter(read(meddpicc, MATRIX)), null, 'no criteria were written');
}));

test('upgrade on a brain with its own method (no starter set) leaves the matrix alone', () => withTmp((dir) => {
  const root = sandlerBrainWithMatrix(dir, '# Our MEDDPICC-free BANT matrix\n', { methodology: 'bant' });
  assert.equal(matrixAction(root), undefined);
  const other = sandlerBrainWithMatrix(path.join(dir, 'x'), '# Our MEDDPICC matrix\n', { methodology: 'bant' });
  assert.equal(matrixAction(other), undefined, 'not even MEDDPICC wording gets MEDDPICC criteria');
}));
