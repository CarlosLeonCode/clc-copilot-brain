// Sales play frontmatter parsing and validation. Pure: no I/O, no YAML dependency.
import { toSlug } from './sales-normalize.js';
import { SECTION_HEADINGS, section } from './sales-stages.js';

export const PLAY_KEYS = Object.freeze(['play', 'stages', 'goal', 'gate_unlocked', 'version', 'status']);

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const STAGES_LIST = /^\d+(\s*,\s*\d+)*$/;
const INTEGER = /^\d+$/;
const MERMAID_FENCE = /```mermaid\r?\n([\s\S]*?)```/g;
// Decision node: an identifier followed by a brace label, e.g. B1{Interested?}.
const DECISION_NODE = /\b\w+\{[^{}\n]+\}/;

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Parse flat `key: value` frontmatter. Double-quoted scalars (JSON escaping) are unquoted; a leading BOM is ignored.
 * With `topLevelOnly`, indented (nested) lines are skipped.
 * @returns {Record<string, string> | null} null when the text has no frontmatter block
 */
export function parseFrontmatter(text, { topLevelOnly = false } = {}) {
  const match = FRONTMATTER.exec(String(text).replace(/^\uFEFF/, ''));
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    // Indented lines belong to a nested block; they must not leak into the top level.
    if (topLevelOnly && /^\s/.test(line)) continue;
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    if (!/^\w+$/.test(key)) continue;
    fields[key] = unquote(line.slice(sep + 1).trim());
  }
  return fields;
}

/**
 * Validate a play file. `stages` is a comma list of stage numbers; legacy single `stage` is accepted.
 * @returns {string[]} human-readable problems, empty when valid
 */
export function validatePlay(fileName, text) {
  const fm = parseFrontmatter(text);
  if (!fm) return [`${fileName}: missing frontmatter block`];
  const problems = [];

  for (const key of PLAY_KEYS) {
    if (key === 'stages') continue;
    if (!fm[key]) problems.push(`${fileName}: missing frontmatter key "${key}"`);
  }

  const stages = fm.stages ?? fm.stage;
  if (!stages) problems.push(`${fileName}: missing frontmatter key "stages"`);
  else if (!STAGES_LIST.test(stages)) problems.push(`${fileName}: "stages" must be a comma list of stage numbers (got "${stages}")`);

  const stem = String(fileName).replace(/\.md$/, '');
  if (fm.play && fm.play !== stem) problems.push(`${fileName}: "play" is "${fm.play}" but must match the file name "${stem}"`);

  if (fm.version && !INTEGER.test(fm.version)) problems.push(`${fileName}: "version" must be an integer (got "${fm.version}")`);
  return problems;
}

/** True when a mermaid fence holds decision nodes (conversation trees belong in sales/plays/). */
export function hasDecisionTree(markdown) {
  for (const match of String(markdown).matchAll(MERMAID_FENCE)) {
    if (DECISION_NODE.test(match[1])) return true;
  }
  return false;
}

/** `motions:` value to 'all' or a list of slugs. A missing, empty or `all` value means every motion. */
export function parseMotions(value) {
  const slugs = String(value ?? '').split(',').map(toSlug).filter(Boolean);
  if (slugs.length === 0 || slugs.includes('all')) return 'all';
  return [...new Set(slugs)];
}

/** Title prefix of a play heading ("# Play: Cold Call", "# Guía: Llamada en frío"). */
export const PLAY_TITLE_PREFIX = /^(?:play|gu[ií]a):\s*/i;
const TITLE = /^#\s+(.+?)\s*$/m;
// A branch row: `| B1 | trigger |`, or a per-industry row `| B1 · Retail | trigger |` (the trigger may be empty).
const BRANCH_ROW = /^\|\s*(B\d+)(?:\s*[·•:\-–—]\s*([^|]*?))?\s*\|\s*([^|]*?)\s*\|/;

/** Branch rows; a per-industry row carries `industry` and keeps the generic row's trigger when its own is empty. */
function branchesOf(text) {
  const generic = new Map();
  return section(text, SECTION_HEADINGS.branches).split(/\r?\n/).map((line) => BRANCH_ROW.exec(line)).filter(Boolean).flatMap((m) => {
    const [, id, industry, when] = m;
    if (!industry) {
      if (!when) return [];
      generic.set(id, when);
      return [{ id, when }];
    }
    const trigger = when || generic.get(id) || '';
    return trigger ? [{ id, when: trigger, industry }] : [];
  });
}

/**
 * Read what the metrics need from a play file: title, goal, success, motions, first stage and branch triggers.
 * A play without `success:` is legacy: its goal text stands in and `successDefined` is false.
 */
export function readPlayMeta(file, text) {
  const body = String(text).replace(/^\uFEFF/, '');
  const fm = parseFrontmatter(body, { topLevelOnly: true }) ?? {};
  const stem = String(file).replace(/\.md$/, '');
  const stages = String(fm.stages ?? fm.stage ?? '').split(',').map((n) => Number.parseInt(n, 10)).filter(Number.isInteger);
  const goal = fm.goal ?? '';
  const successDefined = Boolean(fm.success);
  return {
    id: fm.play || stem,
    title: TITLE.exec(body)?.[1]?.replace(PLAY_TITLE_PREFIX, '') || stem,
    goal,
    success: successDefined ? fm.success : goal,
    successDefined,
    motions: parseMotions(fm.motions),
    firstStage: stages.length > 0 ? Math.min(...stages) : null,
    branches: branchesOf(body)
  };
}
