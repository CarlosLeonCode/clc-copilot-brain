// Brain health audit and non-destructive repair. Returns structured results; adapters render them.
import fs from 'node:fs';
import path from 'node:path';
import { IDE_ADAPTERS, SSOT_FILE, expectedAssets } from './manifest.js';
import { adapterPaths, generateHarnessAdapters, listSourceSkills } from './harness-adapters.js';
import { restoreAgentSkills, restoreRootSkills, setupIdeAdapters } from './scaffold.js';
import { validateAgainstSchema } from './schema-validator.js';
import { TEMPLATES_BASE_DIR } from './package-paths.js';
import { PLAY_TITLE_PREFIX, hasDecisionTree, playProblems } from './plays.js';
import { diagnosticText } from './diagnostics.js';
import { parseFlowchart } from './flowchart.js';
import { readSalesRecords } from './sales-records.js';
import { DEFAULT_MOTIONS, toSlug } from './sales-normalize.js';
import { checkSalesLibrary } from './sales-library.js';
import { scorecardProblems } from './scorecard.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { findSampleContent } from './sample-content.js';
import { getSetupState } from './setup-state.js';

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


// Structured JSON assets validated against their schema: [directory, schema name, label key].
const SCHEMA_ASSETS = Object.freeze([
  [['sales', 'battlecards'], 'sales-battlecard', 'doctor.label.battlecard'],
  [['sales', 'objections'], 'sales-objection', 'doctor.label.objection'],
  [['operations', 'sops'], 'sop', 'doctor.label.sop']
]);

function checkKernel(rootDir, report) {
  const kernelPath = path.join(rootDir, 'org-kernel.json');
  if (!fs.existsSync(kernelPath)) {
    report.issue({ level: 'error', message: report.t('doctor.kernelMissing') });
    return null;
  }
  try {
    const kernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
    const { errors } = validateAgainstSchema('org-kernel', kernel);
    if (errors.length > 0) report.issue({ level: 'error', message: report.t('doctor.kernelInvalid', { errors: errors.join(', ') }) });
    else report.pass(report.t('doctor.kernelValid'));
    return kernel;
  } catch (err) {
    report.issue({ level: 'error', message: report.t('doctor.kernelBadJson', { error: err.message }) });
    return null;
  }
}

function checkAdapters(rootDir, report) {
  let problems = 0;
  for (const adapter of IDE_ADAPTERS) {
    const adapterPath = path.join(rootDir, adapter);
    if (!fs.existsSync(adapterPath)) {
      report.issue({ level: 'warning', message: report.t('doctor.adapterMissing', { adapter }), repairable: true, action: 'create_adapter', adapter });
      problems++;
      continue;
    }
    if (fs.lstatSync(adapterPath).isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(adapterPath);
      if (linkTarget !== SSOT_FILE && linkTarget !== path.join(rootDir, SSOT_FILE)) {
        report.issue({ level: 'warning', message: report.t('doctor.adapterLink', { adapter, target: linkTarget }), repairable: true, action: 'repair_symlink', adapter });
        problems++;
      }
    }
  }
  if (problems === 0) report.pass(report.t('doctor.adaptersOk'));
}

function checkFiles(dir, files, toIssue, passMessage, report) {
  const missing = files.filter((f) => !fs.existsSync(path.join(dir, f)));
  for (const f of missing) report.issue(toIssue(f));
  if (missing.length === 0) report.pass(passMessage);
}

