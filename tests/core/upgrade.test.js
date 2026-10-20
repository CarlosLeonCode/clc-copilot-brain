import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planUpgrade, applyUpgrade } from '../../src/core/upgrade.js';
import { initBrain } from '../../src/core/scaffold.js';
import { TEMPLATES_AREAS_DIR, TEMPLATES_BASE_DIR } from '../../src/core/package-paths.js';
import { withTmp, writeFiles } from './helpers.js';

const kernel = (areas) => JSON.stringify({ activeAreas: areas });

// Fake package templates + a brain, both in temp dirs.
function setup(tmp, { brain = {}, base = {}, areas = {}, active = ['sales'] } = {}) {
  const tpl = path.join(tmp, 'pkg', 'base');
  const tplAreas = path.join(tmp, 'pkg', 'areas');
  const root = path.join(tmp, 'brain');
  writeFiles(tpl, { '.agents/skills/call/SKILL.md': 'call v2\n', 'skills/skill_x.md': 'x v2\n', 'AGENTS.md': 'agents\n', ...base });
  writeFiles(tplAreas, { 'sales/system.md': 'system\n', 'sales/plays/cold-call.md': 'play\n', 'sales/README.md': 'readme\n', ...areas });
  writeFiles(root, { 'org-kernel.json': kernel(active), ...brain });
  return { root, opts: { templatesBaseDir: tpl, templatesAreasDir: tplAreas } };
}
const find = (plan, p) => plan.actions.find((a) => a.path === p);

test('plan classifies per policy: replace differing, add missing, never touch the rest', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, {
    brain: { '.agents/skills/call/SKILL.md': 'call v1\n', 'skills/skill_x.md': 'x v2\n', 'sales/plays/cold-call.md': 'my custom play\n', 'AGENTS.md': 'mine\n' }
  });
  const plan = planUpgrade(root, opts);
  assert.deepEqual(find(plan, '.agents/skills/call/SKILL.md'), {
    path: '.agents/skills/call/SKILL.md', policy: 'template-owned', kind: 'replace', current: 'call v1\n', next: 'call v2\n'
  });
  assert.equal(find(plan, 'skills/skill_x.md'), undefined, 'equal bytes are not actions');
  assert.equal(find(plan, 'sales/system.md').kind, 'add');
  assert.equal(find(plan, 'sales/system.md').policy, 'add-if-missing');
  assert.equal(find(plan, 'sales/plays/cold-call.md'), undefined, 'existing play is never touched');
  assert.equal(find(plan, 'AGENTS.md'), undefined);
  assert.equal(find(plan, 'sales/README.md'), undefined, 'only system.md and plays are managed in areas');
}));

test('sales files are only planned when sales is active', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { active: ['marketing'] });
  assert.equal(find(planUpgrade(root, opts), 'sales/system.md'), undefined);
}));

test('a new base command or skill is add-if-missing', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v2\n' } });
  const plan = planUpgrade(root, opts);
  assert.equal(find(plan, 'skills/skill_x.md').kind, 'add');
  assert.equal(find(plan, 'skills/skill_x.md').policy, 'add-if-missing');
}));

test('non-brain directory throws a typed NOT_A_BRAIN error', () => withTmp((tmp) => {
  const { opts } = setup(tmp);
  fs.mkdirSync(path.join(tmp, 'empty'));
  assert.throws(() => planUpgrade(path.join(tmp, 'empty'), opts), (e) => e.name === 'BrainError' && e.code === 'NOT_A_BRAIN');
  assert.throws(() => applyUpgrade(path.join(tmp, 'empty'), { actions: [] }), (e) => e.code === 'NOT_A_BRAIN');
}));

test('managed templates containing init placeholders are skipped', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, {
    base: { '.agents/skills/call/SKILL.md': 'hello {{COMPANY_NAME}}\n' }, brain: { '.agents/skills/call/SKILL.md': 'old\n' }
  });
  const a = find(planUpgrade(root, opts), '.agents/skills/call/SKILL.md');
  assert.equal(a.kind, 'skip');
  assert.equal(a.reason, 'placeholder');
}));

