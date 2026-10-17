// Scaffold a brain from the packaged templates and wire the multi-IDE adapters.
import fs from 'node:fs';
import path from 'node:path';
import { AREA_ID_PATTERN, findPreset } from './areas.js';
import { isDemoTemplateAsset } from './demo.js';
import { BrainError } from './errors.js';
import { copyDirRecursive, ensureDir } from './fs-utils.js';
import { IDE_ADAPTERS, SSOT_FILE, expectedAssets, templateDirs } from './manifest.js';
import { PLAYBOOKS_DIR, SCHEMAS_DIR, TEMPLATES_AREAS_DIR, TEMPLATES_BASE_DIR } from './package-paths.js';

export const INIT_DEFAULTS = Object.freeze({
  companyName: 'Acme Corp',
  industry: 'Enterprise Software & Developer Tools',
  tagline: 'Deterministic institutional knowledge for human teams and AI coding agents'
});

export function fallbackAdapterContent(adapter) {
  return `<!-- Multi-IDE Adapter for ${adapter} -->\n# Single Source of Truth Reference\n\nAll AI assistant behavior, repository rules, and domain context are canonically defined in [AGENTS.md](./AGENTS.md).\n\nPlease read and adhere to all instructions specified in \`AGENTS.md\`.\n`;
}

function linkAdapter(adapterPath, adapter) {
  try {
    fs.symlinkSync(SSOT_FILE, adapterPath);
    return 'symlink';
  } catch {
    fs.writeFileSync(adapterPath, fallbackAdapterContent(adapter), 'utf8');
    return 'fallback_file';
  }
}

function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

/**
 * Point every IDE adapter at AGENTS.md and copy missing Claude slash commands.
 * A regular (non-symlink) file is never deleted: with `backupRegularFiles` it is renamed to
 * `<adapter>.bak` before linking (skipped if that backup already exists); otherwise it is kept.
 * @param {string} targetDir
 * @param {{ backupRegularFiles?: boolean, templatesBaseDir?: string }} [opts]
 * @returns {Array<{ adapter: string, status: string, backup?: string, reason?: string }>}
 */
export function setupIdeAdapters(targetDir, { backupRegularFiles = true, templatesBaseDir = TEMPLATES_BASE_DIR } = {}) {
  const results = [];

  for (const adapter of IDE_ADAPTERS) {
    const adapterPath = path.join(targetDir, adapter);
    const stat = lstatOrNull(adapterPath);

    if (stat?.isSymbolicLink()) {
      fs.unlinkSync(adapterPath);
    } else if (stat?.isFile()) {
      if (fs.readFileSync(adapterPath, 'utf8') === fallbackAdapterContent(adapter)) {
        results.push({ adapter, status: 'fallback_file' });
        continue;
      }
      const backup = `${adapter}.bak`;
      if (!backupRegularFiles) {
        results.push({ adapter, status: 'kept', reason: 'existing regular file left untouched' });
        continue;
      }
      if (lstatOrNull(path.join(targetDir, backup))) {
        results.push({ adapter, status: 'skipped', reason: `${backup} already exists; existing file left untouched` });
        continue;
      }
      fs.renameSync(adapterPath, path.join(targetDir, backup));
      results.push({ adapter, status: 'backed_up', backup, linked: linkAdapter(adapterPath, adapter) });
      continue;
    } else if (stat) {
      results.push({ adapter, status: 'skipped', reason: 'path exists and is not a file' });
      continue;
    }

    results.push({ adapter, status: linkAdapter(adapterPath, adapter) });
  }

  const commandsSrc = templateDirs(templatesBaseDir).commands;
  const commandsDest = path.join(targetDir, '.claude', 'commands');
  for (const cmdFile of expectedAssets(templatesBaseDir).commands) {
    const destFile = path.join(commandsDest, cmdFile);
    if (!fs.existsSync(destFile)) {
      ensureDir(commandsDest);
      fs.copyFileSync(path.join(commandsSrc, cmdFile), destFile);
      results.push({ adapter: `.claude/commands/${cmdFile}`, status: 'copied' });
    }
  }

  return results;
}

