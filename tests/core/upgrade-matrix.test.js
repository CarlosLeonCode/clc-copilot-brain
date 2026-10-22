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

const OLD_CRITERIA = 'metrics, economic_buyer, decision_criteria, decision_process, paper_process, identified_pain, champion, competition';
const FULL_TEMPLATE = `---\ncriteria: ${OLD_CRITERIA}, deal_size\nadvance_requires: champion, economic_buyer, identified_pain, deal_size\nlabel_metrics: "Measurable impact"\nlabel_deal_size: "Deal size known"\n---\n# Template matrix\n`;
function setupFull(tmp, matrix) {
  const { root, opts } = setup(tmp, matrix);
  fs.writeFileSync(path.join(opts.templatesAreasDir, MATRIX), FULL_TEMPLATE);
  return { root, opts };
}

test('old default criteria without deal_size: deal_size, its label and advance_requires are appended', () => withTmp((tmp) => {
  const old = `---\ncriteria: ${OLD_CRITERIA}\nlabel_metrics: "My metrics"\n---\n# Body\n`;
  const { root, opts } = setupFull(tmp, old);
  const a = action(planUpgrade(root, opts));
  assert.deepEqual([a.policy, a.kind], ['frontmatter-keys', 'replace']);
  assert.equal(read(root), old, 'the dry run writes nothing');
  applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(read(root), `---\ncriteria: ${OLD_CRITERIA}, deal_size\nlabel_metrics: "My metrics"\nadvance_requires: champion, economic_buyer, identified_pain, deal_size\nlabel_deal_size: "Deal size known"\n---\n# Body\n`);
  assert.equal(fs.readFileSync(path.join(root, `${MATRIX}.bak`), 'utf8'), old);
  const resolved = resolveCriteria(parseFrontmatter(read(root)));
  assert.deepEqual(resolved.ids, FALLBACK_CRITERIA);
  assert.deepEqual(resolved.advanceRequires, ['champion', 'economic_buyer', 'identified_pain', 'deal_size']);
  assert.equal(action(planUpgrade(root, opts)), undefined, 'idempotent');
}));

test('extra user criteria, quoted list and own advance_requires are kept; only deal_size is appended', () => withTmp((tmp) => {
  const old = `---\ncriteria: "${OLD_CRITERIA}, timing"\nadvance_requires: champion\nlabel_deal_size: "Ticket size"\n---\n# Body\n`;
  const { root, opts } = setupFull(tmp, old);
  applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(read(root), `---\ncriteria: "${OLD_CRITERIA}, timing, deal_size"\nadvance_requires: champion\nlabel_deal_size: "Ticket size"\n---\n# Body\n`);
}));

test('a changed criteria list (a default removed) or one that has deal_size is left alone', () => withTmp((tmp) => {
  const trimmed = '---\ncriteria: metrics, champion, competition\n---\n# Mine\n';
  const a = setupFull(path.join(tmp, 'a'), trimmed);
  assert.equal(action(planUpgrade(a.root, a.opts)), undefined);
  const done = `---\ncriteria: ${OLD_CRITERIA}, deal_size\n---\n# Mine\n`;
  const b = setupFull(path.join(tmp, 'b'), done);
  assert.equal(action(planUpgrade(b.root, b.opts)), undefined, 'advance_requires alone is not added');
}));

test('old default criteria with an existing backup: skipped, nothing written', () => withTmp((tmp) => {
  const old = `---\ncriteria: ${OLD_CRITERIA}\n---\n# Body\n`;
  const { root, opts } = setupFull(tmp, old);
  fs.writeFileSync(path.join(root, `${MATRIX}.bak`), 'earlier');
  const a = action(planUpgrade(root, opts));
  assert.deepEqual([a.kind, a.reason], ['skip', 'backup-exists']);
  applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(read(root), old);
}));
