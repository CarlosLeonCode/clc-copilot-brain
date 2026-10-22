// `clc-brain migrate` core: a plan of safe, minimal changes for older brains, applied only on request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigration, planMigration } from '../../src/core/migrate.js';
import { BrainError } from '../../src/core/errors.js';
import { initBrain } from '../../src/core/scaffold.js';
import { parseScript } from '../../src/core/sales-scripts.js';
import { checkSalesLibrary } from '../../src/core/sales-library.js';
import { withTmp, writeFiles } from './helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAMPLE_ICP_TEXT = fs.readFileSync(path.join(ROOT, 'templates', 'areas', 'sales', 'icps', 'enterprise-cto.md'), 'utf8');

// A frontmatter-less file whose body already follows the script grammar.
const GRAMMAR_BODY = `# Cold calls

## First call
goal: Book a meeting

### Opening
say: Hi, do you have two minutes?
tone: start
`;
const PROSE_BODY = '# Upfront contract\n\n## What it is for\nSet the rules at the start.\n\n## Cold call\n> "Do you have two minutes?"\n';

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const ids = (plan) => plan.steps.map((s) => `${s.id}:${s.path ?? ''}`);

function dropMethodology(dir) {
  const kernel = JSON.parse(read(dir, 'org-kernel.json'));
  delete kernel.methodology;
  fs.writeFileSync(path.join(dir, 'org-kernel.json'), `${JSON.stringify(kernel, null, 2)}\n`);
}

test('a fresh brain needs no migration', () =>
  withTmp((dir) => {
    for (const methodology of ['meddpicc', 'sandler']) {
      const brain = path.join(dir, methodology);
      initBrain(brain, { areas: ['sales'], methodology, language: 'es' });
      assert.deepEqual(planMigration(brain).steps.filter((s) => s.change), [], methodology);
    }
  }));

test('migrate refuses a folder that is not a brain', () =>
  withTmp((dir) => {
    assert.throws(() => planMigration(dir), (err) => err instanceof BrainError && err.code === 'NOT_A_BRAIN');
  }));

test('scripts without a header: a header is proposed only when the body already follows the script grammar', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, { 'sales/scripts/cold-calls.md': GRAMMAR_BODY, 'sales/scripts/upfront-contract.md': PROSE_BODY });
    const plan = planMigration(dir);
    const header = plan.steps.find((s) => s.id === 'script-header');
    assert.equal(header.path, 'sales/scripts/cold-calls.md');
    assert.equal(header.change, true);
    assert.deepEqual(parseScript(header.next, { fileStem: 'cold-calls' }).diagnostics, []);
    assert.ok(header.next.endsWith(GRAMMAR_BODY), 'the body is kept as it is');
    assert.match(header.next, /^---\nscript: cold-calls\ntitle: Cold calls\nversion: 1\nstatus: active\n---\n/);
    const convert = plan.steps.find((s) => s.id === 'script-convert');
    assert.equal(convert.path, 'sales/scripts/upfront-contract.md');
    assert.equal(convert.change, false);

    assert.equal(read(dir, 'sales/scripts/cold-calls.md'), GRAMMAR_BODY, 'planning writes nothing');
    const result = applyMigration(dir, plan);
    assert.deepEqual(result.applied, ['sales/scripts/cold-calls.md']);
    assert.equal(read(dir, 'sales/scripts/cold-calls.md'), header.next);
    assert.equal(read(dir, 'sales/scripts/cold-calls.md.bak'), GRAMMAR_BODY, 'backup kept');
    assert.equal(read(dir, 'sales/scripts/upfront-contract.md'), PROSE_BODY, 'prose is left for the assistant');
    assert.equal(checkSalesLibrary(dir).some((w) => /cold-calls\.md/.test(w) && /not recognized/.test(w)), false);
  }));

