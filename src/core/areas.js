// Operational areas: presets, id rules, kernel persistence, and add/list use cases.
import fs from 'node:fs';
import path from 'node:path';
import { BrainError } from './errors.js';
import { DEFAULT_LANGUAGE, parseLanguage } from './brain-language.js';
import { copyDirRecursive, ensureDir, isInside } from './fs-utils.js';
import { DEFAULT_METHODOLOGY, parseMethodology } from './methodology.js';
import { PLAYBOOKS_DIR, TEMPLATES_AREAS_DIR, TEMPLATES_LOCALES_DIR, TEMPLATES_METHODOLOGIES_DIR } from './package-paths.js';

export const AREA_ID_PATTERN = /^[a-z0-9_-]+$/;

export const PRESET_AREAS = Object.freeze([
  { id: 'sales', name: 'Sales', description: 'Revenue enablement, ICPs, battlecards, objection handling matrices, scripts', playbook: '01-SALES-PLAYBOOK.md', defaultSelected: true },
  { id: 'marketing', name: 'Marketing', description: 'Brand guidelines, positioning statements, editorial calendar, distribution', playbook: '02-MARKETING-PLAYBOOK.md', defaultSelected: true },
  { id: 'product', name: 'Product', description: 'Roadmaps, feature briefs, PRDs, ADRs, release notes', playbook: '03-PRODUCT-PLAYBOOK.md', defaultSelected: false },
  { id: 'operations', name: 'Operations', description: 'Standard Operating Procedures (SOPs), tools catalog, vendor SLAs', playbook: '04-OPERATIONS-PLAYBOOK.md', defaultSelected: false },
  { id: 'hr_people', name: 'HR & People', description: 'Culture handbook, hiring scorecards, 30-60-90 day onboarding plans', playbook: '05-PEOPLE-PLAYBOOK.md', defaultSelected: false },
  { id: 'finance_legal', name: 'Finance & Legal', description: 'Pricing models, discount approval matrices, privacy & NDA templates', playbook: '06-FINANCE-LEGAL-PLAYBOOK.md', defaultSelected: false }
]);

export const PRESET_AREA_IDS = Object.freeze(PRESET_AREAS.map((a) => a.id));

/**
 * Folder with an area's starter content translated to `lang` (templates/locales/<lang>/areas/<area>/),
 * or null for English, an unsupported language, or when no translation ships.
 */
export function localeAreaDir(areaId, lang, templatesLocalesDir = TEMPLATES_LOCALES_DIR) {
  const language = parseLanguage(lang);
  if (!language || language === DEFAULT_LANGUAGE || !AREA_ID_PATTERN.test(areaId)) return null;
  const dir = path.join(templatesLocalesDir, language, 'areas', areaId);
  return fs.existsSync(dir) ? dir : null;
}

/**
 * Folders of a methodology set for an area, in overlay order: the set
 * (templates/methodologies/<method>/areas/<area>/), then its translation to `lang`
 * (templates/methodologies/<method>/locales/<lang>/areas/<area>/). Only folders that exist; [] for meddpicc
 * (the base area is the meddpicc set), an invalid id, or a method without a set.
 */
export function methodologyAreaDirs(areaId, methodology, lang, templatesMethodologiesDir = TEMPLATES_METHODOLOGIES_DIR) {
  const method = parseMethodology(methodology);
  if (!method || method === DEFAULT_METHODOLOGY || !AREA_ID_PATTERN.test(areaId)) return [];
  const dirs = [path.join(templatesMethodologiesDir, method, 'areas', areaId)];
  const language = parseLanguage(lang);
  if (language && language !== DEFAULT_LANGUAGE) dirs.push(path.join(templatesMethodologiesDir, method, 'locales', language, 'areas', areaId));
  return dirs.filter((dir) => fs.existsSync(dir));
}

/**
 * Every folder that overlays templates/areas/<area>/, least specific first: the base translation, the methodology
 * set, then the methodology translation. A later folder wins for the same file name.
 */
export function areaOverlayDirs(areaId, { lang = DEFAULT_LANGUAGE, methodology = DEFAULT_METHODOLOGY, templatesLocalesDir = TEMPLATES_LOCALES_DIR, templatesMethodologiesDir = TEMPLATES_METHODOLOGIES_DIR } = {}) {
  const locale = localeAreaDir(areaId, lang, templatesLocalesDir);
  return [...(locale ? [locale] : []), ...methodologyAreaDirs(areaId, methodology, lang, templatesMethodologiesDir)];
}

/**
 * Copy an area's templates into destDir, then its overlays on top (same file names): the translation for `lang`,
 * the `methodology` set and its translation. `replacer` and `filter` apply to every copy.
 */
export function copyAreaTemplates(areaId, destDir, { lang = DEFAULT_LANGUAGE, methodology = DEFAULT_METHODOLOGY, replacer = null, filter = null } = {}) {
  const src = path.join(TEMPLATES_AREAS_DIR, areaId);
  if (!fs.existsSync(src)) return false;
  copyDirRecursive(src, destDir, { replacer, filter });
  for (const overlay of areaOverlayDirs(areaId, { lang, methodology })) copyDirRecursive(overlay, destDir, { replacer, filter });
  return true;
}

export function findPreset(areaId) {
  return PRESET_AREAS.find((a) => a.id === areaId) || null;
}

/** Returns the reason an area id is invalid, or null when it is acceptable. */
export function areaIdError(areaId, installedAreas = []) {
  if (typeof areaId !== 'string' || !areaId.trim()) return 'Area name is required';
  if (!AREA_ID_PATTERN.test(areaId.trim())) return 'Only lowercase letters, numbers, hyphens, and underscores';
  if (installedAreas.includes(areaId.trim())) return 'An area with this name is already installed';
  return null;
}

