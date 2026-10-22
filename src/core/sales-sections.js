// Scripts and Glossary sections of the sales page, plus draft-script handling. Pure: no I/O.
// All text from brain files is escaped; links go through the allowlist in linkInline.
import { escapeHtml } from './html-escape.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { SKILL_NAME_PATTERN } from './harness-adapters.js';
import { linkInline } from './script-view.js';
import { hasErrors, scriptEntry } from './sales-library.js';
import { SEPARATOR_ROW, splitRow } from './sales-glossary.js';

const text = (lang, key, vars) => escapeHtml(t(lang, key, vars));
const page = (value) => linkInline(value, { page: true });

function scriptCard(entry, lang) {
  const { parsed } = entry;
  const broken = hasErrors(entry);
  const draft = entry.draft ? `<span class="badge badge-draft">${text(lang, 'view.draftBadge')}</span>` : '';
  const conversations = parsed.conversations.map((c) => `<li>${escapeHtml(c.title)}${c.goal ? ` <span class="meta">${page(c.goal)}</span>` : ''}</li>`).join('');
  const body = broken
    ? `<p class="note needs-fix">${text(lang, 'view.scripts.needsFix')}</p>`
    : `<p class="meta">${text(lang, 'view.scripts.conversations', { count: parsed.conversations.length })}</p><ul>${conversations}</ul>`
      + (SKILL_NAME_PATTERN.test(entry.slug) ? `<p><a href="./scripts/${entry.slug}.html">${text(lang, 'view.scripts.open')}</a></p>` : '');
  return `<section class="card"><div class="card-head"><h3>${escapeHtml(parsed.title || entry.slug)}</h3>${draft}</div>${body}</section>`;
}

/** Hand-made visual script pages: linked when the file name is safe, else shown as plain text. */
function pagesCard(pages, lang) {
  const items = pages.map((p) => (SKILL_NAME_PATTERN.test(p.slug)
    ? `<li><a href="./scripts/${p.slug}.html">${escapeHtml(p.title)}</a></li>`
    : `<li>${escapeHtml(p.title)}</li>`)).join('');
  return `<section class="card"><div class="card-head"><h3>${text(lang, 'view.scripts.pages')}</h3></div><ul>${items}</ul></section>`;
}

/** The Scripts section: one card per script, a card listing hand-made script pages, or a localized empty state. */
export function renderScriptsSection(entries, lang = DEFAULT_LANGUAGE, pages = []) {
  const parts = entries.map((entry) => scriptCard(entry, lang));
  if (pages.length > 0) parts.push(pagesCard(pages, lang));
  const cards = parts.length > 0
    ? parts.join('\n')
    : `<section class="card"><p>${text(lang, 'view.scripts.empty')}</p></section>`;
  return `<h2 id="scripts">${text(lang, 'view.scripts.title')}</h2>\n${cards}`;
}

/** The Glossary section (headers come from the file), or '' when there is no glossary. */
export function renderGlossarySection(glossary, lang = DEFAULT_LANGUAGE) {
  if (!glossary || glossary.groups.length === 0) return '';
  const groups = glossary.groups.map((group) => {
    const head = group.headers.length === 3 ? `<thead><tr>${group.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>` : '';
    const rows = group.terms.map((e) => `<tr><td><strong>${escapeHtml(e.term)}</strong></td><td>${page(e.meaning)}</td><td>${page(e.example)}</td></tr>`).join('');
    return `<details><summary>${escapeHtml(group.name)}</summary><table>${head}<tbody>${rows}</tbody></table></details>`;
  }).join('\n');
  return `<h2 id="glossary">${text(lang, 'view.glossary.title')}</h2>\n<section class="card glossary">\n${groups}\n</section>`;
}

/** Merge draft scripts into the library entries (a draft replaces the saved script with the same slug). */
export function mergeDraftScripts(entries, drafts) {
  const merged = [...entries];
  const status = drafts.map((d) => {
    const stem = String(d.path || 'draft.md').replace(/^.*[\\/]/, '').replace(/\.md$/, '');
    const probe = scriptEntry(stem, d.content, '', { draft: true });
    const slug = probe.parsed.id || stem;
    const entry = { ...probe, slug, file: `${slug}.md`, draft: true };
    const at = merged.findIndex((e) => e.slug === slug);
    if (at === -1) merged.push(entry);
    else merged[at] = { ...entry, htmlPath: merged[at].htmlPath };
    const errors = entry.parsed.diagnostics.filter((x) => x.level === 'error');
    const first = errors[0];
    return { path: d.path, kind: 'script', id: slug, ok: errors.length === 0, errors, error: first ? `line ${first.line}: ${first.message}` : undefined };
  });
  return { entries: merged, status };
}

const PACKS_HEADING = /^#{2,4}\s+(industry packs|paquetes por industria)\s*#*\s*$/i;

/**
 * The industry packs table of system.md: the first table under a `## Industry packs` / `### Paquetes por industria`
 * heading anywhere in the file (also below the `---` cut), up to the next heading. Null when there is none.
 * @returns {{title: string, headers: string[], rows: string[][]} | null}
 */
export function parseIndustryPacks(systemMd) {
  const lines = String(systemMd ?? '').replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => PACKS_HEADING.test(l.trim()));
  if (start === -1) return null;
  const table = [];
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (/^#{1,6}\s/.test(line)) break;
    if (line.startsWith('|')) table.push(line);
    else if (table.length > 0) break;
  }
  if (table.length < 2 || !SEPARATOR_ROW.test(table[1])) return null;
  const rows = table.slice(2).filter((l) => !SEPARATOR_ROW.test(l)).map(splitRow);
  if (rows.length === 0) return null;
  return { title: PACKS_HEADING.exec(lines[start].trim())[1], headers: splitRow(table[0]), rows };
}

/** The industry packs section (headers from the file, cells through the link allowlist), or '' when there is none. */
export function renderIndustryPacksSection(packs, lang = DEFAULT_LANGUAGE) {
  if (!packs) return '';
  const head = `<thead><tr>${packs.headers.map((h) => `<th>${page(h)}</th>`).join('')}</tr></thead>`;
  const rows = packs.rows.map((cells) => `<tr>${cells.map((c) => `<td>${page(c)}</td>`).join('')}</tr>`).join('');
  return `<h2 id="industry-packs">${text(lang, 'view.packs.title')}</h2>\n<section class="card"><table>${head}<tbody>${rows}</tbody></table></section>`;
}
