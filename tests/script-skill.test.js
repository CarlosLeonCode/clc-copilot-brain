// The `script` skill ships the METHOD for sales scripts, glossary upkeep and industry packs (no content).
// Content tests: the skill, its mirrors, the AGENTS managed block intents and the routing of "guion" requests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adapterPaths } from '../src/core/harness-adapters.js';
import { parseScript } from '../src/core/sales-scripts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SKILL = '.agents/skills/script/SKILL.md';
const BASE_SKILL = 'templates/base/.agents/skills/script/SKILL.md';
const AGENTS = ['AGENTS.md', 'templates/base/AGENTS.md'];

test('the script skill exists, root and base copies are identical, and it is a slash command', () => {
  const text = read(SKILL);
  assert.equal(text, read(BASE_SKILL));
  assert.match(text, /^---\nname: script\ndescription: ".{20,}"\n/);
  assert.match(text, /^metadata:\n {2}opencode\/slash: "true"$/m);
  assert.match(text, /\$ARGUMENTS/);
  assert.match(text, /If no arguments were given/);
  for (const rel of Object.values(adapterPaths('script'))) assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
});

test('the skill asks one question at a time, never invents, and explains back before drafting', () => {
  const text = read(SKILL);
  assert.match(text, /one question at a time/i);
  assert.match(text, /never invent/i);
  assert.match(text, /explain back/i);
  for (const topic of [/industry/i, /which conversations/i, /objections/i, /tone/i]) assert.match(text, topic);
  assert.match(text, /hazme un guion para/i);
});

test('the grammar example in the skill is neutral and parses with no diagnostics', () => {
  const text = read(SKILL);
  const block = /```markdown\n(---\nscript:[\s\S]*?)\n```/.exec(text);
  assert.ok(block, 'the skill needs a fenced markdown grammar example');
  const parsed = parseScript(block[1]);
  assert.deepEqual(parsed.diagnostics, []);
  assert.ok(parsed.conversations.length >= 1 && parsed.conversations[0].steps.length >= 1);
  assert.ok(parsed.conversations[0].steps.some((s) => s.answers.length > 0), 'the example shows a buyer answer');
  assert.doesNotMatch(block[1], /retail|sandler|laila/i);
  for (const key of ['script:', 'title:', 'industry:', 'version:', 'status:', 'play:', 'goal:', 'note:', 'branch:', 'tag:', 'say:', 'tip:', 'tone:', 'next:', 'detail:', 'when:']) {
    assert.ok(text.includes(key), `the skill documents ${key}`);
  }
  for (const tone of ['start', 'plain', 'action', 'yes', 'no', 'follow']) assert.ok(text.includes(tone), tone);
});

test('the skill documents coach:, answers without say:, jumps to another conversation and the live assistant', () => {
  const text = read(SKILL);
  const block = /```markdown\n(---\nscript:[\s\S]*?)\n```/.exec(text)[1];
  assert.match(block, /^coach: /m, 'the example shows coach:');
  const answers = parseScript(block).conversations.flatMap((c) => c.steps.flatMap((s) => s.answers));
  assert.ok(answers.some((a) => a.cards.length === 0 && a.next), 'the example shows an answer with only next:');
  assert.match(text, /without `say:`/i);
  assert.match(text, /another conversation/i);
  assert.match(text, /live assistant/i);
});

test('the skill previews with --draft, fixes until valid, asks before saving and refreshes the page', () => {
  const text = read(SKILL);
  const preview = text.indexOf('clc-brain view --draft');
  const ask = text.search(/¿Lo guardo así\?/);
  const save = text.search(/\*\*Save\*\*/);
  assert.ok(preview !== -1 && ask > preview && save > ask, 'preview, then the question, then save');
  assert.match(text, /clc-brain view --draft <[^>]+> --open/);
  assert.match(text, /exits with 1/i);
  assert.match(text, /Nothing is saved yet/);
  assert.match(text, /only after (they|the person) says? yes/i);
  assert.match(text, /checkpoint/i);
  assert.match(text, /sales\/scripts\/<slug>\.md/);
  assert.match(text, /English slug/i);
  const lastView = text.lastIndexOf('`clc-brain view`');
  assert.ok(lastView > save, 'the page is refreshed after saving');
});

