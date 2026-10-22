// `migrate`: bring an older brain in line with today's formats with small, safe changes.
// planMigration reads only; applyMigration writes only the planned changes, each after a no-clobber `.bak` copy.
// Nothing is ever deleted or renamed, and HTML pages are never written.
import fs from 'node:fs';
import path from 'node:path';
import { getBrainLanguage } from './brain-language.js';
import { BrainError } from './errors.js';
import { isLegacyStarterScript, LEGACY_STARTER_SCRIPT_HASHES } from './legacy-assets.js';
import { hasMethodologyField, inferMethodology } from './methodology.js';
import { parseFrontmatter, readPlayMeta } from './plays.js';
import { findGlossaryFile } from './sales-library.js';
import { parseScript } from './sales-scripts.js';
import { findSampleContent } from './sample-content.js';

// Line appended to sales/system.md so the assistant and the sales page find a Spanish-named glossary.
const GLOSSARY_LINE = Object.freeze({ en: 'Glossary', es: 'Glosario' });
const GLOSSARY_MARKER = '<!-- clc-brain:migrate glossary-link -->';

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};
const exists = (file) => {
  try {
    fs.lstatSync(file);
    return true;
  } catch {
    return false;
  }
};
const mdFiles = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort();
  } catch {
    return [];
  }
};
const abs = (rootDir, rel) => path.join(rootDir, ...rel.split('/'));

/** Title for a script header: the body's first "# " heading, else the file name in words. */
function scriptTitle(stem, body) {
  const h1 = /^#\s+(.+?)\s*#*\s*$/m.exec(body)?.[1]?.trim();
  return (h1 || stem.replace(/[-_]+/g, ' ')).replace(/\s+/g, ' ');
}

/** The minimal header that makes `body` a script, or null when the body does not already follow the script grammar. */
export function scriptHeaderFor(stem, body) {
  const title = scriptTitle(stem, body);
  const next = `---\nscript: ${stem}\ntitle: ${title}\nversion: 1\nstatus: active\n---\n${body}`;
  return parseScript(next, { fileStem: stem }).diagnostics.length === 0 ? next : null;
}

function scriptSteps(rootDir) {
  const dir = abs(rootDir, 'sales/scripts');
  return mdFiles(dir).filter((name) => name !== 'README.md').flatMap((name) => {
    const rel = `sales/scripts/${name}`;
    const text = readText(path.join(dir, name)) ?? '';
    if (parseFrontmatter(text) !== null) return [];
    if (name in LEGACY_STARTER_SCRIPT_HASHES && isLegacyStarterScript(name, text)) return [];
    const next = scriptHeaderFor(name.replace(/\.md$/, ''), text);
    return [next === null ? { id: 'script-convert', path: rel, change: false } : { id: 'script-header', path: rel, change: true, current: text, next }];
  });
}

function glossaryStep(rootDir) {
  const salesDir = abs(rootDir, 'sales');
  const file = findGlossaryFile(salesDir);
  if (file === null || file === 'glossary.md') return [];
  const current = readText(path.join(salesDir, 'system.md'));
  if (current === null || current.includes(`](./${file}`) || current.includes(`](${file}`)) return [];
  const label = GLOSSARY_LINE[getBrainLanguage(rootDir)] ?? GLOSSARY_LINE.en;
  const next = `${current.replace(/\s*$/, '')}\n\n${GLOSSARY_MARKER}\n- ${label}: [${file}](./${file})\n`;
  return [{ id: 'glossary-link', path: 'sales/system.md', change: true, glossary: file, current, next }];
}

/** Kernel text with `methodology` placed right after `language` (else after `version`), keeping every other key. */
function kernelWithMethodology(kernel, methodology) {
  const after = 'language' in kernel ? 'language' : 'version';
  const out = {};
  for (const [key, value] of Object.entries(kernel)) {
    out[key] = value;
    if (key === after) out.methodology = methodology;
  }
  if (!('methodology' in out)) out.methodology = methodology;
  return `${JSON.stringify(out, null, 2)}\n`;
}

