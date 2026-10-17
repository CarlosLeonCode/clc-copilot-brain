// Brain health audit and non-destructive repair. Returns structured results; adapters render them.
import fs from 'node:fs';
import path from 'node:path';
import { IDE_ADAPTERS, SSOT_FILE, expectedAssets } from './manifest.js';
import { restoreRootSkills, setupIdeAdapters } from './scaffold.js';
import { validateAgainstSchema } from './schema-validator.js';
import { TEMPLATES_BASE_DIR } from './package-paths.js';
import { hasDecisionTree, validatePlay } from './plays.js';

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
    for (const problem of validatePlay(file, fs.readFileSync(path.join(playsDir, file), 'utf8'))) warn(`Play sales/plays/${problem}`);
  }

  const pipelinePath = path.join(salesDir, 'stages', 'pipeline-stages.md');
  if (fs.existsSync(pipelinePath) && hasDecisionTree(fs.readFileSync(pipelinePath, 'utf8'))) {
    warn('sales/stages/pipeline-stages.md contains a conversation decision tree; conversation trees belong in sales/plays/.');
  }

  if (problems === 0) report.pass('Sales system map and plays verified.');
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

  if (kernel && Array.isArray(kernel.activeAreas) && kernel.activeAreas.includes('sales')) checkSalesSystem(rootDir, report);

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
