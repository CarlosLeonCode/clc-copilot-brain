// AGENTS.md (root and template) must work for non-technical people in any AI tool:
// plain-language intents (EN + ES), a user-facing language rule, and no false slash-command claims.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['AGENTS.md', 'templates/base/AGENTS.md'];
const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

test('both AGENTS.md files map plain requests (English and Spanish) to procedures', () => {
  for (const rel of FILES) {
    const text = read(rel);
    assert.match(text, /What people ask/i, `${rel} needs the intents table`);
    for (const phrase of [
      /what can you do\?/i, /¿qué puedes hacer\?/i,
      /log this call/i, /registra esta llamada/i,
      /how did this month go\?/i, /¿cómo me fue este mes\?/i,
      /mejoremos el guion/i, /este es mi flujo/i,
      /el cliente dice que es caro/i, /how do we beat/i,
      /set up my brain/i, /configuremos/i,
      /check my brain/i, /update my brain/i, /revisa/i, /actualiza/i
    ]) assert.match(text, phrase, `${rel} is missing intent phrase ${phrase}`);
    for (const target of ['skills/skill_call_analyzer.md', 'skills/skill_monthly_retrospective.md', 'skills/skill_brain_onboarding.md', '.claude/commands/flow.md']) {
      assert.ok(text.includes(target), `${rel} must route to ${target}`);
    }
    assert.match(text, /clc-brain doctor/);
    assert.match(text, /clc-brain upgrade --dry-run/);
    assert.match(text, /--yes[^\n]*only after/i, `${rel} must run --yes only after the person agrees`);
  }
});

test('both AGENTS.md files carry the plain-language rule for talking to people', () => {
  for (const rel of FILES) {
    const text = read(rel);
    assert.match(text, /Talking to people/);
    assert.match(text, /plain, friendly/i);
    assert.match(text, /never show internal IDs/i);
    assert.match(text, /HITL/);
    assert.match(text, /the cold call guide/i);
    assert.match(text, /ONE plain sentence/);
    assert.match(text, /¿Lo guardo\?/);
    assert.match(text, /one question at a time/i);
    assert.match(text, /language the person/i);
    assert.doesNotMatch(text, /Engineer-to-Engineer/);
  }
});

test('no AGENTS.md claims slash commands work outside Claude Code', () => {
  for (const rel of FILES) {
    const lines = read(rel).split('\n').filter((l) => /slash command/i.test(l));
    assert.ok(lines.some((l) => /only[^\n]*Claude Code|Claude Code only/i.test(l)), `${rel} must say slash commands are Claude Code only`);
    for (const line of lines) {
      assert.doesNotMatch(line, /Cursor|Antigravity|Windsurf|Gemini/, `${rel} falsely claims slash commands elsewhere: ${line}`);
    }
  }
});

test('root and template AGENTS.md share the same managed assistant-rules block', () => {
  const blockOf = (text) => text.slice(text.indexOf('<!-- copilot-brain:managed:start -->'), text.indexOf('<!-- copilot-brain:managed:end -->'));
  const [root, base] = FILES.map(read);
  assert.ok(blockOf(base).length > 200, 'template must wrap the rules in managed markers');
  assert.equal(blockOf(root), blockOf(base));
});