test('apply replaces with a .bak backup, adds new files, and reports them', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v1\n' } });
  const res = applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(fs.readFileSync(path.join(root, '.agents/skills/call/SKILL.md'), 'utf8'), 'call v2\n');
  assert.equal(fs.readFileSync(path.join(root, '.agents/skills/call/SKILL.md.bak'), 'utf8'), 'call v1\n');
  assert.deepEqual(res.replaced, [{ path: '.agents/skills/call/SKILL.md', backup: '.agents/skills/call/SKILL.md.bak' }]);
  assert.ok(res.added.includes('sales/system.md'));
  assert.equal(fs.readFileSync(path.join(root, 'sales/plays/cold-call.md'), 'utf8'), 'play\n');
  assert.deepEqual(res.skipped, []);
}));

test('an existing .bak is never clobbered: the file is skipped at plan and apply time', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v1\n', '.agents/skills/call/SKILL.md.bak': 'precious\n' } });
  const plan = planUpgrade(root, opts);
  assert.deepEqual([find(plan, '.agents/skills/call/SKILL.md').kind, find(plan, '.agents/skills/call/SKILL.md').reason], ['skip', 'backup-exists']);
  // A .bak appearing between plan and apply is also respected.
  const { root: r2, opts: o2 } = setup(path.join(tmp, 'two'), { brain: { '.agents/skills/call/SKILL.md': 'call v1\n' } });
  const plan2 = planUpgrade(r2, o2);
  fs.writeFileSync(path.join(r2, '.agents/skills/call/SKILL.md.bak'), 'late\n');
  const res = applyUpgrade(r2, plan2);
  assert.deepEqual(res.skipped.find((s) => s.path === '.agents/skills/call/SKILL.md'), { path: '.agents/skills/call/SKILL.md', reason: 'backup-exists' });
  assert.equal(fs.readFileSync(path.join(r2, '.agents/skills/call/SKILL.md'), 'utf8'), 'call v1\n');
  assert.equal(fs.readFileSync(path.join(r2, '.agents/skills/call/SKILL.md.bak'), 'utf8'), 'late\n');
}));

test('apply skips files that changed since the plan', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v1\n' } });
  const plan = planUpgrade(root, opts);
  fs.writeFileSync(path.join(root, '.agents/skills/call/SKILL.md'), 'edited meanwhile\n');
  fs.mkdirSync(path.join(root, 'sales'), { recursive: true });
  fs.writeFileSync(path.join(root, 'sales/system.md'), 'created meanwhile\n');
  const res = applyUpgrade(root, plan);
  const reasons = Object.fromEntries(res.skipped.map((s) => [s.path, s.reason]));
  assert.equal(reasons['.agents/skills/call/SKILL.md'], 'changed-since-plan');
  assert.equal(reasons['sales/system.md'], 'changed-since-plan');
  assert.equal(fs.readFileSync(path.join(root, '.agents/skills/call/SKILL.md'), 'utf8'), 'edited meanwhile\n');
  assert.equal(fs.readFileSync(path.join(root, 'sales/system.md'), 'utf8'), 'created meanwhile\n');
}));

test('apply skips symlinked targets and paths escaping the brain', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v1\n' } });
  const outside = path.join(tmp, 'outside.md');
  fs.writeFileSync(outside, 'call v1\n');
  fs.rmSync(path.join(root, '.agents/skills/call/SKILL.md'));
  fs.symlinkSync(outside, path.join(root, '.agents/skills/call/SKILL.md'));
  const plan = planUpgrade(root, opts);
  plan.actions.push({ path: '../escape.md', policy: 'add-if-missing', kind: 'add', next: 'x' });
  const res = applyUpgrade(root, plan);
  const reasons = Object.fromEntries(res.skipped.map((s) => [s.path, s.reason]));
  assert.equal(reasons['.agents/skills/call/SKILL.md'], 'symlink');
  assert.equal(reasons['../escape.md'], 'outside-root');
  assert.equal(fs.readFileSync(outside, 'utf8'), 'call v1\n');
  assert.equal(fs.existsSync(path.join(tmp, 'escape.md')), false);
}));

