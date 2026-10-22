// The call skills record the industry of an industry-specific conversation, in plain language with the person.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ANALYZERS = ['templates/base/skills/skill_call_analyzer.md', 'skills/skill_call_analyzer.md', 'templates/areas/sales/skills/skill_call_analyzer.md'];
const CALL_SKILLS = ['templates/base/.agents/skills/call/SKILL.md', '.agents/skills/call/SKILL.md'];

test('every call analyzer copy infers and writes `industry` for industry-specific conversations', () => {
  const first = read(ANALYZERS[0]);
  for (const rel of ANALYZERS) {
    const text = read(rel);
    assert.equal(text, first, `${rel} matches the template`);
    assert.match(text, /\*\*Industry \(`industry`\)\*\*/, `${rel} has the industry rule`);
    assert.match(text, /B1 · Retail/, `${rel} explains the branch suffix`);
    assert.match(text, /^industry: "\{\{INDUSTRY_SLUG\}\}"/m, `${rel} has the industry key in the template`);
    assert.match(text, /`branch`, `industry`, `goal_met`/, `${rel} lists industry among the keys to write`);
    assert.match(text, /leave `industry` out/i, `${rel} never invents an industry`);
  }
});

test('the call skill records the industry and keeps the plain-language rules', () => {
  for (const rel of CALL_SKILLS) {
    const text = read(rel);
    assert.match(text, /`industry`/, `${rel} writes industry`);
    assert.match(text, /industry-specific/i);
    assert.match(text, /Never show internal IDs, field names, or file paths/);
    assert.match(text, /"Save it\?" \/ "¿Lo guardo\?"/);
  }
});
