import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { repairBrain, runDoctor } from '../../src/core/doctor.js';
import { initBrain } from '../../src/core/scaffold.js';
import { withTmp, writeFiles } from './helpers.js';

test('runDoctor reports a fresh scaffold as healthy', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales', 'operations'], demo: true });
    const result = runDoctor(dir);
    assert.deepEqual(result.issues, []);
    assert.equal(result.healthy, true);
    assert.equal(result.checksPassed, result.passed.length);
    assert.ok(result.passed.includes('Active area "operations" verified on disk.'));
    assert.ok(result.passed.some((m) => m.startsWith('SOP schema validated: operations/sops/')));
  }));

test('runDoctor reports missing kernel and AGENTS.md as errors', () =>
  withTmp((dir) => {
    const result = runDoctor(dir);
    assert.equal(result.healthy, false);
    assert.ok(result.issues.some((i) => i.level === 'error' && /Missing org-kernel\.json/.test(i.message)));
    assert.ok(result.issues.some((i) => i.level === 'error' && /Missing AGENTS\.md/.test(i.message)));
  }));

test('runDoctor flags invalid schema assets, wrong symlinks and missing areas', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, { 'sales/objections/bad.json': '{"id":"bad"}', 'sales/battlecards/broken.json': '{nope' });
    fs.unlinkSync(path.join(dir, 'GEMINI.md'));
    fs.symlinkSync('company-profile.md', path.join(dir, 'GEMINI.md'));
    const kernel = JSON.parse(fs.readFileSync(path.join(dir, 'org-kernel.json'), 'utf8'));
    kernel.activeAreas.push('ghost');
    fs.writeFileSync(path.join(dir, 'org-kernel.json'), JSON.stringify(kernel));

    const messages = runDoctor(dir).issues.map((i) => i.message);
    assert.ok(messages.some((m) => m.startsWith('Objection sales/objections/bad.json invalid')));
    assert.ok(messages.some((m) => m.startsWith('Corrupted JSON in sales/battlecards/broken.json')));
    assert.ok(messages.includes('Adapter GEMINI.md symlink points to "company-profile.md", expected "AGENTS.md"'));
    assert.ok(messages.includes('Active area "ghost" declared in org-kernel.json but directory missing.'));
  }));

test('repairBrain restores adapters, commands and skills without touching regular adapter files', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    fs.unlinkSync(path.join(dir, '.cursorrules'));
    fs.unlinkSync(path.join(dir, '.claude', 'commands', 'call.md'));
    fs.unlinkSync(path.join(dir, 'skills', 'skill_brain_doctor.md'));
    fs.unlinkSync(path.join(dir, 'CLAUDE.md'));
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'hand-written');

    const { skills } = repairBrain(dir);
    assert.deepEqual(skills, ['skill_brain_doctor.md']);
    assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'hand-written');
    assert.equal(fs.existsSync(path.join(dir, 'CLAUDE.md.bak')), false);
    assert.equal(runDoctor(dir).healthy, true);
  }));
