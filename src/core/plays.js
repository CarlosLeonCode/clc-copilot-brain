// Sales play frontmatter parsing and validation. Pure: no I/O, no YAML dependency.
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
 * Parse flat `key: value` frontmatter. Double-quoted scalars (JSON escaping) are unquoted.
 * @returns {Record<string, string> | null} null when the text has no frontmatter block
 */
export function parseFrontmatter(text) {
  const match = FRONTMATTER.exec(String(text));
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
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
