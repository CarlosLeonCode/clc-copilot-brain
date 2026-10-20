// Slash commands for every assistant from one source: `.agents/skills/<name>/SKILL.md`.
// Scaffolds real brains in temp dirs and checks the generated shortcuts, legacy cleanup and references.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SKILL_NAME_PATTERN, adapterPaths, generateHarnessAdapters, listSourceSkills, parseSkillFrontmatter, renderAdapters
} from '../src/core/harness-adapters.js';
import { expectedAssets } from '../src/core/manifest.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const FIXTURES = path.join(REPO_ROOT, 'tests', 'fixtures', 'legacy-commands');

function withBrain(fn) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-harness-'));
  const brain = path.join(outer, 'brain');
  try {
    execFileSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean'], { encoding: 'utf8' });
    fn(brain);
  } finally {
    fs.rmSync(outer, { recursive: true, force: true });
  }
}

const read = (root, rel) => fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, ...rel.split('/')));

test('a clean scaffold has valid source skills, three shortcuts each, and no .claude/commands', () => {
  withBrain((brain) => {
    const skills = listSourceSkills(brain);
    assert.deepEqual(skills.map((s) => s.name), expectedAssets().agentSkills);
    assert.ok(skills.length >= 13);
    for (const skill of skills) {
      const fm = parseSkillFrontmatter(skill.text).fields;
      assert.match(fm.name, SKILL_NAME_PATTERN, skill.name);
      assert.equal(fm.name, skill.name, 'name must equal the folder');
      assert.ok(fm.description.trim().length > 20, `${skill.name} needs a description`);
      assert.equal(fm.metadata['opencode/slash'], 'true', `${skill.name} is an OpenCode slash command`);
      assert.deepEqual(skill.problems, []);

      const paths = adapterPaths(skill.name);
      for (const rel of Object.values(paths)) {
        assert.ok(exists(brain, rel), `missing ${rel}`);
        const content = read(brain, rel);
        assert.ok(content.includes(`.agents/skills/${skill.name}/SKILL.md`), `${rel} must reference its source`);
        assert.match(content, /— do not edit/);
      }
      // The Claude Code copy is the source plus one marker line right after the frontmatter.
      const claude = read(brain, paths.claude);
      assert.equal(claude.replace(/<!-- generated from [^\n]*-->\n/, ''), skill.text);
      assert.match(read(brain, paths.gemini), /^prompt = """Read and follow \.agents\/skills\/[a-z0-9-]+\/SKILL\.md exactly\.\n\nUser input: \{\{args\}\}"""$/m);
      assert.match(read(brain, paths.windsurf), /^---\ndescription: ".+"\n---\n<!-- generated from/);
    }
    assert.equal(exists(brain, '.claude/commands'), false, 'no .claude/commands in a new brain');
    assert.equal(fs.readdirSync(path.join(brain, '.agents', 'skills')).some((f) => f.endsWith('.md')), false, 'no flat skills');
  });
});

test('generation is idempotent and keeps shortcut files people wrote themselves', () => {
  withBrain((brain) => {
    const again = generateHarnessAdapters(brain);
    assert.deepEqual([again.written, again.removed, again.converted, again.warnings], [[], [], [], []]);

    fs.writeFileSync(path.join(brain, '.gemini', 'commands', 'call.toml'), 'prompt = "mine"\n');
    const stale = path.join(brain, '.windsurf', 'workflows', 'retro.md');
    fs.writeFileSync(stale, '---\ndescription: old\n---\n<!-- generated from .agents/skills/retro/SKILL.md — do not edit -->\nold\n');
    const report = generateHarnessAdapters(brain);
    assert.equal(read(brain, '.gemini/commands/call.toml'), 'prompt = "mine"\n');
    assert.ok(report.warnings.some((w) => w.includes('.gemini/commands/call.toml')));
    assert.deepEqual(report.written, ['.windsurf/workflows/retro.md']);
    assert.match(fs.readFileSync(stale, 'utf8'), /Read and follow `\.agents\/skills\/retro\/SKILL\.md`/);

    fs.rmSync(path.join(brain, '.agents', 'skills', 'sop-auditor'), { recursive: true });
    const removed = generateHarnessAdapters(brain).removed.sort();
    assert.deepEqual(removed, Object.values(adapterPaths('sop-auditor')).sort(), 'shortcuts of a deleted skill are removed');
  });
});