test('apply does not write through a symlinked parent directory', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp);
  const elsewhere = path.join(tmp, 'elsewhere');
  fs.mkdirSync(elsewhere);
  fs.symlinkSync(elsewhere, path.join(root, 'sales'));
  const res = applyUpgrade(root, planUpgrade(root, opts));
  assert.equal(res.skipped.find((s) => s.path === 'sales/system.md').reason, 'symlink');
  assert.deepEqual(fs.readdirSync(elsewhere), []);
}));

test('a second plan after apply is empty (idempotent) and unmanaged files stay byte-identical', () => withTmp((tmp) => {
  const { root, opts } = setup(tmp, { brain: { '.agents/skills/call/SKILL.md': 'call v1\n', 'AGENTS.md': 'mine\n', 'sales/icps/a.md': 'icp\n' } });
  applyUpgrade(root, planUpgrade(root, opts));
  assert.deepEqual(planUpgrade(root, opts).actions, []);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'mine\n');
  assert.equal(fs.readFileSync(path.join(root, 'sales/icps/a.md'), 'utf8'), 'icp\n');
}));

test('real templates: no managed template has placeholders and a fresh sales brain needs no upgrade', () => withTmp((tmp) => {
  const root = path.join(tmp, 'fresh');
  initBrain(root, { areas: ['sales'] });
  const plan = planUpgrade(root, { templatesBaseDir: TEMPLATES_BASE_DIR, templatesAreasDir: TEMPLATES_AREAS_DIR });
  assert.deepEqual(plan.actions, []);
}));

// --- AGENTS.md managed block: only the delimited assistant rules are refreshed ---
const START = '<!-- copilot-brain:managed:start -->';
const END = '<!-- copilot-brain:managed:end -->';
const block = (body) => `${START}\n${body}\n${END}`;
const TPL_AGENTS = `# Guide\n\n${block('## 0. Rules\nrules v2')}\n\n---\n\n## 1. Identity\nfor {{COMPANY_NAME}}\n`;
const agentsSetup = (tmp, brainAgents, extra = {}) =>
  setup(tmp, { base: { 'AGENTS.md': TPL_AGENTS }, brain: { '.agents/skills/call/SKILL.md': 'call v2\n', 'skills/skill_x.md': 'x v2\n', 'AGENTS.md': brainAgents, ...extra } });

test('AGENTS.md: replaces only the managed block and keeps user edits elsewhere', () => withTmp((tmp) => {
  const mine = `# My guide\n\nmy intro\n\n${block('rules v1')}\n\n## 1. Identity\nAcme, edited by me\n`;
  const { root, opts } = agentsSetup(tmp, mine);
  const a = find(planUpgrade(root, opts), 'AGENTS.md');
  assert.equal(a.kind, 'replace');
  assert.equal(a.policy, 'managed-block');
  assert.equal(a.current, mine);
  assert.equal(a.next, `# My guide\n\nmy intro\n\n${block('## 0. Rules\nrules v2')}\n\n## 1. Identity\nAcme, edited by me\n`);
}));

test('AGENTS.md without markers gets the block before the first ## heading, or at the end', () => withTmp(async (tmp) => {
  const { root, opts } = agentsSetup(tmp, '# Old guide\nintro\n\n## 1. Identity\nAcme\n');
  assert.equal(find(planUpgrade(root, opts), 'AGENTS.md').next, `# Old guide\nintro\n\n${block('## 0. Rules\nrules v2')}\n\n---\n\n## 1. Identity\nAcme\n`);
  const { root: r2, opts: o2 } = agentsSetup(path.join(tmp, 'two'), '# No headings\nAcme');
  assert.equal(find(planUpgrade(r2, o2), 'AGENTS.md').next, `# No headings\nAcme\n\n${block('## 0. Rules\nrules v2')}\n`);
}));

