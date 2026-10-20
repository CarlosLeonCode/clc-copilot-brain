// One source per slash command: `.agents/skills/<name>/SKILL.md` (Agent Skills format). Antigravity, OpenCode,
// Cursor, Gemini CLI, Windsurf, Codex and Copilot read that folder natively. This module writes the adapters the
// other harnesses need, and only ever overwrites or deletes files it can prove it generated:
//   .claude/skills/<name>/SKILL.md   Claude Code (does not read .agents/skills): the source plus a marker line
//   .gemini/commands/<name>.toml     Gemini CLI slash command
//   .windsurf/workflows/<name>.md    Windsurf slash workflow
// It also converts flat `.agents/skills/<name>.md` files to folders and removes old `.claude/commands/*.md`
// files whose content matches a version this package shipped (see legacy-assets.js).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './fs-utils.js';
import { LEGACY_COMMAND_HASHES, LEGACY_COMMAND_RENAMES, LEGACY_FLAT_SKILL_HASHES } from './legacy-assets.js';

export const SKILLS_DIR = '.agents/skills';
export const SKILL_FILE = 'SKILL.md';
// Agent Skills name rule: lowercase letters and digits, single hyphens, no leading or trailing hyphen.
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const LEGACY_COMMANDS_DIR = '.claude/commands';

const MARKER = /generated from \.agents\/skills\/([a-z0-9-]+)\/SKILL\.md — do not edit/;
const markerText = (name) => `generated from ${SKILLS_DIR}/${name}/${SKILL_FILE} — do not edit`;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** Adapter locations per skill name, as posix paths relative to the project root. */
export function adapterPaths(name) {
  return {
    claude: `.claude/skills/${name}/${SKILL_FILE}`,
    gemini: `.gemini/commands/${name}.toml`,
    windsurf: `.windsurf/workflows/${name}.md`
  };
}

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replaceAll("''", "'");
  return v;
}

/**
 * Parse SKILL.md frontmatter: top-level `key: value` lines plus one level of nested maps (`metadata:`).
 * @returns {{ fields: Record<string, any>, end: number } | null} `end` is the index just after the closing `---` line
 */
export function parseSkillFrontmatter(text) {
  const match = FRONTMATTER.exec(String(text));
  if (!match) return null;
  const fields = {};
  let parent = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const nested = /^\s+/.test(line);
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1);
    if (nested) {
      if (parent) fields[parent][key] = unquote(value);
      continue;
    }
    if (value.trim() === '') {
      fields[key] = {};
      parent = key;
    } else {
      fields[key] = unquote(value);
      parent = null;
    }
  }
  return { fields, end: match[0].length };
}

/** Problems with a source skill (empty when valid). */
export function validateSkill(folderName, text) {
  const fm = parseSkillFrontmatter(text);
  if (!fm) return ['missing frontmatter block'];
  const problems = [];
  const { name, description } = fm.fields;
  if (typeof name !== 'string' || !SKILL_NAME_PATTERN.test(name)) problems.push('name must use lowercase letters, digits and single hyphens');
  else if (name !== folderName) problems.push(`name "${name}" must match its folder "${folderName}"`);
  if (typeof description !== 'string' || !description.trim()) problems.push('description is missing');
  else if (/[\r\n]/.test(description)) problems.push('description must be one line');
  return problems;
}

/** Skill folders under `.agents/skills/` that hold a SKILL.md, sorted, with their validation problems. */
export function listSourceSkills(rootDir) {
  const dir = path.join(rootDir, ...SKILLS_DIR.split('/'));
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, SKILL_FILE)))
    .map((e) => {
      const text = fs.readFileSync(path.join(dir, e.name, SKILL_FILE), 'utf8');
      const fm = parseSkillFrontmatter(text);
      return { name: e.name, text, description: fm?.fields.description, problems: validateSkill(e.name, text) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Skill names (folders with a SKILL.md) in a skills directory, sorted. */
export function listSkillNames(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, SKILL_FILE)))
    .map((e) => e.name)
    .sort();
}

