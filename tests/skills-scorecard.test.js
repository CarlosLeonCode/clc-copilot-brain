// The call analyzer skill, its slash command copies and the retro skill must agree with src/core/scorecard.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIMENSIONS, COUNT_KEYS, STATUSES, NOT_ENOUGH } from '../src/core/scorecard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const analyzers = ['skills', 'templates/base/skills', 'templates/areas/sales/skills'].map((d) => `${d}/skill_call_analyzer.md`);
const retros = ['skills', 'templates/base/skills', 'templates/areas/sales/skills'].map((d) => `${d}/skill_monthly_retrospective.md`);
const callCommands = ['.agents/skills/call/SKILL.md', 'templates/base/.agents/skills/call/SKILL.md', '.claude/skills/call/SKILL.md'];
const retroCommands = ['.agents/skills/retro/SKILL.md', 'templates/base/.agents/skills/retro/SKILL.md', '.claude/skills/retro/SKILL.md'];

test('every analyzer copy writes each dimension as score_<id>: and no other score_ key', () => {
  for (const rel of [...analyzers, ...callCommands]) {
    const text = read(rel);
    const found = new Set(text.match(/\bscore_[a-z][a-z_]*/g) ?? []);
    if (analyzers.includes(rel)) for (const id of DIMENSIONS) assert.match(text, new RegExp(`^score_${id}: `, 'm'), `${rel}: score_${id}`);
    for (const key of found) assert.ok(DIMENSIONS.includes(key.slice(6)), `${rel}: unknown key ${key}`);
  }
});

test('analyzer copies name the status values, count keys, qualification keys and the quote rules', () => {
  for (const rel of analyzers) {
    const text = read(rel);
    for (const word of [...STATUSES, NOT_ENOUGH, ...Object.values(COUNT_KEYS)]) assert.ok(text.includes(word), `${rel}: ${word}`);
    assert.match(text, /^scorecard_status: /m, rel);
    assert.match(text, /qual_<criterion>/, rel);
    assert.match(text, /qualification-matrix\.md/, rel);
    assert.match(text, /never invent (a )?quotes?/i, rel);
    assert.match(text, /never compute averages/i, rel);
    assert.match(text, /estimate/i, rel);
  }
});

test('call command copies tell the assistant to score the call and stay in plain words', () => {
  for (const rel of callCommands) assert.match(read(rel), /score the call/i, rel);
});

test('retro copies read scores from stats, respect sample rules and coach only below 3 with 5+ scored calls', () => {
  for (const rel of [...retros, ...retroCommands]) {
    const text = read(rel);
    assert.match(text, /clc-brain stats/, rel);
    assert.match(text, /call scores/i, rel);
  }
  for (const rel of retros) {
    const text = read(rel);
    assert.match(text, /below 3/, rel);
    assert.match(text, /at least 5 scored calls/, rel);
    assert.match(text, /only after (the person says )?yes/i, rel);
  }
});
