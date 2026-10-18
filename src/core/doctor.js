// Brain health audit and non-destructive repair. Returns structured results; adapters render them.
import fs from 'node:fs';
import path from 'node:path';
import { IDE_ADAPTERS, SSOT_FILE, expectedAssets } from './manifest.js';
import { restoreRootSkills, setupIdeAdapters } from './scaffold.js';
import { validateAgainstSchema } from './schema-validator.js';
import { TEMPLATES_BASE_DIR } from './package-paths.js';
import { PLAY_TITLE_PREFIX, hasDecisionTree, validatePlay } from './plays.js';
import { parseFlowchart } from './flowchart.js';
import { readSalesRecords } from './sales-records.js';
import { DEFAULT_MOTIONS, toSlug } from './sales-normalize.js';

const FIRST_MERMAID = /```mermaid\r?\n([\s\S]*?)```/;

/** 'missing' | 'broken' | 'ok' for the first Mermaid block of a markdown file. */
function diagramState(markdown) {
  const source = FIRST_MERMAID.exec(markdown)?.[1];
  if (!source || !source.trim()) return 'missing';
  try {
    parseFlowchart(source);
    return 'ok';
  } catch {
    return 'broken';
  }
}

/** Plain name of a call guide: its heading ("# Play: Cold Call" -> "cold call"), else its file name. */
function guideName(file, text) {
  const heading = /^#\s+(.+)$/m.exec(String(text).replace(/^---[\s\S]*?\n---\r?\n/, ''))?.[1]?.trim().replace(PLAY_TITLE_PREFIX, '');
  return (heading || file.replace(/\.md$/, '').replace(/[-_]+/g, ' ')).toLowerCase();
}

const DIAGRAM_WARNINGS = Object.freeze({
  missing: (subject) => `${subject} has no diagram; ask your assistant to draw one.`,
  broken: (subject) => `${subject}'s diagram can't be drawn; ask your assistant to fix it.`
});

// Structured JSON assets validated against their schema: [directory, schema name, label].
const SCHEMA_ASSETS = Object.freeze([
  [['sales', 'battlecards'], 'sales-battlecard', 'Battlecard'],
  [['sales', 'objections'], 'sales-objection', 'Objection'],
  [['operations', 'sops'], 'sop', 'SOP']
]);

function checkKernel(rootDir, report) {
  const kernelPath = path.join(rootDir, 'org-kernel.json');
  if (!fs.existsSync(kernelPath)) {
    report.issue({ level: 'error', message: 'Missing org-kernel.json in repository root.' });
    return null;
  }
  try {
    const kernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
    const { errors } = validateAgainstSchema('org-kernel', kernel);
    if (errors.length > 0) report.issue({ level: 'error', message: `org-kernel.json validation errors: ${errors.join(', ')}` });
    else report.pass('org-kernel.json structure is valid.');
    return kernel;
  } catch (err) {
    report.issue({ level: 'error', message: `org-kernel.json is invalid JSON: ${err.message}` });
    return null;
  }
}

function checkAdapters(rootDir, report) {
  let problems = 0;
  for (const adapter of IDE_ADAPTERS) {
    const adapterPath = path.join(rootDir, adapter);
    if (!fs.existsSync(adapterPath)) {
      report.issue({ level: 'warning', message: `Missing IDE adapter: ${adapter}`, repairable: true, action: 'create_adapter', adapter });
      problems++;
      continue;
    }
    if (fs.lstatSync(adapterPath).isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(adapterPath);
      if (linkTarget !== SSOT_FILE && linkTarget !== path.join(rootDir, SSOT_FILE)) {
        report.issue({ level: 'warning', message: `Adapter ${adapter} symlink points to "${linkTarget}", expected "AGENTS.md"`, repairable: true, action: 'repair_symlink', adapter });
        problems++;
      }
    }
  }
  if (problems === 0) report.pass('All multi-IDE adapters (.cursorrules, .windsurfrules, CLAUDE.md, GEMINI.md) properly configured.');
}

function checkFiles(dir, files, toIssue, passMessage, report) {
  const missing = files.filter((f) => !fs.existsSync(path.join(dir, f)));
  for (const f of missing) report.issue(toIssue(f));
  if (missing.length === 0) report.pass(passMessage);
}

function checkSchemaAssets(rootDir, report) {
  for (const [segments, schema, label] of SCHEMA_ASSETS) {
    const dir = path.join(rootDir, ...segments);
    if (!fs.existsSync(dir)) continue;
    const rel = segments.join('/');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      try {
        const { errors } = validateAgainstSchema(schema, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
        if (errors.length > 0) report.issue({ level: 'error', message: `${label} ${rel}/${file} invalid: ${errors.join('; ')}` });
        else report.pass(`${label} schema validated: ${rel}/${file}`);
      } catch (err) {
        report.issue({ level: 'error', message: `Corrupted JSON in ${rel}/${file}: ${err.message}` });
      }
    }
  }
}

