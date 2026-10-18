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

test('the "here is my sales flow" intent imports, previews and waits for approval', () => {
  const rows = FILES.map((rel) => read(rel).split('\n').find((l) => /here's my sales flow/i.test(l)) || '');
  for (const row of rows) {
    assert.match(row, /te paso mi diagrama/i);
    assert.match(row, /preview/i);
    assert.match(row, /\.claude\/commands\/flow\.md/);
  }
  assert.equal(rows[0], rows[1], 'root and template rows stay identical');
});

test('"how are we doing" runs stats and explains it in plain words; "classify my old calls" proposes before writing', () => {
  const rowOf = (text, re) => text.split('\n').find((l) => l.startsWith('|') && re.test(l)) || '';
  const rows = FILES.map((rel) => [rowOf(read(rel), /how are we doing/i), rowOf(read(rel), /classify my old calls/i)]);
  for (const [doing, classify] of rows) {
    for (const phrase of [/how are we doing\?/i, /¿cómo vamos\?/i, /what's working\?/i, /¿qué está funcionando\?/i]) assert.match(doing, phrase);
    assert.match(doing, /clc-brain stats/);
    assert.match(doing, /--json/);
    assert.match(doing, /plain words/i);
    assert.match(doing, /offer to open/i);
    assert.match(doing, /clc-brain view --open/);
    assert.match(classify, /classify my old calls/i);
    assert.match(classify, /clasifica mis llamadas viejas/i);
    assert.match(classify, /type of sale/i);
    assert.match(classify, /goal met/i);
    assert.match(classify, /only after (they|the person) says? yes/i);
    assert.match(classify, /clc-brain view/);
  }
  assert.equal(rows[0][0], rows[1][0], 'root and template stats rows stay identical');
  assert.equal(rows[0][1], rows[1][1], 'root and template classify rows stay identical');
});

test('web chatbot integrations log type of sale, lead source, deal and goal met', () => {
  for (const name of ['CHATGPT_CUSTOM_GPT.md', 'GEMINI_GEM.md', 'CLAUDE_PROJECT.md']) {
    const text = read(`skills/integrations/${name}`);
    for (const key of ['motion', 'lead_source', 'deal_id', 'goal_met']) assert.match(text, new RegExp(`^${key}: `, 'm'), `${name} needs ${key}`);
    assert.match(text, /type of sale[^\n]*lead source/i, `${name} confirms the type of sale and lead source in the sentence`);
  }
});

test('READMEs say the sales page shows what is working and list the stats command', () => {
  const en = read('README.md');
  const es = read('README.es.md');
  assert.match(en, /what's working[^\n]*type of sale[^\n]*call guide[^\n]*person/i);
  assert.match(en, /Ask: ?\*?"How are we doing\?"/);
  assert.match(es, /qué está funcionando[^\n]*tipo de venta[^\n]*guía de llamada[^\n]*persona/i);
  assert.match(es, /Pregunta: ?\*?"¿Cómo vamos\?"/);
  assert.ok(en.includes('`clc-brain stats [folder] [--month YYYY-MM] [--json]`'));
  assert.ok(es.includes('`clc-brain stats [carpeta] [--month YYYY-MM] [--json]`'));
});

test('both AGENTS.md files use the brain language and know how to change it', () => {
  for (const rel of FILES) {
    const text = read(rel);
    assert.match(text, /in the brain's language \(org-kernel\.json `language`; default English\)/, `${rel} needs the brain language rule`);
    assert.match(text, /call log prose, guides, summaries/i);
    assert.match(text, /offer once to translate them; translate only after a yes, then refresh the sales page \(`clc-brain view`\)/);
    assert.match(text, /put my brain in Spanish/i);
    assert.match(text, /pon mi cerebro en español/i);
    assert.match(text, /cambia el idioma/i);
  }
});

test('onboarding asks for the language first when it is not set and stores it', () => {
  for (const rel of ['skills/skill_brain_onboarding.md', 'templates/base/skills/skill_brain_onboarding.md', '.claude/commands/brain:onboarding.md', 'templates/base/.claude/commands/brain:onboarding.md']) {
    const text = read(rel);
    assert.match(text, /Step 0[^\n]*Language/i, `${rel} needs a language step`);
    assert.match(text, /`language`/, `${rel} must store the language in org-kernel.json`);
    assert.match(text, /only if[^\n]*not set|if[^\n]*not set yet/i, `${rel} asks only when the language is missing`);
  }
});

test('READMEs say the brain works in English and Spanish and document --language', () => {
  const en = read('README.md');
  const es = read('README.es.md');
  assert.ok(en.includes('Works in English and Spanish'));
  assert.ok(es.includes('Funciona en español e inglés'));
  assert.match(en, /--language es/);
  assert.match(es, /--language es/);
  assert.match(en, /page follows the brain('s)? language/i);
  assert.match(es, /página[^\n]*idioma del cerebro/i);
  const tech = read('TECHNICAL.md');
  assert.match(tech, /i18n\.js/);
  assert.match(tech, /`language`/);
});
