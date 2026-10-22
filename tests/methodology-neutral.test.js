// Skills, MCP prompts and tool descriptions work for any sales method: they read stages, qualification and terms
// from the brain instead of hardcoding one method, and ship no sample people or company names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walk(rel, keep) {
  const abs = path.join(ROOT, rel);
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) return walk(child, keep);
    return entry.isFile() && keep(child) ? [child] : [];
  });
}

const md = (f) => f.endsWith('.md');
const SKILL_FILES = [
  ...walk('templates/base/.agents/skills', md),
  ...walk('templates/base/skills', md),
  ...walk('templates/areas/sales/skills', md)
];
const MCP_FILES = walk('src/mcp', (f) => f.endsWith('.js'));
const NEUTRAL = [...SKILL_FILES, ...MCP_FILES];

test('the method-neutral files cover the skills and the MCP server', () => {
  assert.ok(SKILL_FILES.length >= 20, `found ${SKILL_FILES.length} skill files`);
  assert.ok(MCP_FILES.includes('src/mcp/prompts.js') && MCP_FILES.includes('src/mcp/tools.js'));
});

test('no MEDDPICC outside the meddpicc template set (only the stored "meddpicc" value of the onboarding question)', () => {
  for (const rel of NEUTRAL) {
    const text = read(rel).replaceAll('`"meddpicc"`', '');
    assert.doesNotMatch(text, /meddpicc/i, rel);
  }
});

test('no hardcoded enterprise stage list or enterprise-only qualification words', () => {
  for (const rel of NEUTRAL) {
    const text = read(rel);
    assert.doesNotMatch(text, /Validation\s*(\||➔|->|,)\s*Proposal/, `${rel}: stage list`);
    assert.doesNotMatch(text, /Proposal\s*(\||➔|->|,)\s*Negotiation/, `${rel}: stage list`);
    assert.doesNotMatch(text, /Economic Buyer|Mutual Action Plan|Champion Strength/i, `${rel}: method words`);
  }
});

test('no sample people or company names in skills, prompts, tool descriptions or the help', () => {
  for (const rel of [...NEUTRAL, 'src/cli/help.js']) {
    assert.doesNotMatch(read(rel), /\b(Acme|Juanita|Pepito|NexaPay|OmniBank|Sarah Lin)\b/, rel);
    assert.doesNotMatch(read(rel), /\b(CTO|VP)\b/, rel);
  }
});

test('call, retro and flow procedures read stages, qualification and terms from the brain', () => {
  const groups = {
    stages: ['templates/base/skills/skill_call_analyzer.md', 'templates/base/skills/skill_monthly_retrospective.md', 'templates/base/.agents/skills/flow/SKILL.md', 'templates/base/.agents/skills/call/SKILL.md', 'templates/base/.agents/skills/retro/SKILL.md', 'src/mcp/prompts.js'],
    qualification: ['templates/base/skills/skill_call_analyzer.md', 'templates/base/.agents/skills/flow/SKILL.md', 'templates/base/skills/skill_sales_copilot.md', 'src/mcp/prompts.js'],
    terms: ['templates/base/skills/skill_call_analyzer.md', 'templates/base/skills/skill_sales_copilot.md', 'templates/base/.agents/skills/brain-sales/SKILL.md', 'templates/base/.agents/skills/sales-assist/SKILL.md']
  };
  for (const rel of groups.stages) {
    assert.match(read(rel), /sales\/system\.md/, `${rel}: stage names from the map`);
    assert.match(read(rel), /pipeline-stages\.md/, `${rel}: gates from the pipeline`);
  }
  for (const rel of groups.qualification) assert.match(read(rel), /qualification-matrix\.md/, `${rel}: qualification from the matrix`);
  for (const rel of groups.terms) assert.match(read(rel), /sales\/glossary\.md/, `${rel}: terms from the glossary`);
});

test('the call analyzer keeps the call-log keys and the outcome keywords', () => {
  const text = read('templates/base/skills/skill_call_analyzer.md');
  for (const key of ['deal_stage', 'outcome', 'motion', 'lead_source', 'deal_id', 'play', 'branch', 'goal_met', 'gate_advanced', 'deal_size', 'qual_<criterion>']) {
    assert.match(text, new RegExp(`^${key}: `, 'm'), key);
  }
  for (const word of ['Advanced', 'Stalled', 'Disqualified', 'Closed Won', 'Closed Lost']) assert.ok(text.includes(`\`${word}\``), word);
});
