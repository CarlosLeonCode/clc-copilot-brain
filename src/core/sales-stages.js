// Plain-language pieces of system.md: markdown sections and the stage number -> name map. Pure.

/** Body of a `## Heading` section, up to the next `## ` heading. */
export function section(markdown, heading) {
  const lines = String(markdown).split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Plain-language part of system.md: the "How your sales system works" section, before the AI-only rule. */
export function plainSystemSection(systemMd) {
  const body = section(systemMd, 'How your sales system works');
  const cut = body.search(/^-{3,}\s*$/m);
  const plain = cut === -1 ? body : body.slice(0, cut);
  // The "Want to see it?" hint points at this very page, so it is dropped here.
  return plain.split(/\r?\n/).filter((l) => !/^\s*want to see it\?/i.test(l)).join('\n');
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
