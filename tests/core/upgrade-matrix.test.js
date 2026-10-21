import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planUpgrade, applyUpgrade } from '../../src/core/upgrade.js';
import { parseFrontmatter } from '../../src/core/plays.js';
import { resolveCriteria, FALLBACK_CRITERIA } from '../../src/core/scorecard.js';
import { withTmp, writeFiles } from './helpers.js';

const MATRIX = 'sales/qualification/qualification-matrix.md';
const TEMPLATE = '---\ncriteria: metrics, champion\nlabel_metrics: "Measurable impact"\nlabel_champion: "Internal supporter"\n---\n# Template matrix\n';

function setup(tmp, matrix, { active = ['sales'] } = {}) {
  const base = path.join(tmp, 'pkg', 'base');
  const areas = path.join(tmp, 'pkg', 'areas');
  const root = path.join(tmp, 'brain');
  writeFiles(base, { 'AGENTS.md': 'agents\n' });
  writeFiles(areas, { 'sales/system.md': 'system\n', [MATRIX]: TEMPLATE });
  writeFiles(root, { 'org-kernel.json': JSON.stringify({ activeAreas: active }), 'sales/system.md': 'system\n', ...(matrix === undefined ? {} : { [MATRIX]: matrix }) });
  return { root, opts: { templatesBaseDir: base, templatesAreasDir: areas } };
}
const action = (plan) => plan.actions.find((a) => a.path === MATRIX);
const read = (root) => fs.readFileSync(path.join(root, MATRIX), 'utf8');

test('no frontmatter: the template block is prepended and the body is untouched', () => withTmp((tmp) => {
  const body = '# My own matrix\n\n| a | b |\n';
  const { root, opts } = setup(tmp, body);
  const a = action(planUpgrade(root, opts));
  assert.equal(a.policy, 'frontmatter-keys');
  assert.equal(a.kind, 'replace');
  applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(read(root), `---\ncriteria: metrics, champion\nlabel_metrics: "Measurable impact"\nlabel_champion: "Internal supporter"\n---\n${body}`);
  assert.equal(fs.readFileSync(path.join(root, `${MATRIX}.bak`), 'utf8'), body);
  assert.equal(action(planUpgrade(root, opts)), undefined, 'idempotent');
}));

test('frontmatter without criteria: keys are added inside it, user keys kept', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, '---\nowner: "Sam"\nlabel_champion: "My champion"\n---\n# Body\n');
  applyUpgrade(root, planUpgrade(root, opts));
  const fm = parseFrontmatter(read(root));
  assert.equal(fm.owner, 'Sam');
  assert.equal(fm.criteria, 'metrics, champion');
  assert.equal(fm.label_champion, 'My champion', 'an existing label is not duplicated or replaced');
  assert.equal(fm.label_metrics, 'Measurable impact');
  assert.equal(read(root).split('label_champion').length, 2);
  assert.ok(read(root).endsWith('---\n# Body\n'));
}));

test('criteria already declared (any framework): byte-identical, no action', () => withTmp((tmp) => {
  const bant = '---\ncriteria: budget, authority, need, timeline\n---\n# BANT\n';
  const { root, opts } = setup(tmp, bant);
  assert.equal(action(planUpgrade(root, opts)), undefined);
  applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(read(root), bant);
}));

test('missing matrix, sales not active, or an existing backup: nothing is written', () => withTmp((tmp) => {
  assert.equal(action(planUpgrade(setup(path.join(tmp, 'a'), undefined).root, setup(path.join(tmp, 'a'), undefined).opts)), undefined);
  const off = setup(path.join(tmp, 'b'), '# Old\n', { active: ['marketing'] });
  assert.equal(action(planUpgrade(off.root, off.opts)), undefined);
  const bak = setup(path.join(tmp, 'c'), '# Old\n');
  fs.writeFileSync(path.join(bak.root, `${MATRIX}.bak`), 'earlier');
  const a = action(planUpgrade(bak.root, bak.opts));
  assert.deepEqual([a.kind, a.reason], ['skip', 'backup-exists']);
  applyUpgrade(bak.root, planUpgrade(bak.root, bak.opts));
  assert.equal(read(bak.root), '# Old\n');
}));

test('the shipped template upgrades an old matrix to the full default list', () => withTmp((tmp) => {
  const root = path.join(tmp, 'brain');
  writeFiles(root, { 'org-kernel.json': JSON.stringify({ activeAreas: ['sales'] }), [MATRIX]: '# Old matrix\n' });
  applyUpgrade(root, planUpgrade(root));
  assert.deepEqual(resolveCriteria(parseFrontmatter(read(root))).ids, FALLBACK_CRITERIA);
  assert.equal(resolveCriteria(parseFrontmatter(read(root))).source, 'matrix');
}));
