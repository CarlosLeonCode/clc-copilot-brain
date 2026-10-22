// Doctor flags leftover template sample content in a set-up brain; fresh brains never ship it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDoctor } from '../../src/core/doctor.js';
import { initBrain } from '../../src/core/scaffold.js';
import { isDemoTemplateAsset } from '../../src/core/demo.js';
import { findSampleContent, SAMPLE_ICP } from '../../src/core/sample-content.js';
import { withTmp, writeFiles } from './helpers.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAMPLE_ICP_TEXT = fs.readFileSync(path.join(ROOT, 'templates', 'areas', 'sales', 'icps', 'enterprise-cto.md'), 'utf8');

function setUp(dir, patch = {}) {
  const file = path.join(dir, 'org-kernel.json');
  const kernel = JSON.parse(fs.readFileSync(file, 'utf8'));
  kernel.setup = { completed: true };
  Object.assign(kernel, patch);
  fs.writeFileSync(file, JSON.stringify(kernel, null, 2));
}

const sampleIssues = (result) => result.issues.filter((i) => /sample|ejemplo/i.test(i.message));

test('the sample ICP is a demo asset: clean brains of every method and language do not get it', () =>
  withTmp((dir) => {
    assert.equal(isDemoTemplateAsset('/x/sales/icps/enterprise-cto.md'), true);
    for (const methodology of ['meddpicc', 'sandler']) {
      for (const language of ['en', 'es']) {
        const brain = path.join(dir, `${methodology}-${language}`);
        initBrain(brain, { areas: ['sales'], methodology, language });
        assert.equal(fs.existsSync(path.join(brain, SAMPLE_ICP)), false, `${methodology}/${language}`);
        setUp(brain);
        const result = runDoctor(brain, { lang: language });
        assert.equal(result.errors, 0, `${methodology}/${language}`);
        assert.deepEqual(result.issues, [], `${methodology}/${language}`);
      }
    }
  }));

test('doctor warns about the unmodified sample ICP in a set-up brain, in one plain grouped message', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, { [SAMPLE_ICP]: SAMPLE_ICP_TEXT.replace(/\n/g, '\r\n') });
    assert.deepEqual(sampleIssues(runDoctor(dir)), [], 'not flagged before setup');
    setUp(dir);
    const issues = sampleIssues(runDoctor(dir));
    assert.equal(issues.length, 1);
    assert.equal(issues[0].level, 'warning');
    assert.match(issues[0].message, /sales\/icps\/enterprise-cto\.md/);
  }));

test('an edited sample ICP is kept quietly in a meddpicc brain but flagged in a sandler brain', () =>
  withTmp((dir) => {
    const meddpicc = path.join(dir, 'm');
    initBrain(meddpicc, { areas: ['sales'] });
    writeFiles(meddpicc, { [SAMPLE_ICP]: `${SAMPLE_ICP_TEXT}\nOur own note.\n` });
    setUp(meddpicc);
    assert.deepEqual(sampleIssues(runDoctor(meddpicc)), []);

    const sandler = path.join(dir, 's');
    initBrain(sandler, { areas: ['sales'], methodology: 'sandler', language: 'es' });
    writeFiles(sandler, { [SAMPLE_ICP]: `${SAMPLE_ICP_TEXT}\nNota nuestra.\n` });
    setUp(sandler);
    const issues = sampleIssues(runDoctor(sandler, { lang: 'es' }));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /sales\/icps\/enterprise-cto\.md/);
    assert.match(issues[0].message, /Sandler/);

    const inferred = path.join(dir, 'i');
    initBrain(inferred, { areas: ['sales'], methodology: 'sandler' });
    writeFiles(inferred, { [SAMPLE_ICP]: `${SAMPLE_ICP_TEXT}\nEdited.\n` });
    setUp(inferred);
    const kernelFile = path.join(inferred, 'org-kernel.json');
    const kernel = JSON.parse(fs.readFileSync(kernelFile, 'utf8'));
    delete kernel.methodology;
    fs.writeFileSync(kernelFile, JSON.stringify(kernel));
    assert.equal(sampleIssues(runDoctor(inferred)).length, 1, 'older Sandler brain without the methodology field');
  }));

test('doctor warns when the brain skills still use the sample names Acme, Juanita or Pepito', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, {
      'skills/skill_call_analyzer.md': '# Call analyzer\n\nExample: Juanita from ACME called Pepito.\n',
      '.agents/skills/call/SKILL.md': `${fs.readFileSync(path.join(dir, '.agents/skills/call/SKILL.md'), 'utf8')}\nSee acme-corp.\n`,
      'skills/integrations/CLAUDE_PROJECT.md': 'Acme lives in an integration guide, which is not checked.\n',
      'sales/calls/2026-01/x.md': 'Acme in a call log is real data.\n'
    });
    const found = findSampleContent(dir);
    assert.deepEqual(found.namedSkills, ['.agents/skills/call/SKILL.md', 'skills/skill_call_analyzer.md']);
    const issues = runDoctor(dir).issues.filter((i) => /Acme/.test(i.message));
    assert.equal(issues.length, 1);
    assert.match(issues[0].message, /\.agents\/skills\/call\/SKILL\.md, skills\/skill_call_analyzer\.md/);
    const es = runDoctor(dir, { lang: 'es' }).issues.filter((i) => /Acme/.test(i.message));
    assert.match(es[0].message, /habilidades/);
  }));

test('no shipped skill uses the sample names Acme, Juanita or Pepito', () => {
  const dirs = ['templates/base/.agents/skills', 'templates/base/skills', 'templates/areas/sales/skills', '.agents/skills', 'skills'];
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.md') && /\b(acme|juanita|pepito)\b/i.test(fs.readFileSync(abs, 'utf8'))) offenders.push(path.relative(ROOT, abs));
    }
  };
  for (const rel of dirs) walk(path.join(ROOT, rel));
  assert.deepEqual(offenders, []);
});