/** Copy template root skills missing from the brain. Returns the copied file names. */
export function restoreRootSkills(targetDir, { templatesBaseDir = TEMPLATES_BASE_DIR } = {}) {
  const src = templateDirs(templatesBaseDir).rootSkills;
  const dest = path.join(targetDir, 'skills');
  const copied = [];
  for (const skill of expectedAssets(templatesBaseDir).rootSkills) {
    if (!fs.existsSync(path.join(dest, skill))) {
      ensureDir(dest);
      fs.copyFileSync(path.join(src, skill), path.join(dest, skill));
      copied.push(skill);
    }
  }
  return copied;
}

/**
 * Initialize a brain in targetDir.
 * @param {string} targetDir
 * @param {{ companyName?: string, industry?: string, tagline?: string, areas: string[], demo?: boolean }} opts
 * @returns {{ targetDir: string, areas: string[], adapters: ReturnType<typeof setupIdeAdapters> }}
 */
export function initBrain(targetDir, { companyName = INIT_DEFAULTS.companyName, industry = INIT_DEFAULTS.industry, tagline = INIT_DEFAULTS.tagline, areas, demo = false }) {
  const invalid = areas.filter((id) => !AREA_ID_PATTERN.test(id));
  if (invalid.length > 0) {
    throw new BrainError('INVALID_AREA_ID', `Invalid area id(s): ${invalid.join(', ')}. Use lowercase letters, numbers, hyphens, and underscores.`);
  }
  ensureDir(targetDir);

  const nowIso = new Date().toISOString();
  const areasList = areas.map((id) => {
    const meta = findPreset(id) || { name: id, description: 'Custom Domain' };
    return `- [${meta.name}/](./${id}/): ${meta.description}`;
  }).join('\n');
  const replacer = (content) => content
    .replaceAll('{{COMPANY_NAME}}', companyName)
    .replaceAll('{{INDUSTRY}}', industry)
    .replaceAll('{{TAGLINE}}', tagline)
    .replaceAll('{{ACTIVE_AREAS_JSON}}', JSON.stringify(areas, null, 2))
    .replaceAll('{{ACTIVE_AREAS_LIST}}', areasList)
    .replaceAll('{{CREATED_AT}}', nowIso)
    .replaceAll('{{UPDATED_AT}}', nowIso);

  // Base templates: org-kernel.json, company-profile.md, AGENTS.md, .agents/, .claude/, skills/
  copyDirRecursive(TEMPLATES_BASE_DIR, targetDir, { replacer });
  const adapters = setupIdeAdapters(targetDir);
  copyDirRecursive(SCHEMAS_DIR, path.join(targetDir, 'schemas'));

  const playbooksDest = path.join(targetDir, 'playbooks');
  ensureDir(playbooksDest);
  fs.copyFileSync(path.join(PLAYBOOKS_DIR, '00-FRAMEWORK-OVERVIEW.md'), path.join(playbooksDest, '00-FRAMEWORK-OVERVIEW.md'));

  for (const areaId of areas) {
    const preset = findPreset(areaId);
    if (preset && fs.existsSync(path.join(PLAYBOOKS_DIR, preset.playbook))) {
      fs.copyFileSync(path.join(PLAYBOOKS_DIR, preset.playbook), path.join(playbooksDest, preset.playbook));
    }
    const srcAreaDir = path.join(TEMPLATES_AREAS_DIR, areaId);
    if (fs.existsSync(srcAreaDir)) {
      copyDirRecursive(srcAreaDir, path.join(targetDir, areaId), {
        replacer,
        filter: demo ? null : (srcPath) => !isDemoTemplateAsset(srcPath)
      });
    }
  }

  return { targetDir, areas, adapters };
}
