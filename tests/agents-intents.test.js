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

test('both AGENTS.md files open the sales system page on request and refresh it after approved changes', () => {
  for (const rel of FILES) {
    const text = read(rel);
    for (const phrase of [/show me my sales process/i, /muéstrame mi proceso de ventas/i, /quiero ver mis flujos/i]) {
      assert.match(text, phrase, `${rel} is missing intent phrase ${phrase}`);
    }
    assert.match(text, /clc-brain view --open/, `${rel} must open the page with clc-brain view --open`);
    assert.match(text, /sales-system\.html/, `${rel} must offer the existing page when the CLI is missing`);
    assert.match(text, /refresh[^\n]*clc-brain view/i, `${rel} must refresh the page after approved changes`);
  }
});

test('flow and retro procedures refresh the sales system page after an approved change', async () => {
  const { getPrompt } = await import('../src/mcp/prompts.js');
  const flowPrompt = getPrompt('flow', {}).messages[0].content.text;
  const sources = {
    '.claude/commands/flow.md': read('.claude/commands/flow.md'),
    'templates/base/.claude/commands/flow.md': read('templates/base/.claude/commands/flow.md'),
    'src/mcp/prompts.js flow': flowPrompt,
    '.claude/commands/retro.md': read('.claude/commands/retro.md'),
    'templates/base/.claude/commands/retro.md': read('templates/base/.claude/commands/retro.md'),
    'skills/skill_monthly_retrospective.md': read('skills/skill_monthly_retrospective.md'),
    'templates/base/skills/skill_monthly_retrospective.md': read('templates/base/skills/skill_monthly_retrospective.md'),
    'templates/areas/sales/skills/skill_monthly_retrospective.md': read('templates/areas/sales/skills/skill_monthly_retrospective.md')
  };
  for (const [name, text] of Object.entries(sources)) {
    assert.match(text, /clc-brain view/, `${name} must refresh the page with clc-brain view`);
    assert.match(text, /HITL|Human-in-the-Loop/i, `${name} must keep its HITL checkpoint`);
  }
  assert.match(sources['.claude/commands/flow.md'], /offer to open/i);
  assert.match(flowPrompt, /offer to open/i);
});

test('the sales system map tells people how to see it', () => {
  const plain = read('templates/areas/sales/system.md').split('## For your AI assistant')[0];
  assert.match(plain, /Want to see it\? Ask your assistant: "Show me my sales process"\./);
});