test('the skill links scripts from the system map and the play Guion cells, and keeps the glossary', () => {
  const text = read(SKILL);
  assert.match(text, /sales\/system\.md/);
  assert.match(text, /Scripts, glossary and industry packs/);
  assert.match(text, /if (it is )?missing/i);
  assert.match(text, /Guion/);
  assert.match(text, /\.\.\/scripts\/<slug>\.html#<anchor>/);
  assert.match(text, /sales\/glossary\.md/);
  assert.match(text, /\| Term \| Meaning \| Example \|/);
  assert.match(text, /\*\*term\*\*|bold term/i);
  assert.match(text, /What does X mean|qué significa/i);
});

test('the skill covers industry packs and legacy conversion, each only after an explicit yes', () => {
  const text = read(SKILL);
  assert.match(text, /icps\/<industry>\.md/);
  assert.match(text, /B1 · <Industry>|<Branch> · <Industry>/);
  assert.match(text, /industry pack/i);
  assert.match(text, /legacy/i);
  assert.match(text, /glosario/i);
  assert.match(text, /never overwrite[^\n]*hand-made|hand-made[^\n]*never overwrite/i);
  assert.match(text, /cold-outreach-email/);
  assert.match(text, /discovery-call-framework/);
  assert.match(text, /explicit yes/i);
});

test('the skill keeps jargon and internals away from the person', () => {
  const text = read(SKILL);
  assert.match(text, /never show internal IDs/i);
  assert.match(text, /plain/i);
  assert.match(text, /brain's language|language the person/i);
});

test('both AGENTS.md managed blocks route script, glossary and conversion requests to the script skill', () => {
  const rows = AGENTS.map((rel) => read(rel).split('\n').filter((l) => l.startsWith('|')));
  for (const [i, lines] of rows.entries()) {
    const row = (re) => lines.find((l) => re.test(l)) || '';
    const make = row(/make me a script for/i);
    assert.match(make, /hazme un guion para/i, AGENTS[i]);
    assert.match(make, /\.agents\/skills\/script\/SKILL\.md/);
    const means = row(/what does x mean\?/i);
    assert.match(means, /¿qué significa x\?/i);
    assert.match(means, /glossary/i);
    assert.match(means, /offer to add/i);
    const add = row(/add x to the glossary/i);
    assert.match(add, /agrega x al glosario/i);
    assert.match(add, /only after (they|the person) says? yes|¿Lo guardo\?|Save it\?/i);
    const convert = row(/convert my scripts to the new format/i);
    assert.match(convert, /convierte mis guiones al formato nuevo/i);
    assert.match(convert, /\.agents\/skills\/script\/SKILL\.md/);
    const flow = row(/here's my sales flow/i);
    assert.doesNotMatch(flow, /guion/i, 'flow rows no longer take script requests');
  }
  assert.deepEqual(rows[0].filter((l) => /script|glossary|glosario/i.test(l)).length, rows[1].filter((l) => /script|glossary|glosario/i.test(l)).length);
});

test('the scripts lookup line lives in the managed block, in both files', () => {
  for (const rel of AGENTS) {
    const text = read(rel);
    const block = text.slice(text.indexOf('<!-- copilot-brain:managed:start -->'), text.indexOf('<!-- copilot-brain:managed:end -->'));
    assert.match(block, /Scripts and glossary:[^\n]*sales\/scripts\/[^\n]*sales\/glossary\.md/);
    assert.doesNotMatch(text, /For call scripts and discovery frameworks/, `${rel}: the old section-2 line points to the block now`);
    assert.match(text, /managed block[^\n]*scripts|scripts[^\n]*managed block|Scripts and glossary[^\n]*section 0/i);
  }
});

test('/flow and the sales skills send script requests to /script and keep their own scope', () => {
  for (const dir of ['.agents/skills', 'templates/base/.agents/skills']) {
    assert.match(read(`${dir}/flow/SKILL.md`), /\.agents\/skills\/script\/SKILL\.md/, `${dir}/flow`);
    for (const name of ['sales-assist', 'brain-sales']) {
      assert.match(read(`${dir}/${name}/SKILL.md`), /\.agents\/skills\/script\/SKILL\.md/, `${dir}/${name}`);
    }
  }
  for (const rel of ['skills/skill_sales_copilot.md', 'templates/base/skills/skill_sales_copilot.md']) {
    assert.match(read(rel), /\.agents\/skills\/script\/SKILL\.md/, rel);
  }
});

test('the CLAUDE.md pointer and the slash-command table list /script', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /\| `\/script` \| `\.agents\/skills\/script\/SKILL\.md` \|/);
});
