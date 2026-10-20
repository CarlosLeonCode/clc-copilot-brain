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
    for (const target of ['skills/skill_call_analyzer.md', 'skills/skill_monthly_retrospective.md', 'skills/skill_brain_onboarding.md', '.agents/skills/flow/SKILL.md']) {
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

test('both AGENTS.md files say slash commands are optional, from one skill source, in every assistant', () => {
  for (const rel of FILES) {
    const text = read(rel);
    const lines = text.split('\n').filter((l) => /slash command/i.test(l));
    assert.ok(lines.length > 0, `${rel} must mention slash commands`);
    assert.doesNotMatch(text, /Claude Code only|work only in Claude Code/i, `${rel} must not limit slash commands to Claude Code`);
    assert.match(text, /Never tell people they need a slash command/);
    assert.match(text, /\.agents\/skills\/<name>\/SKILL\.md/, `${rel} must name the single skill source`);
    assert.doesNotMatch(text, /\.claude\/commands/, `${rel} must not point to the removed .claude/commands`);
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
    '.agents/skills/flow/SKILL.md': read('.agents/skills/flow/SKILL.md'),
    'templates/base/.agents/skills/flow/SKILL.md': read('templates/base/.agents/skills/flow/SKILL.md'),
    'src/mcp/prompts.js flow': flowPrompt,
    '.agents/skills/retro/SKILL.md': read('.agents/skills/retro/SKILL.md'),
    'templates/base/.agents/skills/retro/SKILL.md': read('templates/base/.agents/skills/retro/SKILL.md'),
    'skills/skill_monthly_retrospective.md': read('skills/skill_monthly_retrospective.md'),
    'templates/base/skills/skill_monthly_retrospective.md': read('templates/base/skills/skill_monthly_retrospective.md'),
    'templates/areas/sales/skills/skill_monthly_retrospective.md': read('templates/areas/sales/skills/skill_monthly_retrospective.md')
  };
  for (const [name, text] of Object.entries(sources)) {
    assert.match(text, /clc-brain view/, `${name} must refresh the page with clc-brain view`);
    assert.match(text, /HITL|Human-in-the-Loop/i, `${name} must keep its HITL checkpoint`);
  }
  assert.match(sources['.agents/skills/flow/SKILL.md'], /offer to open/i);
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
    assert.match(row, /\.agents\/skills\/flow\/SKILL\.md/);
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
    assert.match(text, /in a language other than the brain's language \(for example in an older brain\), offer once to translate them; translate only after a yes, then refresh the sales page \(`clc-brain view`\)/);
    assert.match(text, /put my brain in Spanish/i);
    assert.match(text, /pon mi cerebro en español/i);
    assert.match(text, /cambia el idioma/i);
  }
});

test('onboarding asks for the language first when it is not set and stores it', () => {
  for (const rel of ['skills/skill_brain_onboarding.md', 'templates/base/skills/skill_brain_onboarding.md', '.agents/skills/brain-onboarding/SKILL.md', 'templates/base/.agents/skills/brain-onboarding/SKILL.md']) {
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

test('onboarding marks the brain as set up after approval, then shows a short menu', () => {
  for (const rel of ['skills/skill_brain_onboarding.md', 'templates/base/skills/skill_brain_onboarding.md', '.agents/skills/brain-onboarding/SKILL.md', 'templates/base/.agents/skills/brain-onboarding/SKILL.md']) {
    const text = read(rel);
    assert.match(text, /`setup\.completed`[^\n]*`true`/, `${rel} must set setup.completed to true`);
    assert.match(text, /`(setup\.)?completedAt`/, `${rel} must record completedAt`);
    assert.match(text, /approv[^\n]*summary|summary[^\n]*approv/i, `${rel} marks setup only after the summary is approved`);
    assert.match(text, /3[–-]6 (things|items)/, `${rel} must close with a short menu of 3-6 things`);
    assert.match(text, /brain's language/i, `${rel} must show the menu in the brain language`);
  }
});

test('both AGENTS.md files guide people on first contact (setup offer, or a short menu once set up)', () => {
  for (const rel of FILES) {
    const text = read(rel);
    const section0 = text.slice(text.indexOf('## 0.'), text.indexOf('### Talking to people'));
    assert.match(section0, /### First contact/, `${rel} opens section 0 with the first contact rule`);
    assert.match(section0, /`setup`/, `${rel} reads org-kernel.json setup`);
    assert.match(section0, /default company name/i);
    assert.match(section0, /even "hi"\s*\/\s*"hola"/i);
    assert.match(section0, /"Shall we set it up\? It takes about 10 minutes"/);
    assert.match(section0, /"¿Lo configuramos ahora\? Toma unos 10 minutos"/);
    assert.match(section0, /skills\/skill_brain_onboarding\.md/);
    assert.match(section0, /offer setup once at the end/i);
    assert.match(section0, /3[–-]6 things/);
    assert.match(section0, /more than once per conversation/i);
    const row = text.split('\n').find((l) => l.startsWith('|') && /"hi" \/ "hola"/i.test(l)) || '';
    for (const phrase of [/"help"/i, /"ayuda"/i, /"what now\?"/i, /"¿y ahora qué\?"/i]) assert.match(row, phrase, `${rel} intent row needs ${phrase}`);
    assert.match(row, /first contact/i);
  }
});

test('AGENTS.md no longer points to npx and says which tools read it', () => {
  for (const rel of FILES) {
    const text = read(rel);
    assert.doesNotMatch(text, /npx -y @clc\/copilot-brain/, `${rel}: the package is not on npm`);
    assert.match(text, /If `clc-brain` isn't available, tell the person in one plain sentence that the setup person needs to install it \(see the README's "Get started" section\), and carry on with what you can do without it\./);
    const intro = text.split('\n').find((l) => l.startsWith('Most people who use this brain')) || '';
    assert.doesNotMatch(intro, /ChatGPT, Gemini\)/, `${rel}: web chats cannot read AGENTS.md`);
    assert.match(intro, /skills\/integrations/, `${rel}: web chats use the integration guides`);
  }
});

test('READMEs say the assistant guides you from the first hi and that clc-brain alone shows the next step', () => {
  const en = read('README.md');
  const es = read('README.es.md');
  assert.match(en.slice(0, en.indexOf('<details>')), /first "hi"/i);
  assert.match(es.slice(0, es.indexOf('<details>')), /primer "hola"/i);
  assert.match(en, /Run `clc-brain` on its own[^\n]*where you are[^\n]*next/i);
  assert.match(es, /Ejecuta `clc-brain` solo[^\n]*dónde estás[^\n]*siguiente/i);
  const tech = read('TECHNICAL.md');
  assert.match(tech, /`setup`/);
  assert.match(tech, /start screen/i);
});
