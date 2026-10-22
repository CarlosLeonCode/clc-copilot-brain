// The brain's sales methodology (org-kernel.json `methodology`): which starter sales set and qualification fallback apply.
// "meddpicc" (enterprise deals, the default and what brains made before this field use) or "sandler" (small and
// mid-size businesses, short cycles). Any other slug is kept for a team's own method, with no starter set of its own.
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_METHODOLOGY = 'meddpicc';
export const BUILT_IN_METHODOLOGIES = Object.freeze(['meddpicc', 'sandler']);
export const METHODOLOGY_HELP = 'The methodology must be "meddpicc" (enterprise deals) or "sandler" (small and mid-size businesses), for example: --methodology sandler';

const SLUG = /^[a-z0-9][a-z0-9_-]*$/;

/** Lowercase slug (spaces around ignored), else null. */
export function parseMethodology(value) {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return SLUG.test(slug) ? slug : null;
}

/** "meddpicc" or "sandler" (case and spaces ignored), else null: the methods `init` can scaffold. */
export function parseBuiltInMethodology(value) {
  const slug = parseMethodology(value);
  return BUILT_IN_METHODOLOGIES.includes(slug) ? slug : null;
}

/** Methodology stored in the brain's org-kernel.json; meddpicc when the file or field is missing or invalid. */
export function getMethodology(rootDir) {
  try {
    const kernel = JSON.parse(fs.readFileSync(path.join(rootDir, 'org-kernel.json'), 'utf8'));
    return parseMethodology(kernel?.methodology) ?? DEFAULT_METHODOLOGY;
  } catch {
    return DEFAULT_METHODOLOGY;
  }
}
