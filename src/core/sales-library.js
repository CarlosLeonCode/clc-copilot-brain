// Sales scripts and glossary on disk: load them, write the generated script pages and audit them for doctor.
// The only module in the scripts feature that touches the filesystem; writes stay inside the brain.
import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './fs-utils.js';
import { SKILL_NAME_PATTERN } from './harness-adapters.js';
import { parseFrontmatter, readPlayMeta } from './plays.js';
import { SECTION_HEADINGS, section } from './sales-stages.js';
import { isLegacyStarterScript, LEGACY_STARTER_SCRIPT_HASHES } from './legacy-assets.js';
import { parseScript } from './sales-scripts.js';
import { parseGlossary } from './sales-glossary.js';
import { renderScriptPage } from './script-view.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';

export const GENERATOR_MARKER = '<meta name="generator" content="clc-brain">';

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

/** Build one library entry from a script source text. */
export function scriptEntry(slug, text, htmlPath = '', { draft = false } = {}) {
  return { slug, file: `${slug}.md`, parsed: parseScript(text, draft ? {} : { fileStem: slug }), htmlPath };
}

export const hasErrors = (entry) => entry.parsed.diagnostics.some((d) => d.level === 'error');

const GLOSARIO_FILE = /^glosario.*\.md$/;

/**
 * File name of the brain's glossary inside sales/: `glossary.md` when it exists, else the first `glosario*.md`
 * by name (older Spanish brains, for example `glosario-sandler.md`), else null.
 */