export function readKernel(rootDir) {
  const kernelPath = path.join(rootDir, 'org-kernel.json');
  if (!fs.existsSync(kernelPath)) {
    throw new BrainError('KERNEL_MISSING', `No org-kernel.json found at ${rootDir}. Please run "copilot-brain init" first.`);
  }
  try {
    return JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
  } catch (err) {
    throw new BrainError('KERNEL_INVALID', `Failed to parse org-kernel.json: ${err.message}`);
  }
}

function saveKernelWithArea(rootDir, kernel, areaId) {
  kernel.activeAreas = [...(kernel.activeAreas || []), areaId];
  if (kernel.metadata) kernel.metadata.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(rootDir, 'org-kernel.json'), JSON.stringify(kernel, null, 2) + '\n', 'utf8');
}

/** Installed areas (with on-disk status) and uninstalled presets. Missing/corrupt kernel => none installed. */
export function listAreas(rootDir) {
  let activeAreas = [];
  try {
    activeAreas = readKernel(rootDir).activeAreas || [];
  } catch {
    // An absent or unreadable kernel simply means nothing is installed yet.
  }
  return {
    installed: activeAreas.map((id) => {
      const preset = findPreset(id);
      return {
        id,
        name: preset ? preset.name : id,
        description: preset ? preset.description : 'Custom Area',
        onDisk: fs.existsSync(path.join(rootDir, id))
      };
    }),
    available: PRESET_AREAS.filter((a) => !activeAreas.includes(a.id))
  };
}

export function uninstalledPresets(rootDir) {
  const kernel = readKernel(rootDir);
  return PRESET_AREAS.filter((a) => !(kernel.activeAreas || []).includes(a.id));
}

export function addPresetArea(rootDir, areaId) {
  const kernel = readKernel(rootDir);
  const preset = findPreset(areaId);
  if (!preset) throw new BrainError('INVALID_PRESET', `Invalid preset area ID: "${areaId}"`);
  if ((kernel.activeAreas || []).includes(areaId)) {
    throw new BrainError('AREA_EXISTS', `Area "${areaId}" is already installed`);
  }

  const replacer = (content) => content
    .replaceAll('{{COMPANY_NAME}}', kernel.organization?.name || 'Organization')
    .replaceAll('{{INDUSTRY}}', kernel.organization?.industry || 'Industry')
    .replaceAll('{{TAGLINE}}', kernel.organization?.tagline || '');
  copyAreaTemplates(areaId, path.join(rootDir, areaId), {
    lang: parseLanguage(kernel.language) ?? DEFAULT_LANGUAGE,
    methodology: parseMethodology(kernel.methodology) ?? DEFAULT_METHODOLOGY,
    replacer
  });

  const srcPlaybook = path.join(PLAYBOOKS_DIR, preset.playbook);
  if (fs.existsSync(srcPlaybook)) {
    ensureDir(path.join(rootDir, 'playbooks'));
    fs.copyFileSync(srcPlaybook, path.join(rootDir, 'playbooks', preset.playbook));
  }

  saveKernelWithArea(rootDir, kernel, areaId);
  return { area: preset };
}

export function defaultAreaTitle(areaId) {
  return areaId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Scaffold a custom area. The id rule is enforced here so every adapter path is covered.
 * @param {string} rootDir
 * @param {{ id: string, title?: string, description?: string }} spec
 */
export function addCustomArea(rootDir, { id, title, description }) {
  const kernel = readKernel(rootDir);
  const reason = areaIdError(id, kernel.activeAreas || []);
  if (reason) throw new BrainError('INVALID_AREA_ID', `Invalid custom area "${id}": ${reason}`);

  const areaId = id.trim();
  const destAreaDir = path.resolve(rootDir, areaId);
  if (!isInside(path.resolve(rootDir), destAreaDir)) {
    throw new BrainError('INVALID_AREA_ID', `Custom area "${areaId}" resolves outside the brain root`);
  }
  const areaTitle = title || defaultAreaTitle(areaId);
  const areaDescription = description || 'Operational governance and standard documentation for this domain';

  ensureDir(path.join(destAreaDir, 'docs'));
  ensureDir(path.join(destAreaDir, 'policies'));
  const readme = `# ${areaTitle}\n\n> **Purpose:** ${areaDescription}\n> **Steward:** Area Lead\n\n## Structure\n- [docs/](./docs/): Technical documentation and guides\n- [policies/](./policies/): Domain policies and operational controls\n\n## Governance\n- Review Cadence: Quarterly\n- Maintainer updates should follow standard pull request workflows.\n`;
  fs.writeFileSync(path.join(destAreaDir, 'README.md'), readme, 'utf8');

  saveKernelWithArea(rootDir, kernel, areaId);
  return { area: { id: areaId, name: areaTitle, description: areaDescription } };
}

/**
 * Areas a client may target: presets plus the kernel's activeAreas, keeping only ids that
 * match AREA_ID_PATTERN and whose real path stays inside rootDir (symlinks included).
 */
export function resolveAllowedAreas(rootDir) {
  let declared = [];
  try {
    const active = readKernel(rootDir).activeAreas;
    if (Array.isArray(active)) declared = active;
  } catch {
    // No kernel: presets only.
  }
  const realRoot = fs.existsSync(rootDir) ? fs.realpathSync(rootDir) : path.resolve(rootDir);
  const candidates = [...new Set([...PRESET_AREA_IDS, ...declared])];
  return candidates.filter((id) => {
    if (typeof id !== 'string' || !AREA_ID_PATTERN.test(id)) return false;
    const areaPath = path.join(rootDir, id);
    const resolved = fs.existsSync(areaPath) ? fs.realpathSync(areaPath) : path.join(realRoot, id);
    return isInside(realRoot, resolved);
  });
}
