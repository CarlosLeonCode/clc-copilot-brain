// Upgrade planner: bring template-owned files of an existing brain up to date. Plan first, apply second.
// Allowlist only: everything not listed here is never touched.
//   template-owned  = base .agents/skills/<name>/SKILL.md and skills/*.md  -> replace (with .bak backup) when bytes differ
//                     and the brain still holds a version this package shipped (shipped-hashes.js); an edited copy is
//                     kept (reason `edited-locally`) unless `forceSkills` is set
//   add-if-missing  = new base skills, plus sales/system.md and sales/plays/*.md when `sales` is active
// Slash-command shortcuts and old .claude/commands files are handled after apply by generateHarnessAdapters.
//                     (in the brain language when templates/locales has that file, else in English)
//   frontmatter-keys = sales/qualification/qualification-matrix.md: adds the template's `criteria` and label lines only when `criteria`
//                     is missing and the matrix is still the template's (a shipped version, or one that still uses its
//                     MEDDPICC wording); a matrix rewritten for another method is kept (reason `edited-locally`)
//   managed-block   = AGENTS.md: only the text between the copilot-brain managed markers is refreshed
import fs from 'node:fs';
import path from 'node:path';
import { localeAreaDir, readKernel } from './areas.js';
import { parseFrontmatter } from './plays.js';
import { FALLBACK_CRITERIA, parseCriteria } from './scorecard.js';
import { getBrainLanguage } from './brain-language.js';
import { BrainError } from './errors.js';
import { ensureDir, isInside, listMarkdownFiles } from './fs-utils.js';
import { listSkillNames } from './harness-adapters.js';
import { isShippedVersion } from './legacy-assets.js';
import { SHIPPED_HASHES } from './shipped-hashes.js';
import { TEMPLATES_AREAS_DIR, TEMPLATES_BASE_DIR, TEMPLATES_LOCALES_DIR } from './package-paths.js';

const PLACEHOLDER = /\{\{(COMPANY_NAME|INDUSTRY|TAGLINE|ACTIVE_AREAS_[A-Z]+|CREATED_AT|UPDATED_AT)\}\}/;
export const MANAGED_START = '<!-- copilot-brain:managed:start -->';
export const MANAGED_END = '<!-- copilot-brain:managed:end -->';
const AGENTS_FILE = 'AGENTS.md';

function assertBrain(rootDir) {
  if (!fs.existsSync(path.join(rootDir, 'org-kernel.json'))) {
    throw new BrainError('NOT_A_BRAIN', `${rootDir} is not a brain (no org-kernel.json). Run "clc-brain init" first.`);
  }
}

function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

/** Managed template files as { rel (posix), src, policy } where policy applies to an existing file. */
function managedFiles(templatesBaseDir, templatesAreasDir, activeAreas, salesOverlayDir) {
  const files = [];
  const agentSkills = path.join(templatesBaseDir, '.agents', 'skills');
  for (const name of listSkillNames(agentSkills)) {
    files.push({ rel: `.agents/skills/${name}/SKILL.md`, src: path.join(agentSkills, name, 'SKILL.md'), owned: true });
  }
  const rootSkills = path.join(templatesBaseDir, 'skills');
  for (const name of listMarkdownFiles(rootSkills)) files.push({ rel: `skills/${name}`, src: path.join(rootSkills, name), owned: true });
  if (activeAreas.includes('sales')) {
    const sales = path.join(templatesAreasDir, 'sales');
    // The translated file when the brain language has one, else the English template.
    const source = (...rel) => {
      const translated = salesOverlayDir && path.join(salesOverlayDir, ...rel);
      return translated && fs.existsSync(translated) ? translated : path.join(sales, ...rel);
    };
    if (fs.existsSync(path.join(sales, 'system.md'))) files.push({ rel: 'sales/system.md', src: source('system.md'), owned: false });
    for (const name of listMarkdownFiles(path.join(sales, 'plays'))) {
      files.push({ rel: `sales/plays/${name}`, src: source('plays', name), owned: false });
    }
  }
  return files;
}

