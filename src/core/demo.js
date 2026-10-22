// Demo (mock) assets shipped in templates/areas: excluded in clean mode, removable via clean-demo.
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES_AREAS_DIR } from './package-paths.js';

const DEMO_FILE_NAMES = Object.freeze([
  'pricing-too-high.json',
  'pricing-too-high.md',
  'competitor-alpha.json',
  'competitor-alpha.md',
  'fintech-scale-case-study.md',
  'enterprise-cto.md',
  'incident-management.json',
  'incident-management.md'
]);
// Call logs live in calls/YYYY-MM/; any such file inside the templates is seeded sample data.
const DATED_CALL = /(^|[\\/])calls[\\/]\d{4}-\d{2}([\\/]|$)/;

/** True when a template file (or dated calls/ dir) is demo data (used as the clean-mode copy filter). */
export function isDemoTemplateAsset(templatePath) {
  const base = path.basename(templatePath);
  return DEMO_FILE_NAMES.includes(base) || base.startsWith('sample-') || DATED_CALL.test(templatePath);
}

function walkFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(abs, base);
    return entry.isFile() ? [path.relative(base, abs)] : [];
  });
}

/** Paths (relative to a brain root, e.g. "sales/calls/2026-09/x.md") that the templates seed as demo data. */
export function demoAssetPaths(templatesAreasDir = TEMPLATES_AREAS_DIR) {
  return walkFiles(templatesAreasDir).filter((rel) => isDemoTemplateAsset(rel));
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when `actual` is the template content, allowing any value where the template has {{PLACEHOLDERS}}. */
function matchesTemplate(actual, template) {
  if (actual === template) return true;
  if (!/\{\{[A-Z_]+\}\}/.test(template)) return false;
  const pattern = template.split(/\{\{[A-Z_]+\}\}/).map(escapeRegExp).join('[\\s\\S]*?');
  return new RegExp(`^${pattern}$`).test(actual);
}

/**
 * Remove seeded demo files from a brain, then prune directories emptied by the removal
 * (never the area root). Files not seeded by the templates are never touched, and seeded
 * files whose content was edited by the user are kept and reported instead of removed.
 * @returns {{ removed: string[], kept: string[] }} paths relative to rootDir
 */
export function cleanDemo(rootDir, { templatesAreasDir = TEMPLATES_AREAS_DIR } = {}) {
  const removed = [];
  const kept = [];
  for (const rel of demoAssetPaths(templatesAreasDir)) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs) || !fs.lstatSync(abs).isFile()) continue;
    const template = fs.readFileSync(path.join(templatesAreasDir, rel), 'utf-8');
    if (!matchesTemplate(fs.readFileSync(abs, 'utf-8'), template)) {
      kept.push(rel);
      continue;
    }
    fs.unlinkSync(abs);
    removed.push(rel);

    const areaRoot = path.join(rootDir, rel.split(path.sep)[0]);
    for (let dir = path.dirname(abs); dir !== areaRoot && dir.startsWith(areaRoot); dir = path.dirname(dir)) {
      if (fs.readdirSync(dir).length > 0) break;
      fs.rmdirSync(dir);
      removed.push(path.relative(rootDir, dir));
    }
  }
  return { removed, kept };
}
