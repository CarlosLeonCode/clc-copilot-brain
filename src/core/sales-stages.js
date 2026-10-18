// Plain-language pieces of system.md: markdown sections and the stage number -> name map. Pure.

/** Section headings of the starter sales files, in every supported language (English first). */
export const SECTION_HEADINGS = Object.freeze({
  system: Object.freeze(['How your sales system works', 'Cómo funciona tu sistema de ventas']),
  branches: Object.freeze(['Branches', 'Situaciones']),
  learnings: Object.freeze(['Learnings Log', 'Registro de aprendizajes'])
});

/** Placeholder line of an empty learnings log ("No entries yet." / "Todavía no hay entradas."). */
export const EMPTY_LOG_LINE = /^(no entries yet|todavía no hay entradas)/i;

// The "Want to see it?" hint points at the sales page itself.
const SEE_IT_HINT = /^\s*(want to see it\?|¿quieres verlo\?)/i;

/** Body of a `## Heading` section (any of `headings`, case-insensitive), up to the next `## ` heading. */
export function section(markdown, headings) {
  const wanted = new Set((Array.isArray(headings) ? headings : [headings]).map((h) => `## ${h}`.toLowerCase()));
  const lines = String(markdown).split(/\r?\n/);
  const start = lines.findIndex((l) => wanted.has(l.trim().toLowerCase()));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Plain-language part of system.md: the "How your sales system works" section, before the AI-only rule. */
export function plainSystemSection(systemMd) {
  const body = section(systemMd, SECTION_HEADINGS.system);
  const cut = body.search(/^-{3,}\s*$/m);
  const plain = cut === -1 ? body : body.slice(0, cut);
  // The "Want to see it?" hint points at this very page, so it is dropped here.
  return plain.split(/\r?\n/).filter((l) => !SEE_IT_HINT.test(l)).join('\n');
}

/** Stage number -> name, from the system.md stage table, else from its numbered list. */
export function stageNames(systemMd) {
  const names = new Map();
  for (const m of String(systemMd).matchAll(/^\|\s*(\d+)\.\s*([^|]+?)\s*\|/gm)) names.set(m[1], m[2].trim());
  if (names.size === 0) {
    for (const m of plainSystemSection(systemMd).matchAll(/^\s*(\d+)\.\s+\*\*([^*]+)\*\*/gm)) names.set(m[1], m[2].trim());
  }
  return names;
}