/** The three adapter files for one valid source skill, as [{ rel, content }]. */
export function renderAdapters({ name, text, description }) {
  const paths = adapterPaths(name);
  const source = `${SKILLS_DIR}/${name}/${SKILL_FILE}`;
  const fm = parseSkillFrontmatter(text);
  const claude = `${text.slice(0, fm.end)}<!-- ${markerText(name)} -->\n${text.slice(fm.end)}`;
  // JSON string escaping is valid for TOML basic strings and YAML double-quoted scalars.
  const gemini = `# ${markerText(name)}\ndescription = ${JSON.stringify(description)}\nprompt = """Read and follow ${source} exactly.\n\nUser input: {{args}}"""\n`;
  const windsurf = `---\ndescription: ${JSON.stringify(description)}\n---\n<!-- ${markerText(name)} -->\n\nRead and follow \`${source}\`. Pass along any text the user typed after the command.\n`;
  return [
    { rel: paths.claude, content: claude },
    { rel: paths.gemini, content: gemini },
    { rel: paths.windsurf, content: windsurf }
  ];
}

const sha256 = (text) => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'utf8').digest('hex');

function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

function removeEmptyDir(dir) {
  try {
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    // Missing or not empty: leave it.
  }
}

/** Generated adapters on disk as [{ rel, name }] (files that carry the marker), for stale cleanup. */
function generatedAdaptersOnDisk(rootDir) {
  const found = [];
  const scan = (relDir, pick) => {
    const abs = path.join(rootDir, ...relDir.split('/'));
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = pick(entry);
      if (!rel) continue;
      const file = path.join(rootDir, ...rel.split('/'));
      if (!lstatOrNull(file)?.isFile()) continue;
      const name = MARKER.exec(fs.readFileSync(file, 'utf8'))?.[1];
      if (name) found.push({ rel, name });
    }
  };
  scan('.claude/skills', (e) => (e.isDirectory() ? `.claude/skills/${e.name}/${SKILL_FILE}` : null));
  scan('.gemini/commands', (e) => (e.isFile() && e.name.endsWith('.toml') ? `.gemini/commands/${e.name}` : null));
  scan('.windsurf/workflows', (e) => (e.isFile() && e.name.endsWith('.md') ? `.windsurf/workflows/${e.name}` : null));
  return found;
}

/**
 * Bring every harness adapter in line with `.agents/skills/`. Idempotent; never overwrites or deletes a file
 * without proof it is generated (marker) or shipped by this package (known hash).
 * @param {string} rootDir project (brain) root
 * @param {{ dryRun?: boolean, removeLegacy?: boolean }} [opts]
 * @returns {{ written: string[], unchanged: string[], removed: string[], converted: Array<{ from: string, to: string }>,
 *   warnings: string[] }}
 */
