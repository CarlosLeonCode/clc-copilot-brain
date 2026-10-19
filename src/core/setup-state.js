// Whether the guided setup has been done (org-kernel.json `setup.completed`).
// Brains made before the field existed: still on the init default company name means "pending", else "unknown".
import fs from 'node:fs';
import path from 'node:path';
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