function checkSchemaAssets(rootDir, report) {
  for (const [segments, schema, labelKey] of SCHEMA_ASSETS) {
    const label = report.t(labelKey);
    const dir = path.join(rootDir, ...segments);
    if (!fs.existsSync(dir)) continue;
    const rel = segments.join('/');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      try {
        const { errors } = validateAgainstSchema(schema, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
        if (errors.length > 0) report.issue({ level: 'error', message: report.t('doctor.assetInvalid', { label, file: `${rel}/${file}`, errors: errors.join('; ') }) });
        else report.pass(report.t('doctor.assetOk', { label, file: `${rel}/${file}` }));
      } catch (err) {
        report.issue({ level: 'error', message: report.t('doctor.assetCorrupt', { file: `${rel}/${file}`, error: err.message }) });
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

  if (!fs.existsSync(path.join(salesDir, 'system.md'))) warn(report.t('doctor.noSystem'));

  const playsDir = path.join(salesDir, 'plays');
  const plays = fs.existsSync(playsDir) ? fs.readdirSync(playsDir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : [];
  if (plays.length === 0) warn(report.t('doctor.noPlays'));
  for (const file of plays) {
    const text = fs.readFileSync(path.join(playsDir, file), 'utf8');
    for (const problem of playProblems(file, text)) warn(report.t('doctor.playProblem', { problem: report.text(problem) }));
    const state = diagramState(text);
    if (state !== 'ok') warn(report.t(state === 'missing' ? 'doctor.guideNoDiagram' : 'doctor.guideBrokenDiagram', { name: guideName(file, text) }));
  }

  const pipelinePath = path.join(salesDir, 'stages', 'pipeline-stages.md');
  if (fs.existsSync(pipelinePath)) {
    const text = fs.readFileSync(pipelinePath, 'utf8');
    if (hasDecisionTree(text)) warn(report.t('doctor.pipelineTree'));
    const state = diagramState(text);
    if (state === 'missing') warn(report.t('doctor.pipelineNoDiagram'));
    if (state === 'broken') warn(report.t('doctor.pipelineBroken'));
  }

  if (problems === 0) report.pass(report.t('doctor.salesOk'));
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
    warn(report.t('doctor.noSuccess', { list: noSuccess.join(', ') }));
  }

  const known = new Set([...Object.keys(DEFAULT_MOTIONS), ...records.plays.flatMap((p) => (Array.isArray(p.motions) ? p.motions : []))]);
  const unknown = new Map();
  for (const r of [...records.calls, ...records.wins]) {
    const slug = toSlug(r.motion);
    if (slug && !known.has(slug)) unknown.set(slug, (unknown.get(slug) ?? 0) + 1);
  }
  if (unknown.size > 0) {
    const list = [...unknown].map(([slug, n]) => `"${slug}" (${n})`).join(', ');
    warn(report.t('doctor.unknownMotion', { list }));
  }

  const unusable = records.calls.flatMap((c) => {
    const found = scorecardProblems(c.scorecard, records.criteria.ids);
    return found.length ? [`${c.relPath} (${found.join('; ')})`] : [];
  });
  if (unusable.length > 0) {
    warn(report.t('doctor.unusableScores', { list: unusable.join(', ') }));
  }

  if (records.skipped.length > 0) {
    warn(report.t('doctor.unreadable', { list: records.skipped.map((s) => s.relPath).join(', ') }));
  }
  if (problems === 0) report.pass(report.t('doctor.recordsOk'));
}

/** Every valid skill needs its slash-command shortcuts for Claude Code, Gemini CLI and Windsurf. */
function checkSkillShortcuts(rootDir, report) {
  let problems = 0;
  for (const skill of listSourceSkills(rootDir)) {
    if (skill.problems.length > 0) {
      problems++;
      report.issue({ level: 'warning', message: report.t('doctor.skillInvalid', { name: skill.name, problems: skill.problems.join('; ') }) });
      continue;
    }
    for (const rel of Object.values(adapterPaths(skill.name))) {
      if (fs.existsSync(path.join(rootDir, ...rel.split('/')))) continue;
      problems++;
      report.issue({ level: 'warning', message: report.t('doctor.shortcutMissing', { path: rel }), repairable: true, action: 'generate_shortcuts', skill: skill.name });
    }
  }
  // Generated shortcuts that exist but no longer match their skill (the dry run lists them as files to write).
  const stale = generateHarnessAdapters(rootDir, { dryRun: true, removeLegacy: false }).written
    .filter((rel) => fs.existsSync(path.join(rootDir, ...rel.split('/'))));
  if (stale.length > 0) {
    problems++;
    report.issue({
      level: 'warning',
      message: report.t('doctor.shortcutStale', { list: stale.join(', ') }),
      repairable: true,
      action: 'generate_shortcuts'
    });
  }
  if (fs.existsSync(path.join(rootDir, '.claude', 'commands'))) {
    report.issue({ level: 'warning', message: report.t('doctor.oldCommands') });
    problems++;
  }
  if (problems === 0) report.pass(report.t('doctor.shortcutsOk'));
}

const METHOD_NAMES = Object.freeze({ meddpicc: 'MEDDPICC', sandler: 'Sandler' });

/**
 * Leftover sample content: the sample customer profile once the brain is set up (before setup it is expected demo
 * content), and the sample names in the brain's own skills.
 */
function checkSampleContent(rootDir, report) {
  const found = findSampleContent(rootDir);
  const icp = found.sampleIcp;
  if (icp?.report && getSetupState(rootDir) !== 'pending') {
    const method = METHOD_NAMES[found.methodology] ?? found.methodology;
    const key = found.methodology === 'meddpicc' ? 'doctor.sampleIcp' : 'doctor.sampleIcpMethod';
    report.issue({ level: 'warning', message: report.t(key, { list: icp.path, method }) });
  }
  if (found.namedSkills.length > 0) {
    report.issue({ level: 'warning', message: report.t('doctor.sampleNames', { list: found.namedSkills.join(', ') }) });
  }
}

/**
 * Audit a brain. Messages are in `lang` (English by default).
 * @returns {{ passed: string[], issues: Array<{ level: 'error'|'warning', message: string, repairable?: boolean }>,
 *   checksPassed: number, errors: number, warnings: number, healthy: boolean }}
 */
export function runDoctor(rootDir, { templatesBaseDir = TEMPLATES_BASE_DIR, lang = DEFAULT_LANGUAGE } = {}) {
  const passed = [];
  const issues = [];
  const report = { pass: (m) => passed.push(m), issue: (i) => issues.push(i), t: (key, vars) => t(lang, key, vars), text: (d) => diagnosticText(lang, d) };
  const expected = expectedAssets(templatesBaseDir);

  const kernel = checkKernel(rootDir, report);

  if (fs.existsSync(path.join(rootDir, SSOT_FILE))) report.pass(report.t('doctor.agentsOk'));
  else report.issue({ level: 'error', message: report.t('doctor.agentsMissing') });

  checkAdapters(rootDir, report);

  checkFiles(path.join(rootDir, '.agents', 'skills'), expected.agentSkills.map((name) => path.join(name, 'SKILL.md')),
    (rel) => ({ level: 'warning', message: report.t('doctor.skillMissing', { path: `.agents/skills/${rel.split(path.sep).join('/')}` }), repairable: true, action: 'create_agent_skill', skill: rel.split(path.sep)[0] }),
    report.t('doctor.skillsOk'), report);

  checkSkillShortcuts(rootDir, report);

  checkFiles(path.join(rootDir, 'skills'), expected.rootSkills,
    (skill) => ({ level: 'warning', message: report.t('doctor.rootSkillMissing', { path: `skills/${skill}` }), repairable: true, action: 'create_skill', skill }),
    report.t('doctor.rootSkillsOk'), report);

  if (kernel && Array.isArray(kernel.activeAreas)) {
    for (const areaId of kernel.activeAreas) {
      if (fs.existsSync(path.join(rootDir, areaId))) report.pass(report.t('doctor.areaOk', { area: areaId }));
      else report.issue({ level: 'error', message: report.t('doctor.areaMissing', { area: areaId }) });
    }
  }

  checkSchemaAssets(rootDir, report);
  checkSampleContent(rootDir, report);

  if (kernel && Array.isArray(kernel.activeAreas) && kernel.activeAreas.includes('sales')) {
    checkSalesSystem(rootDir, report);
    checkSalesMetrics(rootDir, report);
    for (const message of checkSalesLibrary(rootDir, { lang })) report.issue({ level: 'warning', message });
  }

  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return { passed, issues, checksPassed: passed.length, errors, warnings, healthy: issues.length === 0 };
}

/**
 * Apply non-destructive repairs: missing/broken adapters, missing skills, and slash-command shortcuts.
 * Existing regular adapter files are kept as-is; old command files are left to `upgrade`.
 */
export function repairBrain(rootDir, { templatesBaseDir = TEMPLATES_BASE_DIR } = {}) {
  const adapters = setupIdeAdapters(rootDir, { backupRegularFiles: false });
  const skills = restoreRootSkills(rootDir, { templatesBaseDir });
  const agentSkills = restoreAgentSkills(rootDir, { templatesBaseDir });
  const shortcuts = generateHarnessAdapters(rootDir, { removeLegacy: false });
  return { adapters, skills, agentSkills, shortcuts };
}