// Soft checks (warnings only) for the sales system: map, plays and pipeline hygiene.
function checkSalesSystem(rootDir, report) {
  const salesDir = path.join(rootDir, 'sales');
  if (!fs.existsSync(salesDir)) return;
  let problems = 0;
  const warn = (message) => {
    report.issue({ level: 'warning', message });
    problems++;
  };

  if (!fs.existsSync(path.join(salesDir, 'system.md'))) warn('Missing sales/system.md (sales system map). Run "clc-brain upgrade" to add it.');

  const playsDir = path.join(salesDir, 'plays');
  const plays = fs.existsSync(playsDir) ? fs.readdirSync(playsDir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : [];
  if (plays.length === 0) warn('No plays found in sales/plays/. Run "clc-brain upgrade" to add the starter plays.');
  for (const file of plays) {
    const text = fs.readFileSync(path.join(playsDir, file), 'utf8');
    for (const problem of validatePlay(file, text)) warn(`Play sales/plays/${problem}`);
    const state = diagramState(text);
    if (state !== 'ok') warn(DIAGRAM_WARNINGS[state](`The ${guideName(file, text)} guide`));
  }

  const pipelinePath = path.join(salesDir, 'stages', 'pipeline-stages.md');
  if (fs.existsSync(pipelinePath)) {
    const text = fs.readFileSync(pipelinePath, 'utf8');
    if (hasDecisionTree(text)) warn('sales/stages/pipeline-stages.md contains a conversation decision tree; conversation trees belong in sales/plays/.');
    const state = diagramState(text);
    if (state === 'missing') warn('The pipeline has no diagram; ask your assistant to draw one.');
    if (state === 'broken') warn("The pipeline diagram can't be drawn; ask your assistant to fix it.");
  }

  if (problems === 0) report.pass('Sales system map and plays verified.');
}

// Warnings for the numbers behind the sales page: one grouped message per kind of problem.
function checkSalesMetrics(rootDir, report) {
  const records = readSalesRecords(rootDir);
  let problems = 0;
  const warn = (message) => {
    report.issue({ level: 'warning', message });
    problems++;
  };

  const noSuccess = records.plays.filter((p) => !p.successDefined).map((p) => p.title);
  if (noSuccess.length > 0) {
    warn(`These call guides do not say what success means yet: ${noSuccess.join(', ')}. Ask your assistant to add a success definition to each one.`);
  }

  const known = new Set([...Object.keys(DEFAULT_MOTIONS), ...records.plays.flatMap((p) => (Array.isArray(p.motions) ? p.motions : []))]);
  const unknown = new Map();
  for (const r of [...records.calls, ...records.wins]) {
    const slug = toSlug(r.motion);
    if (slug && !known.has(slug)) unknown.set(slug, (unknown.get(slug) ?? 0) + 1);
  }
  if (unknown.size > 0) {
    const list = [...unknown].map(([slug, n]) => `"${slug}" (${n})`).join(', ');
    warn(`Some records use a type of sale that no call guide lists: ${list}. Check the spelling, or ask your assistant to add it to the call guides it belongs to.`);
  }

  if (records.skipped.length > 0) {
    warn(`These records could not be read and are left out of the numbers: ${records.skipped.map((s) => s.relPath).join(', ')}. Ask your assistant to fix them.`);
  }
  if (problems === 0) report.pass('Sales records are readable and every call guide defines success.');
}

/**
 * Audit a brain.
 * @returns {{ passed: string[], issues: Array<{ level: 'error'|'warning', message: string, repairable?: boolean }>,
 *   checksPassed: number, errors: number, warnings: number, healthy: boolean }}
 */
export function runDoctor(rootDir, { templatesBaseDir = TEMPLATES_BASE_DIR } = {}) {
  const passed = [];
  const issues = [];
  const report = { pass: (m) => passed.push(m), issue: (i) => issues.push(i) };
  const expected = expectedAssets(templatesBaseDir);

  const kernel = checkKernel(rootDir, report);

  if (fs.existsSync(path.join(rootDir, SSOT_FILE))) report.pass('AGENTS.md SSOT file present.');
  else report.issue({ level: 'error', message: 'Missing AGENTS.md Single Source of Truth.' });

  checkAdapters(rootDir, report);

  checkFiles(path.join(rootDir, '.claude', 'commands'), expected.commands,
    (cmd) => ({ level: 'warning', message: `Missing Claude slash command: .claude/commands/${cmd}`, repairable: true, action: 'create_claude_command', command: cmd }),
    'All Claude Code slash commands (.claude/commands/) verified.', report);

  checkFiles(path.join(rootDir, '.agents', 'skills'), expected.agentSkills,
    (skill) => ({ level: 'warning', message: `Missing agent skill: .agents/skills/${skill}` }),
    'Agent query and audit skills present in .agents/skills/.', report);

  checkFiles(path.join(rootDir, 'skills'), expected.rootSkills,
    (skill) => ({ level: 'warning', message: `Missing LLM operating skill: skills/${skill}`, repairable: true, action: 'create_skill', skill }),
    'LLM operating skills (skills/) verified.', report);

  if (kernel && Array.isArray(kernel.activeAreas)) {
    for (const areaId of kernel.activeAreas) {
      if (fs.existsSync(path.join(rootDir, areaId))) report.pass(`Active area "${areaId}" verified on disk.`);
      else report.issue({ level: 'error', message: `Active area "${areaId}" declared in org-kernel.json but directory missing.` });
    }
  }

  checkSchemaAssets(rootDir, report);

  if (kernel && Array.isArray(kernel.activeAreas) && kernel.activeAreas.includes('sales')) {
    checkSalesSystem(rootDir, report);
    checkSalesMetrics(rootDir, report);
  }

  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return { passed, issues, checksPassed: passed.length, errors, warnings, healthy: issues.length === 0 };
}

/**
 * Apply non-destructive repairs: missing/broken adapters, missing slash commands and root skills.
 * Existing regular adapter files are kept as-is.
 */
export function repairBrain(rootDir, { templatesBaseDir = TEMPLATES_BASE_DIR } = {}) {
  const adapters = setupIdeAdapters(rootDir, { backupRegularFiles: false, templatesBaseDir });
  const skills = restoreRootSkills(rootDir, { templatesBaseDir });
  return { adapters, skills };
}