test('upgrade removes shipped .claude/commands and flat skills, and keeps changed ones', () => {
  withBrain((brain) => {
    const legacy = path.join(brain, '.claude', 'commands');
    fs.mkdirSync(legacy, { recursive: true });
    fs.copyFileSync(path.join(FIXTURES, 'call.md'), path.join(legacy, 'call.md'));
    fs.copyFileSync(path.join(FIXTURES, 'brain:doctor.md'), path.join(legacy, 'brain:doctor.md'));
    fs.writeFileSync(path.join(legacy, 'retro.md'), '# /retro - my own version\n');
    fs.copyFileSync(path.join(FIXTURES, 'sales-assist.md'), path.join(brain, '.agents', 'skills', 'sales-assist.md'));
    fs.rmSync(path.join(brain, '.claude', 'skills', 'call'), { recursive: true });

    const dry = spawnSync(process.execPath, [CLI, 'upgrade', brain, '--dry-run'], { encoding: 'utf8', input: '' });
    assert.equal(dry.status, 0, dry.stderr);
    assert.match(dry.stdout, /\.claude\/commands\/call\.md/);
    assert.ok(fs.existsSync(path.join(legacy, 'call.md')), 'dry run writes nothing');

    const res = spawnSync(process.execPath, [CLI, 'upgrade', brain, '--yes'], { encoding: 'utf8', input: '' });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(fs.existsSync(path.join(legacy, 'call.md')), false);
    assert.equal(fs.existsSync(path.join(legacy, 'brain:doctor.md')), false);
    assert.equal(fs.readFileSync(path.join(legacy, 'retro.md'), 'utf8'), '# /retro - my own version\n');
    assert.match(res.stdout, /Kept \.claude\/commands\/retro\.md/);
    assert.equal(exists(brain, '.agents/skills/sales-assist.md'), false);
    assert.ok(exists(brain, '.claude/skills/call/SKILL.md'), 'missing shortcuts are regenerated');
  });
});

test('upgrade moves a flat skill a person added into its own folder and gives it shortcuts', () => {
  withBrain((brain) => {
    const flat = '---\nname: my-notes\ndescription: "Summarize my meeting notes. Use when I paste notes."\n---\n\nReview with me before saving.\n';
    fs.writeFileSync(path.join(brain, '.agents', 'skills', 'my-notes.md'), flat);
    const res = spawnSync(process.execPath, [CLI, 'upgrade', brain, '--yes'], { encoding: 'utf8', input: '' });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(read(brain, '.agents/skills/my-notes/SKILL.md'), flat);
    for (const rel of Object.values(adapterPaths('my-notes'))) assert.ok(exists(brain, rel), rel);
  });
});

// Paths that only exist once the brain is used, or are examples. Keep this list short.
const RUNTIME_PATHS = new Set([
  'sales/sales-system.html', // written by `clc-brain view`; listed in case init stops pre-rendering it
  'path/to/file.md' // placeholder in the brain-search link example
]);

function referencedPaths(markdown) {
  const out = new Set();
  for (const m of markdown.matchAll(/`([^`\s]+)`/g)) out.add(m[1]);
  for (const m of markdown.matchAll(/\]\((\.\/[^)\s]+)\)/g)) out.add(m[1]);
  return [...out]
    .map((p) => p.replace(/^\.\//, ''))
    .filter((p) => /^[\w.-]+(\/[\w.-]*)+$/.test(p)) // only paths with a folder: bare names like `.json` are not locations
    .filter((p) => !/YYYY|^\.\.?$/.test(p) && !p.startsWith('http'));
}

test('every project path referenced by AGENTS.md, skills and shortcuts exists in a clean scaffold', () => {
  withBrain((brain) => {
    const files = ['AGENTS.md'];
    for (const { name } of listSourceSkills(brain)) files.push(`.agents/skills/${name}/SKILL.md`, ...Object.values(adapterPaths(name)));
    const missing = [];
    for (const rel of files) {
      for (const p of referencedPaths(read(brain, rel))) {
        if (!RUNTIME_PATHS.has(p) && !exists(brain, p)) missing.push(`${rel}: ${p}`);
      }
    }
    assert.deepEqual(missing, []);
    const agents = read(brain, 'AGENTS.md');
    assert.doesNotMatch(agents, /bin\/cli\.js|src\/mcp/, 'AGENTS.md must not leak repository development paths');
  });
});

test('the repository root dogfoods the generated shortcuts of every template skill', () => {
  for (const skill of listSourceSkills(REPO_ROOT).filter((s) => expectedAssets().agentSkills.includes(s.name))) {
    for (const { rel, content } of renderAdapters(skill)) {
      assert.equal(read(REPO_ROOT, rel), content, `${rel} is out of date: run generateHarnessAdapters on the repo root`);
    }
  }
});
