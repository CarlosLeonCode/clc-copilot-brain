// What a healthy brain must contain. Lists are derived from templates/base so adding a
// command or skill to the templates automatically extends scaffolding, doctor, and repair.
import path from 'node:path';
import { listMarkdownFiles } from './fs-utils.js';
import { TEMPLATES_BASE_DIR } from './package-paths.js';

export const SSOT_FILE = 'AGENTS.md';
export const IDE_ADAPTERS = Object.freeze(['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules']);

export function templateDirs(templatesBaseDir = TEMPLATES_BASE_DIR) {
  return {
    commands: path.join(templatesBaseDir, '.claude', 'commands'),
    agentSkills: path.join(templatesBaseDir, '.agents', 'skills'),
    rootSkills: path.join(templatesBaseDir, 'skills')
  };
}

/** Expected file names per asset group, read from the templates directory. */
export function expectedAssets(templatesBaseDir = TEMPLATES_BASE_DIR) {
  const dirs = templateDirs(templatesBaseDir);
  return {
    commands: listMarkdownFiles(dirs.commands),
    agentSkills: listMarkdownFiles(dirs.agentSkills),
    rootSkills: listMarkdownFiles(dirs.rootSkills)
  };
}
