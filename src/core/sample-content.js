// Leftover sample content from the starter templates in a brain: the sample ICP and the sample names
// (Acme, Juanita, Pepito) in the brain's own skills. Read-only; doctor and migrate report what it finds.
import fs from 'node:fs';
import path from 'node:path';
import { isLegacySampleFile } from './legacy-assets.js';
import { effectiveMethodology } from './methodology.js';

export const SAMPLE_ICP = 'sales/icps/enterprise-cto.md';
// Whole words only, any case: "acme-corp" matches, "acmeology" does not.
export const SAMPLE_NAMES = /\b(acme|juanita|pepito)\b/i;

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

/** Markdown files under `dir` (relative to rootDir, "/" separators), recursively and sorted; symlinks are skipped. */
function markdownFiles(rootDir, dir, { recursive }) {
  let entries;
  try {
    entries = fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return recursive ? markdownFiles(rootDir, rel, { recursive }) : [];
    return e.isFile() && e.name.endsWith('.md') ? [rel] : [];
  }).sort();
}

/**
 * What sample content a brain still holds.
 * `sampleIcp`: null, or { path, unmodified } for sales/icps/enterprise-cto.md. It is worth reporting when it is an
 * unmodified copy, or in any case when the brain sells with a method other than meddpicc (the kernel field, else inferred), since it profiles enterprise deals.
 * `namedSkills`: the brain's own skills (.agents/skills/**, skills/*.md) that still use the sample names.
 * @returns {{ sampleIcp: { path: string, unmodified: boolean, report: boolean } | null, namedSkills: string[], methodology: string }}
 */
export function findSampleContent(rootDir) {
  const methodology = effectiveMethodology(rootDir);
  const icpText = readText(path.join(rootDir, ...SAMPLE_ICP.split('/')));
  let sampleIcp = null;
  if (icpText !== null) {
    const unmodified = isLegacySampleFile(SAMPLE_ICP, icpText);
    sampleIcp = { path: SAMPLE_ICP, unmodified, report: unmodified || methodology !== 'meddpicc' };
  }
  const skills = [...markdownFiles(rootDir, '.agents/skills', { recursive: true }), ...markdownFiles(rootDir, 'skills', { recursive: false })];
  const namedSkills = skills.filter((rel) => SAMPLE_NAMES.test(readText(path.join(rootDir, ...rel.split('/'))) ?? ''));
  return { sampleIcp, namedSkills, methodology };
}