/**
 * Compute what an upgrade would do. Only actionable entries are returned (an up-to-date brain => []).
 * `forceSkills` also replaces template-owned files a person edited (old behavior); `shippedHashes` is for tests.
 * @returns {{ actions: Array<{ path: string, policy: 'template-owned'|'add-if-missing'|'managed-block'|'frontmatter-keys', kind: 'add'|'replace'|'skip', reason?: string, current?: string, next: string }> }}
 */
export function planUpgrade(rootDir, {
  templatesBaseDir = TEMPLATES_BASE_DIR, templatesAreasDir = TEMPLATES_AREAS_DIR, templatesLocalesDir = TEMPLATES_LOCALES_DIR,
  shippedHashes = SHIPPED_HASHES, forceSkills = false
} = {}) {
  assertBrain(rootDir);
  const activeAreas = readKernel(rootDir).activeAreas || [];
  const salesOverlayDir = localeAreaDir('sales', getBrainLanguage(rootDir), templatesLocalesDir);
  const actions = [];
  for (const file of managedFiles(templatesBaseDir, templatesAreasDir, activeAreas, salesOverlayDir)) {
    const next = fs.readFileSync(file.src, 'utf8');
    const dest = path.join(rootDir, ...file.rel.split('/'));
    const stat = lstatOrNull(dest);
    const policy = file.owned && stat ? 'template-owned' : 'add-if-missing';
    if (PLACEHOLDER.test(next)) {
      actions.push({ path: file.rel, policy, kind: 'skip', reason: 'placeholder', next });
    } else if (!stat) {
      actions.push({ path: file.rel, policy: 'add-if-missing', kind: 'add', next });
    } else if (file.owned) {
      if (!stat.isFile()) {
        actions.push({ path: file.rel, policy, kind: 'skip', reason: stat.isSymbolicLink() ? 'symlink' : 'not-a-file', next });
        continue;
      }
      const current = fs.readFileSync(dest, 'utf8');
      if (Buffer.from(current, 'utf8').equals(Buffer.from(next, 'utf8'))) continue;
      if (!forceSkills && !isShippedVersion(file.rel, current, shippedHashes)) {
        actions.push({ path: file.rel, policy, kind: 'skip', reason: 'edited-locally', current, next });
      } else if (lstatOrNull(`${dest}.bak`)) actions.push({ path: file.rel, policy, kind: 'skip', reason: 'backup-exists', current, next });
      else actions.push({ path: file.rel, policy, kind: 'replace', current, next });
    }
  }
  const matrix = planMatrixCriteria(rootDir, templatesAreasDir, activeAreas, shippedHashes);
  if (matrix) actions.push(matrix);
  const agents = planAgentsBlock(rootDir, templatesBaseDir);
  if (agents) actions.push(agents);
  return { actions };
}

