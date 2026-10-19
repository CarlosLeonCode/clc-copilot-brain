// Whether the guided setup has been done (org-kernel.json `setup.completed`).
// Brains made before the field existed: still on the init default company name means "pending", else "unknown".
import fs from 'node:fs';
import path from 'node:path';
import { getBrainLanguage } from './brain-language.js';
import { INIT_DEFAULTS } from './scaffold.js';

/** @returns {'pending' | 'done' | 'unknown'} */
export function getSetupState(rootDir) {
  let kernel;
  try {
    kernel = JSON.parse(fs.readFileSync(path.join(rootDir, 'org-kernel.json'), 'utf8'));
  } catch {
    return 'unknown';
  }
  const completed = kernel?.setup?.completed;
  if (typeof completed === 'boolean') return completed ? 'done' : 'pending';
  return kernel?.organization?.name === INIT_DEFAULTS.companyName ? 'pending' : 'unknown';
}

/**
 * What the start screen needs to know about a folder; null when it has no org-kernel.json.
 * @returns {{ name: string, language: string, setup: 'pending' | 'done' | 'unknown', areas: string[] } | null}
 */
export function getBrainSummary(rootDir) {
  if (!fs.existsSync(path.join(rootDir, 'org-kernel.json'))) return null;
  let kernel = {};
  try {
    kernel = JSON.parse(fs.readFileSync(path.join(rootDir, 'org-kernel.json'), 'utf8')) ?? {};
  } catch {
    // An unreadable kernel is still a brain; the start screen shows what it can.
  }
  const name = typeof kernel.organization?.name === 'string' && kernel.organization.name.trim() ? kernel.organization.name.trim() : path.basename(path.resolve(rootDir));
  const areas = Array.isArray(kernel.activeAreas) ? kernel.activeAreas.filter((a) => typeof a === 'string') : [];
  return { name, language: getBrainLanguage(rootDir), setup: getSetupState(rootDir), areas };
}