function methodologyStep(rootDir) {
  if (hasMethodologyField(rootDir)) return [];
  const current = readText(abs(rootDir, 'org-kernel.json'));
  let kernel;
  try {
    kernel = JSON.parse(current);
  } catch {
    return [];
  }
  if (kernel === null || typeof kernel !== 'object' || Array.isArray(kernel)) return [];
  const methodology = inferMethodology(rootDir);
  return [{ id: 'methodology', path: 'org-kernel.json', change: true, methodology, current, next: kernelWithMethodology(kernel, methodology) }];
}

function industryRowsStep(rootDir) {
  const dir = abs(rootDir, 'sales/plays');
  const count = mdFiles(dir).filter((f) => f !== 'README.md')
    .reduce((n, f) => n + readPlayMeta(f, readText(path.join(dir, f)) ?? '').branches.filter((b) => b.industry).length, 0);
  return count > 0 ? [{ id: 'industry-rows', change: false, count }] : [];
}

function legacySampleSteps(rootDir) {
  const icp = findSampleContent(rootDir).sampleIcp;
  const scriptsDir = abs(rootDir, 'sales/scripts');
  const scripts = mdFiles(scriptsDir).filter((name) => name in LEGACY_STARTER_SCRIPT_HASHES && isLegacyStarterScript(name, readText(path.join(scriptsDir, name)) ?? ''));
  return [...(icp?.unmodified ? [icp.path] : []), ...scripts.map((name) => `sales/scripts/${name}`)]
    .map((rel) => ({ id: 'legacy-sample', path: rel, change: false }));
}

/**
 * What `migrate` would do. Steps with `change: true` carry `current` and `next` file text; `blocked: 'backup-exists'`
 * marks a change that will be skipped because its `.bak` copy already exists. Other steps are notes for the person.
 * @returns {{ steps: Array<{ id: 'script-header'|'script-convert'|'glossary-link'|'methodology'|'industry-rows'|'legacy-sample',
 *   change: boolean, path?: string, current?: string, next?: string, blocked?: string, methodology?: string, glossary?: string, count?: number }> }}
 */
export function planMigration(rootDir) {
  if (!fs.existsSync(path.join(rootDir, 'org-kernel.json'))) {
    throw new BrainError('NOT_A_BRAIN', `${rootDir} is not a brain (no org-kernel.json). Run "clc-brain init" first.`, { dir: rootDir });
  }
  const steps = [...methodologyStep(rootDir), ...scriptSteps(rootDir), ...glossaryStep(rootDir), ...industryRowsStep(rootDir), ...legacySampleSteps(rootDir)];
  for (const step of steps) {
    if (step.change && exists(`${abs(rootDir, step.path)}.bak`)) step.blocked = 'backup-exists';
  }
  return { steps };
}

/**
 * Write the planned changes. Each file is first copied to `<file>.bak` (never over an existing one); a file whose
 * text changed since the plan was made, or that is a link rather than a file, is skipped.
 * @returns {{ applied: string[], skipped: Array<{ path: string, reason: 'backup-exists'|'changed'|'not-a-file' }> }}
 */
export function applyMigration(rootDir, plan) {
  const result = { applied: [], skipped: [] };
  for (const step of plan.steps.filter((s) => s.change)) {
    const file = abs(rootDir, step.path);
    if (!fs.lstatSync(file, { throwIfNoEntry: false })?.isFile()) {
      result.skipped.push({ path: step.path, reason: 'not-a-file' });
      continue;
    }
    if (readText(file) !== step.current) {
      result.skipped.push({ path: step.path, reason: 'changed' });
      continue;
    }
    try {
      fs.copyFileSync(file, `${file}.bak`, fs.constants.COPYFILE_EXCL);
    } catch (err) {
      if (err.code !== 'EEXIST') throw new BrainError('MIGRATE_WRITE_FAILED', `Could not back up ${step.path}: ${err.message}`, { path: step.path });
      result.skipped.push({ path: step.path, reason: 'backup-exists' });
      continue;
    }
    fs.writeFileSync(file, step.next, 'utf8');
    result.applied.push(step.path);
  }
  return result;
}
