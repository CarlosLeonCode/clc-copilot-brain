// Locations of the assets shipped inside the npm package.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATES_BASE_DIR = path.join(PKG_ROOT, 'templates', 'base');
export const TEMPLATES_AREAS_DIR = path.join(PKG_ROOT, 'templates', 'areas');
// Translated starter content: templates/locales/<lang>/areas/<area>/ overlays templates/areas/<area>/.
export const TEMPLATES_LOCALES_DIR = path.join(PKG_ROOT, 'templates', 'locales');
export const SCHEMAS_DIR = path.join(PKG_ROOT, 'schemas');
export const PLAYBOOKS_DIR = path.join(PKG_ROOT, 'playbooks');

export function readPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}