export function findGlossaryFile(salesDir) {
  let entries;
  try {
    entries = fs.readdirSync(salesDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = entries.filter((e) => e.isFile() || e.isSymbolicLink()).map((e) => e.name);
  if (files.includes('glossary.md')) return 'glossary.md';
  return files.filter((name) => GLOSARIO_FILE.test(name)).sort()[0] ?? null;
}

/**
 * Read sales/scripts/*.md that declare `script:` (README and other notes are ignored) and the glossary
 * (see findGlossaryFile; its file name is kept in `glossary.file`).
 * @returns {{scripts: {slug: string, file: string, parsed: object, htmlPath: string}[], glossary: object|null}}
 */
export function loadLibrary(rootDir) {
  const salesDir = path.join(rootDir, 'sales');
  const scriptsDir = path.join(salesDir, 'scripts');
  const scripts = [];
  if (fs.existsSync(scriptsDir)) {
    const names = fs.readdirSync(scriptsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name).sort();
    for (const name of names) {
      const text = readText(path.join(scriptsDir, name));
      const fm = text === null ? null : parseFrontmatter(text);
      if (!fm || typeof fm.script !== 'string' || !fm.script.trim()) continue;
      const slug = name.replace(/\.md$/, '');
      scripts.push({ ...scriptEntry(slug, text, path.join(scriptsDir, `${slug}.html`)), file: name });
    }
  }
  const glossaryFile = findGlossaryFile(salesDir);
  const glossaryText = glossaryFile === null ? null : readText(path.join(salesDir, glossaryFile));
  return { scripts, glossary: glossaryText === null ? null : { ...parseGlossary(glossaryText), file: glossaryFile } };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (value) => value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (whole, code) => {
  if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole;
  const n = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
});
const plainTextOf = (html) => decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Title of a hand-made page: its <title>, else its first <h1>, else ''. Plain text (tags dropped, entities decoded). */
function pageTitle(html) {
  for (const pattern of [/<title[^>]*>([\s\S]*?)<\/title>/i, /<h1[^>]*>([\s\S]*?)<\/h1>/i]) {
    const title = plainTextOf(pattern.exec(html)?.[1] ?? '');
    if (title) return title;
  }
  return '';
}

/**
 * Hand-made visual script pages: sales/scripts/*.html without the generator marker, other than the pages of the
 * scripts in `scriptSlugs`. They are listed on the sales page and never written.
 * @returns {{file: string, slug: string, title: string}[]}
 */
export function loadScriptPages(rootDir, scriptSlugs = []) {
  const dir = path.join(rootDir, 'sales', 'scripts');
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const own = new Set(scriptSlugs);
  return entries.filter((e) => e.isFile() && e.name.endsWith('.html')).map((e) => e.name).sort().flatMap((file) => {
    const slug = file.replace(/\.html$/, '');
    const html = own.has(slug) ? null : readText(path.join(dir, file));
    if (html === null || html.includes(GENERATOR_MARKER)) return [];
    return [{ file, slug, title: pageTitle(html) || slug }];
  });
}

function skipReason(entry, target, boundary, lang) {
  if (!SKILL_NAME_PATTERN.test(entry.slug)) return t(lang, 'pages.badName');
  if (hasErrors(entry)) return t(lang, 'pages.needsFix');
  if (!isInside(boundary, target)) return t(lang, 'pages.outside');
  let stat = null;
  try {
    stat = fs.lstatSync(target);
  } catch {
    return '';
  }
  if (stat.isSymbolicLink()) return t(lang, 'pages.symlink');
  if (!stat.isFile()) return t(lang, 'pages.notFile');
  return (readText(target) ?? '').includes(GENERATOR_MARKER) ? '' : t(lang, 'pages.handMade');
}

/**
 * Write a page per valid script. Into sales/scripts/ by default; into `<outDir>/scripts/` when `outDir` is given
 * (previews). A page that was not generated by clc-brain is never overwritten. Skip reasons are in `lang`.
 * @returns {{written: string[], skipped: {slug: string, reason: string}[]}}
 */
export function writeScriptPages(library, { rootDir, outDir = null, lang = DEFAULT_LANGUAGE, company = '', draftSlugs = [] } = {}) {
  const base = outDir ? path.resolve(outDir) : path.resolve(rootDir);
  const dir = outDir ? path.join(base, 'scripts') : path.join(base, 'sales', 'scripts');
  const result = { written: [], skipped: [] };
  for (const entry of library.scripts) {
    const target = path.join(dir, `${entry.slug}.html`);
    const reason = skipReason(entry, target, base, lang);
    if (reason) {
      result.skipped.push({ slug: entry.slug, reason });
      continue;
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, renderScriptPage(entry.parsed, { lang, company, draft: draftSlugs.includes(entry.slug) }));
    result.written.push(entry.slug);
  }
  return result;
}

const SCRIPT_LINK = /\.\.\/scripts\/([a-z0-9-]+)\.html(?:#([^)\s"']+))?/g;
const mdFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name).sort() : []);
const anchorsOf = (parsed) => new Set(parsed.conversations.flatMap((c) => [c.anchor, ...c.steps.map((st) => st.anchor)]));

function playProblems(entry, plays, say) {
  const problems = [];
  for (const conv of entry.parsed.conversations) {
    if (!conv.play) continue;
    const play = plays.get(conv.play);
    if (!play) problems.push(say('library.missingPlay', { title: conv.title, play: conv.play }));
    else for (const step of conv.steps) {
      if (step.branch && !play.branches.some((b) => b.id.toLowerCase() === step.branch.toLowerCase())) {
        problems.push(say('library.missingBranch', { title: step.title, branch: step.branch, play: conv.play }));
      }
    }
  }
  return problems;
}

function guionProblems(playFile, text, scripts, say) {
  const problems = [];
  for (const [, slug, anchor] of section(text, SECTION_HEADINGS.branches).matchAll(SCRIPT_LINK)) {
    const target = scripts.get(slug);
    if (!target) problems.push(say('library.noScriptFile', { slug }));
    else if (anchor && !anchorsOf(target.parsed).has(anchor)) problems.push(say('library.noAnchor', { slug, anchor }));
  }
  return problems.map((problem) => say('library.guionLink', { play: playFile, problem, fix: say('library.fix') }));
}

function pageProblem(entry, say) {
  const html = readText(entry.htmlPath);
  const file = `sales/scripts/${entry.file}`;
  if (html === null) return say('library.noPage', { file });
  if (!html.includes(GENERATOR_MARKER)) return null;
  if (fs.statSync(entry.htmlPath).mtimeMs < fs.statSync(path.join(path.dirname(entry.htmlPath), entry.file)).mtimeMs) {
    return say('library.oldPage', { file });
  }
  return null;
}

/** Doctor warnings for scripts, glossary and generated pages, in `lang`. Plain grouped messages; silent when there is nothing to report. */
export function checkSalesLibrary(rootDir, { lang = DEFAULT_LANGUAGE } = {}) {
  const say = (key, vars) => t(lang, key, vars);
  const fix = say('library.fix');
  const lines = (diagnostics) => diagnostics.map((d) => say('library.line', { line: d.line, message: d.message })).join('; ');
  const warnings = [];
  const salesDir = path.join(rootDir, 'sales');
  const library = loadLibrary(rootDir);
  const scripts = new Map(library.scripts.map((e) => [e.slug, e]));
  const playsDir = path.join(salesDir, 'plays');
  const playTexts = mdFiles(playsDir).filter((f) => f !== 'README.md').map((f) => [f, readText(path.join(playsDir, f)) ?? '']);
  const plays = new Map(playTexts.map(([f, text]) => { const meta = readPlayMeta(f, text); return [meta.id, meta]; }));
  const system = readText(path.join(salesDir, 'system.md'));

  for (const entry of library.scripts) {
    const file = `sales/scripts/${entry.file}`;
    if (entry.parsed.diagnostics.length > 0) warnings.push(say('library.scriptProblems', { file, list: lines(entry.parsed.diagnostics), fix }));
    const links = playProblems(entry, plays, say);
    if (links.length > 0) warnings.push(say('library.scriptPlays', { file, list: links.join('; '), fix }));
    if (system !== null && !system.includes(`${entry.slug}.md`) && !system.includes(`${entry.slug}.html`)) {
      warnings.push(say('library.scriptNotLinked', { file }));
    }
    const page = hasErrors(entry) ? null : pageProblem(entry, say);
    if (page) warnings.push(page);
  }
  for (const [file, text] of playTexts) warnings.push(...guionProblems(file, text, scripts, say));

  if (library.glossary) {
    const file = `sales/${library.glossary.file}`;
    if (library.glossary.diagnostics.length > 0) warnings.push(say('library.glossaryProblems', { file, list: lines(library.glossary.diagnostics), fix }));
    if (system !== null && !system.includes(`](./${library.glossary.file}`) && !system.includes(`](${library.glossary.file}`)) {
      warnings.push(say('library.glossaryNotLinked', { file }));
    }
  }

  const scriptFiles = mdFiles(path.join(salesDir, 'scripts')).filter((name) => name !== 'README.md');
  const legacy = scriptFiles.filter((name) => name in LEGACY_STARTER_SCRIPT_HASHES
    && isLegacyStarterScript(name, readText(path.join(salesDir, 'scripts', name)) ?? ''));
  const unrecognized = scriptFiles.filter((name) => !legacy.includes(name) && parseFrontmatter(readText(path.join(salesDir, 'scripts', name)) ?? '') === null);
  const listOf = (names) => names.map((n) => `sales/scripts/${n}`).join(', ');
  if (unrecognized.length > 0) warnings.push(say('library.unrecognized', { list: listOf(unrecognized) }));
  if (legacy.length > 0) warnings.push(say('library.legacy', { list: listOf(legacy) }));
  return warnings;
}
