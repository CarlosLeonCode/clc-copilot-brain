// What a healthy brain must contain. Lists are derived from templates/base so adding a
// skill to the templates automatically extends scaffolding, doctor, and repair.
import path from 'node:path';
import { listMarkdownFiles } from './fs-utils.js';
import { listSkillNames } from './harness-adapters.js';
import { TEMPLATES_BASE_DIR } from './package-paths.js';

export const SSOT_FILE = 'AGENTS.md';
export const IDE_ADAPTERS = Object.freeze(['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules']);

export function templateDirs(templatesBaseDir = TEMPLATES_BASE_DIR) {
  return {
    agentSkills: path.join(templatesBaseDir, '.agents', 'skills'),
    rootSkills: path.join(templatesBaseDir, 'skills')
  };
}

/**
 * Expected assets per group, read from the templates directory.
 * `agentSkills` are skill names (each `.agents/skills/<name>/SKILL.md`, the single source of every slash command);
 * `rootSkills` are markdown file names in `skills/`.
 */
export function expectedAssets(templatesBaseDir = TEMPLATES_BASE_DIR) {
  const dirs = templateDirs(templatesBaseDir);
  return {
    agentSkills: listSkillNames(dirs.agentSkills),
    rootSkills: listMarkdownFiles(dirs.rootSkills)
  };
}
