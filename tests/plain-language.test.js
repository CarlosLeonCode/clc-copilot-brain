// User-facing flows (call, retro, flow, brain menu, sales system map) must speak plain language:
// non-technical people never see internal IDs, field names, file paths, Mermaid or jargon unless they ask.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrompt } from '../src/mcp/prompts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const skillCopies = (name) => [`skills/${name}`, `templates/base/skills/${name}`, `templates/areas/sales/skills/${name}`];
const cmdCopies = (name) => [`.claude/commands/${name}`, `templates/base/.claude/commands/${name}`];
const promptText = (name) => getPrompt(name, {}).messages[0].content.text;

test('call analyzer asks only missing essentials, confirms in one plain sentence and hides internals', () => {
  for (const rel of skillCopies('skill_call_analyzer.md')) {
    const text = read(rel);
    assert.match(text, /at most[^\n]*missing essentials/i, `${rel}: ask only missing essentials`);
    assert.match(text, /one at a time/i, rel);
    assert.match(text, /infer[^\n]*(guide|play)/i, `${rel}: infer play and branch`);
    assert.match(text, /ONE plain sentence/, rel);
    assert.match(text, /¿Lo guardo\?/, rel);
    assert.match(text, /full log only if/i, rel);
    assert.match(text, /never say "HITL"/i, rel);
    assert.match(text, /^gate_advanced: /m, `${rel}: canonical fields still written`);
  }
  for (const text of [...cmdCopies('call.md').map(read), promptText('call')]) {
    assert.match(text, /ONE plain sentence/);
    assert.match(text, /¿Lo guardo\?/);
    assert.match(text, /gate_advanced/);
    assert.doesNotMatch(text, /Present a \*\*Human-in-the-Loop/);
  }
});

test('retro report opens with a 3-point summary and yes/no changes; details go to an optional appendix', () => {
  for (const rel of skillCopies('skill_monthly_retrospective.md')) {
    const text = read(rel);
    const summary = text.indexOf('This month in 3 points');
    const changes = text.indexOf('Changes I suggest');
    const appendix = text.indexOf('Appendix');
    assert.ok(summary > 0 && changes > summary && appendix > changes, `${rel}: summary, then changes, then appendix`);
    assert.match(text, /only if (the person )?asks/i, `${rel}: appendix shown only if asked`);
    const userFacing = text.slice(summary, appendix);
    for (const banned of [/mermaid/i, /Archify/i, /Gate Advanced/i, /Drop-off Branch/i, /`/]) {
      assert.doesNotMatch(userFacing, banned, `${rel}: user-facing part must not contain ${banned}`);
    }
    assert.match(userFacing, /Want me to/, `${rel}: changes are yes/no questions`);
  }
  for (const text of [...cmdCopies('retro.md').map(read), promptText('retro')]) {
    assert.match(text, /This month in 3 points/);
    assert.match(text, /Changes I suggest/);
  }
});

test('flow offers a plain menu and keeps routing internal', () => {
  for (const text of [...cmdCopies('flow.md').map(read), promptText('flow')]) {
    assert.match(text, /see how your sales process works/i);
    assert.match(text, /improve a call guide/i);
    assert.match(text, /drawing or photo/i);
    assert.doesNotMatch(text, /check exit criteria for a deal stage, review a conversation play, or update a flow diagram/i);
  }
});

test('brain menu is plain and by area, without maintenance commands', () => {
  for (const rel of cmdCopies('brain.md')) {
    const text = read(rel);
    assert.match(text, /What I can help with/i);
    assert.match(text, /check or update your brain if you ask/i);
    assert.doesNotMatch(text, /\/brain:doctor|\/brain:add-area/);
  }
});

test('sales system map starts in plain language and moves the stage table to an AI section', () => {
  const text = read('templates/areas/sales/system.md');
  const plain = text.indexOf('How your sales system works');
  const ai = text.indexOf('For your AI assistant');
  assert.ok(plain > 0 && ai > plain, 'plain section first, AI section after');
  const people = text.slice(plain, ai);
  assert.match(people, /before each call/i);
  assert.match(people, /after each call/i);
  assert.match(people, /once a month/i);
  assert.doesNotMatch(people, /\bgates?\b|\bplays?\b|stages:|`|\|/i, 'plain section must avoid jargon, code and tables');
  assert.ok(text.indexOf('| 1. ') > ai, 'stage table lives in the AI section');
});
