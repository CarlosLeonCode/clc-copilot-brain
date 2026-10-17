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

const playWarnings = (dir) => runDoctor(dir).issues.filter((i) => i.level === 'warning');

test('doctor warns on a play missing gate_unlocked naming file and key, errors unchanged (S12.1)', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'plays', 'cold-call.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^gate_unlocked:.*\n/m, ''));
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.equal(result.warnings, 1);
    assert.equal(result.issues[0].level, 'warning');
    assert.match(result.issues[0].message, /cold-call\.md/);
    assert.match(result.issues[0].message, /gate_unlocked/);
  }));

test('doctor emits no play warnings for the starter plays (S12.2)', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    assert.deepEqual(runDoctor(dir).issues, []);
  }));

test('doctor accepts a play with legacy single stage: (S12.3)', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'plays', 'cold-call.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^stages:/m, 'stage:'));
    assert.deepEqual(runDoctor(dir).issues, []);
  }));

test('doctor warns when sales/system.md is missing', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    fs.rmSync(path.join(dir, 'sales', 'system.md'));
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.ok(playWarnings(dir).some((i) => /sales\/system\.md/.test(i.message)));
  }));

test('doctor warns when sales/plays has no plays', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    fs.rmSync(path.join(dir, 'sales', 'plays'), { recursive: true });
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.ok(playWarnings(dir).some((i) => /plays/.test(i.message)));
  }));

test('doctor warns when pipeline-stages.md holds a conversation decision tree', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'stages', 'pipeline-stages.md');
    fs.appendFileSync(file, '\n```mermaid\nflowchart TD\n  A[Open] --> B{Interested?}\n```\n');
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.ok(playWarnings(dir).some((i) => /sales\/plays/.test(i.message) && /pipeline-stages/.test(i.message)));
  }));

test('doctor skips sales play checks when sales is not active', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['operations'] });
    assert.deepEqual(runDoctor(dir).issues, []);
  }));

test('doctor warns in plain words when a call guide diagram cannot be drawn', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'plays', 'cold-call.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('B1{"Opener: permission-based hook"}', 'B1{"Opener: permission-based hook"'));
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.ok(playWarnings(dir).some((i) => i.message === "The cold call guide's diagram can't be drawn; ask your assistant to fix it."));
  }));

test('doctor warns when a call guide has no diagram', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'plays', 'follow-up.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/```mermaid[\s\S]*?```/, ''));
    assert.equal(runDoctor(dir).errors, 0);
    assert.ok(playWarnings(dir).some((i) => i.message === 'The follow-up guide has no diagram; ask your assistant to draw one.'));
  }));

test('doctor warns when the pipeline diagram is missing or cannot be drawn', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'stages', 'pipeline-stages.md');
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, original.replace('flowchart LR', 'flowchart LR\n    S9["oops --> S1'));
    assert.ok(playWarnings(dir).some((i) => i.message === "The pipeline diagram can't be drawn; ask your assistant to fix it."));
    fs.writeFileSync(file, original.replace(/```mermaid[\s\S]*?```/, ''));
    assert.ok(playWarnings(dir).some((i) => i.message === 'The pipeline has no diagram; ask your assistant to draw one.'));
    assert.equal(runDoctor(dir).errors, 0);
  }));

test('a fresh sales scaffold draws every diagram: no doctor warnings', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], demo: true });
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.equal(result.warnings, 0);
  }));