test('AGENTS.md apply writes the real file with a .bak and leaves adapter symlinks intact', () => withTmp((tmp) => {
  const mine = `# Mine\n\n${block('rules v1')}\n`;
  const { root, opts } = agentsSetup(tmp, mine);
  fs.symlinkSync('AGENTS.md', path.join(root, 'CLAUDE.md'));
  const res = applyUpgrade(root, planUpgrade(root, opts));
  assert.ok(res.replaced.some((r) => r.path === 'AGENTS.md' && r.backup === 'AGENTS.md.bak'));
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md.bak'), 'utf8'), mine);
  assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /rules v2/);
  assert.ok(fs.lstatSync(path.join(root, 'CLAUDE.md')).isSymbolicLink());
  assert.equal(fs.readlinkSync(path.join(root, 'CLAUDE.md')), 'AGENTS.md');
  assert.equal(find(planUpgrade(root, opts), 'AGENTS.md'), undefined, 'idempotent after apply');
}));

test('AGENTS.md is skipped when it is a symlink, has init placeholders, has a .bak, or has broken markers', () => withTmp((tmp) => {
  const reason = (dir, agents, extra) => {
    const { root, opts } = agentsSetup(path.join(tmp, dir), agents, extra);
    return find(planUpgrade(root, opts), 'AGENTS.md');
  };
  assert.equal(reason('ph', '# {{COMPANY_NAME}}\n').reason, 'placeholder');
  assert.equal(reason('bak', '# old\n', { 'AGENTS.md.bak': 'keep' }).reason, 'backup-exists');
  assert.equal(reason('broken', `# x\n${START}\nno end\n`).reason, 'managed-markers-invalid');
  assert.equal(reason('reversed', `# x\n${END}\n${START}\n`).reason, 'managed-markers-invalid');
  const { root, opts } = agentsSetup(path.join(tmp, 'link'), 'unused');
  fs.rmSync(path.join(root, 'AGENTS.md'));
  fs.writeFileSync(path.join(root, 'REAL.md'), '# real\n');
  fs.symlinkSync('REAL.md', path.join(root, 'AGENTS.md'));
  assert.equal(find(planUpgrade(root, opts), 'AGENTS.md').reason, 'symlink');
}));

test('AGENTS.md is not planned when the template has no managed block or the brain has no AGENTS.md', () => withTmp((tmp) => {
  const { root, opts } = agentsSetup(tmp, 'unused');
  fs.rmSync(path.join(root, 'AGENTS.md'));
  assert.equal(find(planUpgrade(root, opts), 'AGENTS.md'), undefined);
}));

test('real templates: the AGENTS.md managed block has no placeholders and is restored after removal', () => withTmp((tmp) => {
  const root = path.join(tmp, 'fresh');
  initBrain(root, { areas: ['sales'] });
  const agentsPath = path.join(root, 'AGENTS.md');
  const fresh = fs.readFileSync(agentsPath, 'utf8');
  assert.ok(fresh.includes(START) && fresh.includes(END), 'template ships the managed markers');
  fs.writeFileSync(agentsPath, fresh.slice(0, fresh.indexOf(START)) + fresh.slice(fresh.indexOf(END) + END.length));
  const realOpts = { templatesBaseDir: TEMPLATES_BASE_DIR, templatesAreasDir: TEMPLATES_AREAS_DIR };
  const plan = planUpgrade(root, realOpts);
  assert.deepEqual(plan.actions.map((a) => [a.path, a.kind]), [['AGENTS.md', 'replace']]);
  applyUpgrade(root, plan);
  const freshBlock = fresh.slice(fresh.indexOf(START), fresh.indexOf(END) + END.length);
  assert.ok(fs.readFileSync(agentsPath, 'utf8').includes(freshBlock), 'managed block restored');
  assert.ok(fs.existsSync(`${agentsPath}.bak`));
  assert.deepEqual(planUpgrade(root, realOpts).actions, []);
}));