test('a Spanish glossary only (glosario*.md) gets a link from system.md when none exists; nothing is renamed', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], language: 'es' });
    writeFiles(dir, { 'sales/glosario-sandler.md': '# Glosario\n\n## Dolor\nLo que le cuesta al cliente.\n' });
    const before = read(dir, 'sales/system.md');
    const step = planMigration(dir).steps.find((s) => s.id === 'glossary-link');
    assert.equal(step.path, 'sales/system.md');
    assert.ok(step.next.startsWith(before), 'only appended');
    assert.match(step.next.slice(before.length), /\[glosario-sandler\.md\]\(\.\/glosario-sandler\.md\)/);
    assert.match(step.next.slice(before.length), /Glosario/);
    applyMigration(dir, planMigration(dir));
    assert.ok(fs.existsSync(path.join(dir, 'sales/glosario-sandler.md')));
    assert.equal(fs.existsSync(path.join(dir, 'sales/glossary.md')), false);
    assert.equal(checkSalesLibrary(dir).some((w) => /glosario-sandler/.test(w)), false, 'doctor sees the link');
    assert.equal(planMigration(dir).steps.some((s) => s.id === 'glossary-link'), false, 'running again changes nothing');

    const linked = path.join(dir, 'linked');
    initBrain(linked, { areas: ['sales'], language: 'es' });
    writeFiles(linked, { 'sales/glosario-x.md': '# G\n', 'sales/system.md': `${before}\nVer el [Glosario](./glosario-x.md).\n` });
    assert.equal(planMigration(linked).steps.some((s) => s.id === 'glossary-link'), false, 'already linked');
  }));

test('a missing methodology is inferred from the brain and proposed for org-kernel.json', () =>
  withTmp((dir) => {
    const sandler = path.join(dir, 's');
    initBrain(sandler, { areas: ['sales'], methodology: 'sandler' });
    dropMethodology(sandler);
    const step = planMigration(sandler).steps.find((s) => s.id === 'methodology');
    assert.equal(step.methodology, 'sandler');
    assert.equal(step.path, 'org-kernel.json');
    applyMigration(sandler, planMigration(sandler));
    const kernel = JSON.parse(read(sandler, 'org-kernel.json'));
    assert.equal(kernel.methodology, 'sandler');
    assert.deepEqual(Object.keys(kernel).slice(0, 4), ['$schema', 'version', 'language', 'methodology'], 'placed next to language');
    assert.ok(fs.existsSync(path.join(sandler, 'org-kernel.json.bak')));

    const meddpicc = path.join(dir, 'm');
    initBrain(meddpicc, { areas: ['sales'] });
    dropMethodology(meddpicc);
    assert.equal(planMigration(meddpicc).steps.find((s) => s.id === 'methodology').methodology, 'meddpicc');
  }));

test('industry rows are reported as fine and sample files are only listed, never removed', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const play = read(dir, 'sales/plays/cold-call.md');
    writeFiles(dir, {
      'sales/plays/cold-call.md': play.replace(/\| B1 \|/, '| B1 · Retail |'),
      'sales/icps/enterprise-cto.md': SAMPLE_ICP_TEXT,
      'sales/icps/edited.md': 'Our ICP\n'
    });
    const plan = planMigration(dir);
    const samples = plan.steps.filter((s) => s.id === 'legacy-sample');
    assert.deepEqual(samples.map((s) => s.path), ['sales/icps/enterprise-cto.md']);
    assert.ok(samples.every((s) => s.change === false));
    applyMigration(dir, plan);
    assert.ok(fs.existsSync(path.join(dir, 'sales/icps/enterprise-cto.md')), 'never deleted');
    assert.ok(ids(plan).includes('industry-rows:'));
  }));

test('apply never overwrites an existing backup and never writes hand-made pages', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    dropMethodology(dir);
    writeFiles(dir, {
      'sales/scripts/cold-calls.md': GRAMMAR_BODY,
      'sales/scripts/cold-calls.md.bak': 'older backup\n',
      'sales/scripts/cold-calls.html': '<html><body>Hand made</body></html>\n'
    });
    const plan = planMigration(dir);
    const header = plan.steps.find((s) => s.id === 'script-header');
    assert.equal(header.blocked, 'backup-exists');
    const result = applyMigration(dir, plan);
    assert.deepEqual(result.skipped, [{ path: 'sales/scripts/cold-calls.md', reason: 'backup-exists' }]);
    assert.deepEqual(result.applied, ['org-kernel.json']);
    assert.equal(read(dir, 'sales/scripts/cold-calls.md'), GRAMMAR_BODY);
    assert.equal(read(dir, 'sales/scripts/cold-calls.md.bak'), 'older backup\n');
    assert.equal(read(dir, 'sales/scripts/cold-calls.html'), '<html><body>Hand made</body></html>\n');
  }));

test('apply skips a file that changed after the plan was made', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, { 'sales/scripts/cold-calls.md': GRAMMAR_BODY });
    const plan = planMigration(dir);
    writeFiles(dir, { 'sales/scripts/cold-calls.md': `${GRAMMAR_BODY}\n` });
    assert.deepEqual(applyMigration(dir, plan).skipped, [{ path: 'sales/scripts/cold-calls.md', reason: 'changed' }]);
    assert.equal(fs.existsSync(path.join(dir, 'sales/scripts/cold-calls.md.bak')), false);
  }));