export function generateHarnessAdapters(rootDir, { dryRun = false, removeLegacy = true } = {}) {
  const report = { written: [], unchanged: [], removed: [], converted: [], warnings: [] };
  const abs = (rel) => path.join(rootDir, ...rel.split('/'));
  const remove = (rel) => {
    if (!dryRun) fs.rmSync(abs(rel));
    report.removed.push(rel);
  };

  // 1. Flat skills (.agents/skills/<name>.md) become folders.
  const skillsAbs = abs(SKILLS_DIR);
  if (fs.existsSync(skillsAbs)) {
    for (const entry of fs.readdirSync(skillsAbs, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const name = entry.name.slice(0, -3);
      const from = `${SKILLS_DIR}/${entry.name}`;
      const to = `${SKILLS_DIR}/${name}/${SKILL_FILE}`;
      const text = fs.readFileSync(abs(from), 'utf8');
      const shipped = LEGACY_FLAT_SKILL_HASHES[entry.name]?.includes(sha256(text));
      if (fs.existsSync(abs(to))) {
        if (shipped) remove(from);
        else report.warnings.push(`Kept ${from}: it was changed and ${to} now replaces it. Merge your changes into ${to}, then delete ${from}.`);
      } else if (SKILL_NAME_PATTERN.test(name)) {
        if (!dryRun) {
          ensureDir(path.dirname(abs(to)));
          fs.renameSync(abs(from), abs(to));
        }
        report.converted.push({ from, to });
      } else {
        report.warnings.push(`Kept ${from}: "${name}" is not a valid skill name (lowercase letters, digits and hyphens).`);
      }
    }
  }

  // 2. Old Claude Code commands: remove only byte-for-byte shipped versions.
  if (removeLegacy) {
    const legacyAbs = abs(LEGACY_COMMANDS_DIR);
    if (fs.existsSync(legacyAbs)) {
      for (const entry of fs.readdirSync(legacyAbs, { withFileTypes: true })) {
        if (!entry.isFile() || !Object.hasOwn(LEGACY_COMMAND_HASHES, entry.name)) continue;
        const rel = `${LEGACY_COMMANDS_DIR}/${entry.name}`;
        if (LEGACY_COMMAND_HASHES[entry.name].includes(sha256(fs.readFileSync(abs(rel), 'utf8')))) remove(rel);
        else report.warnings.push(`Kept ${rel}: it was changed. The /${LEGACY_COMMAND_RENAMES[entry.name]} skill replaces it; delete the old file once you have moved your changes.`);
      }
      if (!dryRun) removeEmptyDir(legacyAbs);
    }
  }

  // 3. Adapters for every valid source skill (dry runs also see the skills that step 1 would convert).
  const sources = listSourceSkills(rootDir);
  if (dryRun) {
    for (const { to } of report.converted) {
      const name = to.split('/')[2];
      if (sources.some((s) => s.name === name)) continue;
      const text = fs.readFileSync(abs(`${SKILLS_DIR}/${name}.md`), 'utf8');
      sources.push({ name, text, description: parseSkillFrontmatter(text)?.fields.description, problems: validateSkill(name, text) });
    }
  }
  const valid = new Set();
  for (const skill of sources) {
    if (skill.problems.length > 0) {
      report.warnings.push(`Skipped ${SKILLS_DIR}/${skill.name}/${SKILL_FILE}: ${skill.problems.join('; ')}.`);
      continue;
    }
    valid.add(skill.name);
    for (const { rel, content } of renderAdapters(skill)) {
      const stat = lstatOrNull(abs(rel));
      if (stat && !stat.isFile()) {
        report.warnings.push(`Skipped ${rel}: the path exists and is not a regular file.`);
        continue;
      }
      if (stat) {
        const current = fs.readFileSync(abs(rel), 'utf8');
        if (current === content) {
          report.unchanged.push(rel);
          continue;
        }
        if (!MARKER.test(current)) {
          report.warnings.push(`Kept ${rel}: it was not generated by clc-brain. Delete it to get the /${skill.name} shortcut from ${SKILLS_DIR}/${skill.name}/${SKILL_FILE}.`);
          continue;
        }
      }
      if (!dryRun) {
        ensureDir(path.dirname(abs(rel)));
        fs.writeFileSync(abs(rel), content, 'utf8');
      }
      report.written.push(rel);
    }
  }

  // 4. Generated adapters whose source skill is gone.
  for (const { rel, name } of generatedAdaptersOnDisk(rootDir)) {
    if (valid.has(name) || sources.some((s) => s.name === name)) continue;
    remove(rel);
    if (!dryRun && rel.startsWith('.claude/skills/')) removeEmptyDir(path.dirname(abs(rel)));
  }

  return report;
}

/** True when a report would change files on disk. */
export function harnessReportHasChanges(report) {
  return report.written.length > 0 || report.removed.length > 0 || report.converted.length > 0;
}