const MATRIX_REL = 'sales/qualification/qualification-matrix.md';
const FRONTMATTER_BLOCK = /^(\uFEFF?)---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// The default list before `deal_size` was added; a matrix that still declares all of these gets it appended.
const PRE_DEAL_SIZE_CRITERIA = Object.freeze(FALLBACK_CRITERIA.filter((id) => id !== 'deal_size'));
const CRITERIA_LINE = /^(criteria:[ \t]*)(["']?)(.*?)\2([ \t]*\r?)$/m;

// The template's method name: a matrix that still uses it is the template's, so its criteria fit.
const TEMPLATE_METHOD = /MEDDPICC/i;

/**
 * The user's matrix is theirs: only the missing `criteria` list (and labels they do not have) is added to its
 * frontmatter, so existing brains keep working with the qualification scorecard. That happens only while the
 * matrix is still the template's (a shipped version, or one that still uses its MEDDPICC wording); a matrix
 * rewritten for another method (Sandler, BANT...) is kept, and the assistant can add criteria that match it.
 * A declared list is never rewritten; one that still holds every previous default only gets `deal_size`
 * appended (see planDealSize).
 */
function planMatrixCriteria(rootDir, templatesAreasDir, activeAreas, shippedHashes) {
  const src = path.join(templatesAreasDir, ...MATRIX_REL.split('/'));
  const dest = path.join(rootDir, ...MATRIX_REL.split('/'));
  const stat = lstatOrNull(dest);
  if (!activeAreas.includes('sales') || !stat?.isFile() || !fs.existsSync(src)) return null;
  const tpl = FRONTMATTER_BLOCK.exec(fs.readFileSync(src, 'utf8'));
  if (!tpl) return null;
  const current = fs.readFileSync(dest, 'utf8');
  const fm = parseFrontmatter(current);
  const base = { path: MATRIX_REL, policy: 'frontmatter-keys' };
  const own = FRONTMATTER_BLOCK.exec(current);
  const missing = (key) => !fm || !Object.hasOwn(fm, key);
  const keyOf = (line) => line.slice(0, Math.max(line.indexOf(':'), 0)).trim();
  let next;
  if (fm && Object.hasOwn(fm, 'criteria')) {
    next = planDealSize(fm, own, current, tpl[2].split(/\r?\n/).filter((l) => missing(keyOf(l))));
    if (!next) return null;
  } else if (!isShippedVersion(MATRIX_REL, current, shippedHashes) && !TEMPLATE_METHOD.test(current)) {
    return { ...base, kind: 'skip', reason: 'edited-locally', current, next: current };
  } else {
    const lines = tpl[2].split(/\r?\n/).filter((l) => missing(keyOf(l)));
    next = own
      ? `${own[1]}---\n${own[2]}\n${lines.join('\n')}\n---\n${current.slice(own[0].length)}`
      : `${tpl[0].replace(/\r?\n?$/, '\n')}${current}`;
  }
  if (lstatOrNull(`${dest}.bak`)) return { ...base, kind: 'skip', reason: 'backup-exists', current, next };
  return { ...base, kind: 'replace', current, next };
}

/**
 * Append `deal_size` to a declared list that still holds every previous default (extra user criteria are fine),
 * plus the template's `advance_requires` and `label_deal_size` when the user has none. Null when nothing to do.
 */
function planDealSize(fm, own, current, missingLines) {
  const ids = parseCriteria(fm.criteria) ?? [];
  if (ids.includes('deal_size') || !PRE_DEAL_SIZE_CRITERIA.every((id) => ids.includes(id))) return null;
  const match = own && CRITERIA_LINE.exec(own[2]);
  if (!match) return null;
  const appended = `${match[1]}${match[2]}${match[3].replace(/[ \t,]*$/, '')}, deal_size${match[2]}${match[4]}`;
  const head = own[2].slice(0, match.index) + appended + own[2].slice(match.index + match[0].length);
  const extra = missingLines.filter((l) => /^(advance_requires|label_deal_size):/.test(l));
  return `${own[1]}---\n${[head, ...extra].join('\n')}\n---\n${current.slice(own[0].length)}`;
}

/** Marker positions as { start, end } (end is exclusive), null when absent, or 'invalid' when unpaired or reversed. */
function managedRange(text) {
  const start = text.indexOf(MANAGED_START);
  const endAt = text.indexOf(MANAGED_END);
  if (start === -1 && endAt === -1) return null;
  if (start === -1 || endAt === -1 || endAt < start) return 'invalid';
  if (text.indexOf(MANAGED_START, start + 1) !== -1 || text.indexOf(MANAGED_END, endAt + 1) !== -1) return 'invalid';
  return { start, end: endAt + MANAGED_END.length };
}

/** Put `block` in place of the managed range, else before the first "## " heading, else at the end. */
export function mergeManagedBlock(current, block) {
  const range = managedRange(current);
  if (range && range !== 'invalid') return current.slice(0, range.start) + block + current.slice(range.end);
  const heading = current.search(/^## /m);
  if (heading !== -1) return `${current.slice(0, heading)}${block}\n\n---\n\n${current.slice(heading)}`;
  return `${current.replace(/\n*$/, '')}\n\n${block}\n`;
}

/** AGENTS.md is the SSOT the IDE adapters symlink to: refresh only its managed block, in the real file. */
function planAgentsBlock(rootDir, templatesBaseDir) {
  const src = path.join(templatesBaseDir, AGENTS_FILE);
  if (!fs.existsSync(src)) return null;
  const template = fs.readFileSync(src, 'utf8');
  const range = managedRange(template);
  if (!range || range === 'invalid') return null;
  const block = template.slice(range.start, range.end);
  const base = { path: AGENTS_FILE, policy: 'managed-block' };
  if (PLACEHOLDER.test(block)) return { ...base, kind: 'skip', reason: 'placeholder', next: block };
  const dest = path.join(rootDir, AGENTS_FILE);
  const stat = lstatOrNull(dest);
  if (!stat) return null;
  if (!stat.isFile()) return { ...base, kind: 'skip', reason: stat.isSymbolicLink() ? 'symlink' : 'not-a-file', next: block };
  const current = fs.readFileSync(dest, 'utf8');
  if (PLACEHOLDER.test(current)) return { ...base, kind: 'skip', reason: 'placeholder', current, next: block };
  if (managedRange(current) === 'invalid') return { ...base, kind: 'skip', reason: 'managed-markers-invalid', current, next: block };
  const next = mergeManagedBlock(current, block);
  if (next === current) return null;
  if (lstatOrNull(`${dest}.bak`)) return { ...base, kind: 'skip', reason: 'backup-exists', current, next };
  return { ...base, kind: 'replace', current, next };
}

/** Reason the target must not be written (symlink in the path below root, or escape), else null. */
function unsafeReason(rootDir, rel) {
  const abs = path.resolve(rootDir, rel);
  if (!isInside(path.resolve(rootDir), abs)) return 'outside-root';
  let cur = path.resolve(rootDir);
  for (const part of path.relative(cur, abs).split(path.sep)) {
    cur = path.join(cur, part);
    const stat = lstatOrNull(cur);
    if (!stat) return null;
    if (stat.isSymbolicLink()) return 'symlink';
  }
  return null;
}

/**
 * Apply a plan. Every action is re-validated against the current disk state.
 * @returns {{ added: string[], replaced: Array<{ path: string, backup: string }>, skipped: Array<{ path: string, reason: string }> }}
 */
export function applyUpgrade(rootDir, plan) {
  assertBrain(rootDir);
  const result = { added: [], replaced: [], skipped: [] };
  const skip = (p, reason) => result.skipped.push({ path: p, reason });
  for (const action of plan.actions) {
    if (action.kind === 'skip') {
      skip(action.path, action.reason);
      continue;
    }
    const unsafe = unsafeReason(rootDir, action.path);
    if (unsafe) {
      skip(action.path, unsafe);
      continue;
    }
    const dest = path.resolve(rootDir, action.path);
    try {
      if (action.kind === 'add') {
        ensureDir(path.dirname(dest));
        fs.writeFileSync(dest, action.next, { encoding: 'utf8', flag: 'wx' });
        result.added.push(action.path);
      } else if (action.kind === 'replace') {
        const stat = lstatOrNull(dest);
        if (!stat?.isFile() || fs.readFileSync(dest, 'utf8') !== action.current) {
          skip(action.path, 'changed-since-plan');
          continue;
        }
        fs.copyFileSync(dest, `${dest}.bak`, fs.constants.COPYFILE_EXCL);
        fs.writeFileSync(dest, action.next, 'utf8');
        result.replaced.push({ path: action.path, backup: `${action.path}.bak` });
      }
    } catch (err) {
      if (err.code !== 'EEXIST') throw new BrainError('UPGRADE_WRITE_FAILED', `Could not write ${action.path}: ${err.message}`);
      skip(action.path, action.kind === 'add' ? 'changed-since-plan' : 'backup-exists');
    }
  }
  return result;
}
