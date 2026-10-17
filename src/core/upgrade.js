// Upgrade planner: bring template-owned files of an existing brain up to date. Plan first, apply second.
// Allowlist only: everything not listed here is never touched.
//   template-owned  = base .claude/commands/*.md and skills/*.md  -> replace (with .bak backup) when bytes differ
//   add-if-missing  = new base commands/skills, plus sales/system.md and sales/plays/*.md when `sales` is active
import fs from 'node:fs';
import path from 'node:path';
import { readKernel } from './areas.js';
import { BrainError } from './errors.js';
import { ensureDir, isInside, listMarkdownFiles } from './fs-utils.js';
import { TEMPLATES_AREAS_DIR, TEMPLATES_BASE_DIR } from './package-paths.js';

const PLACEHOLDER = /\{\{(COMPANY_NAME|INDUSTRY|TAGLINE|ACTIVE_AREAS_[A-Z]+|CREATED_AT|UPDATED_AT)\}\}/;

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
function managedFiles(templatesBaseDir, templatesAreasDir, activeAreas) {
  const files = [];
  for (const [dir, rel] of [[path.join(templatesBaseDir, '.claude', 'commands'), '.claude/commands'], [path.join(templatesBaseDir, 'skills'), 'skills']]) {
    for (const name of listMarkdownFiles(dir)) files.push({ rel: `${rel}/${name}`, src: path.join(dir, name), owned: true });
  }
  if (activeAreas.includes('sales')) {
    const sales = path.join(templatesAreasDir, 'sales');
    if (fs.existsSync(path.join(sales, 'system.md'))) files.push({ rel: 'sales/system.md', src: path.join(sales, 'system.md'), owned: false });
    for (const name of listMarkdownFiles(path.join(sales, 'plays'))) {
      files.push({ rel: `sales/plays/${name}`, src: path.join(sales, 'plays', name), owned: false });
    }
  }
  return files;
}

/**
 * Compute what an upgrade would do. Only actionable entries are returned (an up-to-date brain => []).
 * @returns {{ actions: Array<{ path: string, policy: 'template-owned'|'add-if-missing', kind: 'add'|'replace'|'skip', reason?: string, current?: string, next: string }> }}
 */
export function planUpgrade(rootDir, { templatesBaseDir = TEMPLATES_BASE_DIR, templatesAreasDir = TEMPLATES_AREAS_DIR } = {}) {
  assertBrain(rootDir);
  const activeAreas = readKernel(rootDir).activeAreas || [];
  const actions = [];
  for (const file of managedFiles(templatesBaseDir, templatesAreasDir, activeAreas)) {
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
      if (lstatOrNull(`${dest}.bak`)) actions.push({ path: file.rel, policy, kind: 'skip', reason: 'backup-exists', current, next });
      else actions.push({ path: file.rel, policy, kind: 'replace', current, next });
    }
  }
  return { actions };
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
