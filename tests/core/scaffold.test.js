import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { initBrain, restoreAgentSkills, setupIdeAdapters, fallbackAdapterContent } from '../../src/core/scaffold.js';
import { expectedAssets } from '../../src/core/manifest.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

test('initBrain scaffolds kernel, adapters, skills, shortcuts and selected areas without demo data', () =>
  withTmp((dir) => {
    const { areas } = initBrain(dir, { companyName: 'Core Co', areas: ['sales'] });
    assert.deepEqual(areas, ['sales']);
    const kernel = JSON.parse(fs.readFileSync(path.join(dir, 'org-kernel.json'), 'utf8'));
    assert.equal(kernel.organization.name, 'Core Co');
    assert.equal(fs.readlinkSync(path.join(dir, 'CLAUDE.md')), 'AGENTS.md');
    for (const name of expectedAssets().agentSkills) {
      assert.ok(fs.existsSync(path.join(dir, '.agents', 'skills', name, 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', name, 'SKILL.md')));
    }
    assert.equal(fs.existsSync(path.join(dir, '.claude', 'commands')), false);
    assert.ok(fs.existsSync(path.join(dir, 'playbooks', '01-SALES-PLAYBOOK.md')));
    assert.equal(fs.existsSync(path.join(dir, 'sales', 'objections', 'pricing-too-high.json')), false);
    const callsEntries = fs.readdirSync(path.join(dir, 'sales', 'calls'));
    assert.deepEqual(callsEntries.filter((e) => /^\d{4}-\d{2}$/.test(e)), [], 'clean mode must not create dated demo call dirs');
  }));

test('initBrain rejects area ids outside the id pattern before writing', () =>
  withTmp((dir) => {
    const target = path.join(dir, 'brain');
    assert.throws(() => initBrain(target, { areas: ['sales', '../base'] }), (err) => err instanceof BrainError && err.code === 'INVALID_AREA_ID');
    assert.equal(fs.existsSync(target), false);
  }));

test('setupIdeAdapters backs up a regular adapter file to <name>.bak and reports it', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'AGENTS.md': '# SSOT', 'CLAUDE.md': 'custom rules' });
    const results = setupIdeAdapters(dir);
    const claude = results.find((r) => r.adapter === 'CLAUDE.md');
    assert.equal(claude.status, 'backed_up');
    assert.equal(claude.backup, 'CLAUDE.md.bak');
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md.bak'), 'utf8'), 'custom rules');
    assert.equal(fs.readlinkSync(path.join(dir, 'CLAUDE.md')), 'AGENTS.md');
  }));

test('setupIdeAdapters never overwrites an existing backup and leaves the file untouched', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'AGENTS.md': '# SSOT', 'CLAUDE.md': 'new', 'CLAUDE.md.bak': 'old backup' });
    const claude = setupIdeAdapters(dir).find((r) => r.adapter === 'CLAUDE.md');
    assert.equal(claude.status, 'skipped');
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'new');
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md.bak'), 'utf8'), 'old backup');
  }));

test('setupIdeAdapters keeps regular files when backups are disabled and keeps its own fallback stub', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'AGENTS.md': '# SSOT', 'CLAUDE.md': 'mine', 'GEMINI.md': fallbackAdapterContent('GEMINI.md') });
    const results = setupIdeAdapters(dir, { backupRegularFiles: false });
    assert.equal(results.find((r) => r.adapter === 'CLAUDE.md').status, 'kept');
    assert.equal(results.find((r) => r.adapter === 'GEMINI.md').status, 'fallback_file');
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'mine');
    assert.equal(fs.existsSync(path.join(dir, 'CLAUDE.md.bak')), false);
  }));

test('restoreAgentSkills copies every skill folder found in the templates', () =>
  withTmp((dir) => {
    const templates = path.join(dir, 'templates');
    const brain = path.join(dir, 'brain');
    writeFiles(templates, { '.agents/skills/custom-cmd/SKILL.md': '# /custom', '.agents/skills/notes.txt': 'ignored' });
    writeFiles(brain, { 'AGENTS.md': '# SSOT' });
    assert.deepEqual(restoreAgentSkills(brain, { templatesBaseDir: templates }), ['custom-cmd']);
    assert.ok(fs.existsSync(path.join(brain, '.agents', 'skills', 'custom-cmd', 'SKILL.md')));
    assert.deepEqual(restoreAgentSkills(brain, { templatesBaseDir: templates }), []);
  }));

test('expectedAssets derives skills from templates/base', () => {
  const assets = expectedAssets();
  for (const name of ['brain', 'brain-sales', 'brain-onboarding', 'brain-doctor', 'brain-add-area', 'call', 'flow', 'retro', 'brain-search', 'sales-assist', 'sop-auditor']) {
    assert.ok(assets.agentSkills.includes(name), name);
  }
  assert.equal(assets.commands, undefined);
  assert.equal(assets.rootSkills.length, 6);
});
