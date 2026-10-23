// Visual, plain-language HTML page of a brain's sales system (pipeline + call guides).
// Reads brain files and returns a self-contained HTML string; every file-sourced text is escaped.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrainError } from './errors.js';
import { PLAY_TITLE_PREFIX, parseFrontmatter } from './plays.js';
import { escapeHtml } from './html-escape.js';
import { getBrainLanguage } from './brain-language.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { EMPTY_LOG_LINE, SECTION_HEADINGS, plainSystemSection, section, stageNames } from './sales-stages.js';
import { loadSalesReport } from './sales-records.js';
import { renderDashboard } from './sales-dashboard.js';
import { linkInline } from './script-view.js';
import { loadLibrary, loadScriptPages, writeScriptPages } from './sales-library.js';
import { mergeDraftScripts, parseIndustryPacks, renderGlossarySection, renderIndustryPacksSection, renderScriptsSection } from './sales-sections.js';
import { layoutFlowchart, parseFlowchart, renderFlowchartSvg } from './flowchart.js';
import { PAGE_CSS } from './styles/compiled.js';
import * as C from './page-classes.js';

export const SALES_VIEW_FILE = 'sales-system.html';
export const SALES_PREVIEW_FILE = 'sales-system-preview.html';
export const DRAFT_BADGE = t(DEFAULT_LANGUAGE, 'view.draftBadge');

const MERMAID_FENCE = /```mermaid\r?\n([\s\S]*?)```/;
const FRONTMATTER_BLOCK = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export { escapeHtml, stageNames };

/** Escape first, then **bold**; only allowlisted script and glossary links stay clickable, other links become plain text. */
const inline = (text) => linkInline(text, { page: true });

/**
 * Tiny safe markdown converter: headings (shifted to h3/h4), paragraphs, ordered and
 * unordered lists, **bold**. Never passes raw HTML through.
 */
export function markdownToHtml(markdown) {
  const out = [];
  let paragraph = [];
  let list = null;
  const flushParagraph = () => {
    if (paragraph.length > 0) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const addItem = (tag, item) => {
    flushParagraph();
    if (list && list.tag !== tag) flushList();
    if (!list) list = { tag, items: [] };
    list.items.push(item);
  };

  for (const raw of String(markdown).split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if (!line || /^-{3,}$/.test(line) || line.startsWith('<!--')) {
      flushParagraph();
      flushList();
    } else if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
      flushParagraph();
      flushList();
      const level = m[1].length <= 2 ? 3 : 4;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) {
      addItem('ol', m[1]);
    } else if ((m = /^[-*+]\s+(.*)$/.exec(line))) {
      addItem('ul', m[1]);
    } else {
      flushList();
      paragraph.push(line.replace(/^>\s?/, ''));
    }
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}

function tableRows(markdown) {
  return String(markdown).split(/\r?\n/)
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells) => !cells.every((c) => /^:?-{3,}:?$/.test(c)));
}

function parseBranches(markdown) {
  const rows = tableRows(section(markdown, SECTION_HEADINGS.branches));
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => c.toLowerCase());
  const triggerCol = header.indexOf('trigger') === -1 ? 1 : header.indexOf('trigger');
  const talkCol = header.indexOf('talk track') === -1 ? 2 : header.indexOf('talk track');
  const scriptCol = ['script link', 'guion'].map((h) => header.indexOf(h)).find((i) => i >= 0) ?? (header.length >= 4 ? 3 : -1);
  return rows.slice(1)
    .map((cells) => ({ when: cells[triggerCol] || '', say: cells[talkCol] || '', script: scriptCol >= 0 ? cells[scriptCol] || '' : '' }))
    .filter((b) => b.say);
}

function parseLearnings(markdown) {
  return section(markdown, SECTION_HEADINGS.learnings).split(/\r?\n/)
    .map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1]?.trim())
    .filter((item) => item && !EMPTY_LOG_LINE.test(item));
}

function humanize(id) {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function parsePlay(fileName, text, names, { draft = false, lang = DEFAULT_LANGUAGE } = {}) {
  const fm = parseFrontmatter(text) || {};
  const fromName = path.basename(fileName).replace(/\.md$/, '');
  const id = draft && typeof fm.play === 'string' && fm.play.trim() ? fm.play.trim() : fromName;
  const body = String(text).replace(FRONTMATTER_BLOCK, '');
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
  const stageNumbers = String(fm.stages ?? fm.stage ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
  return {
    id,
    anchor: `play-${id.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`,
    title: heading ? heading.replace(PLAY_TITLE_PREFIX, '') : humanize(id),
    goal: fm.goal || '',
    version: fm.version || '',
    firstStage: stageNumbers.length > 0 ? Number(stageNumbers[0]) : Number.MAX_SAFE_INTEGER,
    steps: stageNumbers.map((n) => names.get(n) || t(lang, 'metrics.step', { number: n })),
    diagram: MERMAID_FENCE.exec(body)?.[1]?.trim() || '',
    branches: parseBranches(body),
    learnings: parseLearnings(body),
    draft
  };
}

function readCompanyName(kernelPath, lang) {
  try {
    const name = JSON.parse(fs.readFileSync(kernelPath, 'utf8'))?.organization?.name;
    return typeof name === 'string' && name.trim() ? name.trim() : t(lang, 'view.companyFallback');
  } catch {
    return t(lang, 'view.companyFallback');
  }
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// Decision trees shrink to the card width, but never below this share of their natural size.
const MIN_TREE_SCALE = 0.7;
const MIN_TREE_WIDTH = 300;

/** Plain list of the steps, for diagrams the built-in renderer cannot draw. */
function stepsList(graph, lang) {
  const names = new Map(graph.nodes.map((n) => [n.id, n.label.replace(/\n/g, ' ')]));
  const items = graph.nodes.map((n) => {
    const next = graph.edges.filter((e) => e.from === n.id)
      .map((e) => `<li>${escapeHtml(e.label ? t(lang, 'diagram.if', { label: e.label }) : t(lang, 'diagram.then'))} → ${escapeHtml(names.get(e.to))}</li>`);
    return `<li>${escapeHtml(names.get(n.id))}${next.length > 0 ? `<ul>${next.join('')}</ul>` : ''}</li>`;
  });
  return `<div data-diagram="text" class="${C.DIAGRAM_TEXT}"><p class="${C.NOTE}">${escapeHtml(t(lang, 'diagram.stepsNote'))}</p><ol>${items.join('')}</ol></div>`;
}

/**
 * Inline SVG for a Mermaid flowchart (no scripts, works offline); a text list if it cannot be drawn.
 * @returns {{ html: string, ok: boolean, error?: string }}
 */
function diagram(code, { wide = false, title, idPrefix, lang = DEFAULT_LANGUAGE }) {
  let graph;
  try {
    graph = parseFlowchart(code);
  } catch (err) {
    const partial = parseFlowchart(code, { lenient: true });
    const html = partial.nodes.length > 0
      ? stepsList(partial, lang)
      : `<div data-diagram="text" class="${C.DIAGRAM_TEXT}"><p class="${C.NOTE}">${escapeHtml(t(lang, 'diagram.cannotDraw'))}</p></div>`;
    return { html, ok: false, error: err.message };
  }
  const layout = layoutFlowchart(graph);
  const minWidth = wide ? undefined : Math.min(layout.width, Math.max(MIN_TREE_WIDTH, layout.width * MIN_TREE_SCALE));
  return { html: `<div data-diagram="${wide ? 'wide' : 'tree'}" class="${wide ? C.DIAGRAM_WIDE : C.DIAGRAM_TREE}">${renderFlowchartSvg(graph, layout, { title, idPrefix, minWidth })}</div>`, ok: true };
}

/** The Guion cell of a play row, shown only when it holds an allowed script link. */
function scriptLink(cell) {
  const html = cell ? inline(cell) : '';
  return html.includes('<a ') ? `<span class="${C.SCRIPT_LINK}">${html}</span>` : '';
}

const draftBadge = (draft, lang) => (draft ? `<span data-badge="draft" class="${C.BADGE_DRAFT}">${escapeHtml(t(lang, 'view.draftBadge'))}</span>` : '');

function renderPlay(play, lang) {
  const label = (key) => `<span class="${C.LABEL}">${escapeHtml(t(lang, key))}</span>`;
  const steps = play.steps.length > 0 ? `<p class="${C.MUTED}">${label('play.usedIn')} ${play.steps.map(escapeHtml).join(', ')}</p>` : '';
  const goal = play.goal ? `<p>${label('play.goal')} ${inline(play.goal)}</p>` : '';
  const version = play.version ? `<span class="${C.BADGE}">${escapeHtml(t(lang, 'play.version', { version: play.version }))}</span>` : '';
  const say = play.branches.length > 0
    ? `<details><summary>${escapeHtml(t(lang, 'play.whatToSay'))}</summary><ul class="${C.TALK_LIST}">${play.branches.map((b) => `<li class="${C.TALK_ITEM}">${b.when ? `<span class="${C.WHEN}">${inline(b.when)}</span>` : ''}<span class="${C.SAY}">${inline(b.say)}</span>${scriptLink(b.script)}</li>`).join('')}</ul></details>`
    : '';
  const learned = play.learnings.length > 0
    ? `<details><summary>${escapeHtml(t(lang, 'play.learned'))}</summary><ul>${play.learnings.map((l) => `<li>${inline(l)}</li>`).join('')}</ul></details>`
    : '';
  return `<section class="${C.CARD}" id="${play.anchor}">
<div class="${C.CARD_HEAD}"><h3>${escapeHtml(play.title)}</h3>${version}${draftBadge(play.draft, lang)}</div>
${goal}
${steps}
${play.rendered ? play.rendered.html : ''}
${say}
${learned}
</section>`;
}

const FLOWCHART_START = /^\s*(?:flowchart|graph)\b/m;

/** 'script' when the draft has script frontmatter, 'play' when it has play frontmatter, 'pipeline' when it holds a flowchart, else null. */
export function detectDraftKind(content) {
  const fm = parseFrontmatter(content);
  if (fm && typeof fm.script === 'string' && fm.script.trim()) return 'script';
  if (fm && typeof fm.play === 'string' && fm.play.trim()) return 'play';
  const text = String(content ?? '');
  if (MERMAID_FENCE.test(text) || FLOWCHART_START.test(text)) return 'pipeline';
  return null;
}

/** Read a draft file for a preview. */
export function loadDraft(file) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    throw new BrainError('DRAFT_INVALID', `Cannot read the draft ${file}.`, { reason: 'unreadable', file });
  }
  const kind = detectDraftKind(content);
  if (!kind) {
    throw new BrainError('DRAFT_INVALID', `The draft ${file} is neither a call guide (no "play:" line at the top), a script (no "script:" line at the top) nor a pipeline (no flowchart diagram).`, { reason: 'unknown-kind', file });
  }
  return { kind, path: file, content };
}

function draftPipelineSource(content) {
  return (MERMAID_FENCE.exec(content)?.[1] ?? content).trim();
}

/**
 * Build the sales system page for a brain. `drafts` ([{ kind, path, content }]) are previewed
 * on top of the saved files: a draft play replaces the saved play with the same id (or is added),
 * a draft pipeline replaces the pipeline diagram. Nothing is written.
 * @returns {{ html: string, plays: object[], diagrams: object[], drafts: object[], outputPath: string }}
 */
export function buildSalesView(rootDir, { now = new Date(), drafts = [] } = {}) {
  const kernelPath = path.join(rootDir, 'org-kernel.json');
  if (!fs.existsSync(kernelPath)) {
    throw new BrainError('NOT_A_BRAIN', `${rootDir} is not a brain (no org-kernel.json). Run "clc-brain init" first.`);
  }
  const salesDir = path.join(rootDir, 'sales');
  const systemMd = readIfExists(path.join(salesDir, 'system.md'));
  const playsDir = path.join(salesDir, 'plays');
  const playFiles = fs.existsSync(playsDir) ? fs.readdirSync(playsDir).filter((f) => f.endsWith('.md') && f !== 'README.md') : [];
  if (systemMd === null || playFiles.length === 0) {
    throw new BrainError('NO_SALES_SYSTEM', 'This brain has no sales system yet (no sales map or call guides). Add the sales area with "clc-brain add-area --preset sales", or run "clc-brain upgrade" on an older brain.');
  }

  const lang = getBrainLanguage(rootDir);
  const names = stageNames(systemMd);
  const byId = new Map(playFiles.map((f) => {
    const play = parsePlay(f, fs.readFileSync(path.join(playsDir, f), 'utf8'), names, { lang });
    return [play.id, play];
  }));
  const pipelineMd = readIfExists(path.join(salesDir, 'stages', 'pipeline-stages.md'));
  let pipeline = pipelineMd ? MERMAID_FENCE.exec(pipelineMd)?.[1]?.trim() || '' : '';
  let pipelineDraft = false;
  const scriptDrafts = drafts.filter((d) => d.kind === 'script');
  const library = loadLibrary(rootDir);
  const merged = mergeDraftScripts(library.scripts, scriptDrafts);
  const draftIds = drafts.map((d) => {
    if (d.kind === 'script') return merged.status[scriptDrafts.indexOf(d)].id;
    if (d.kind !== 'play') return 'pipeline';
    const play = parsePlay(d.path || 'draft.md', d.content, names, { draft: true, lang });
    byId.set(play.id, play);
    return play.id;
  });
  for (const d of drafts) {
    if (d.kind === 'pipeline') {
      pipeline = draftPipelineSource(d.content);
      pipelineDraft = true;
    }
  }
  const plays = [...byId.values()].sort((a, b) => a.firstStage - b.firstStage || a.id.localeCompare(b.id));
  const diagrams = [];
  for (const play of plays) {
    play.rendered = play.diagram ? diagram(play.diagram, { title: t(lang, 'play.treeTitle', { title: play.title }), idPrefix: play.anchor, lang }) : null;
    diagrams.push({
      kind: 'play', id: play.id, title: play.title, draft: play.draft,
      ok: Boolean(play.rendered?.ok), error: play.rendered ? play.rendered.error : 'No diagram found.'
    });
  }
  const pipelineTitle = t(lang, 'view.pipeline.title');
  const pipelineRendered = pipeline ? diagram(pipeline, { wide: true, title: pipelineTitle, idPrefix: 'pipeline', lang }) : null;
  diagrams.unshift({
    kind: 'pipeline', id: 'pipeline', title: pipelineTitle, draft: pipelineDraft,
    ok: Boolean(pipelineRendered?.ok), error: pipelineRendered ? pipelineRendered.error : 'No diagram found.'
  });
  const draftStatus = drafts.map((d, i) => {
    if (d.kind === 'script') return merged.status[scriptDrafts.indexOf(d)];
    const status = diagrams.find((x) => x.kind === (d.kind === 'play' ? 'play' : 'pipeline') && x.id === draftIds[i]);
    return { path: d.path, kind: d.kind, id: draftIds[i], ok: status.ok, error: status.error };
  });
  const glossary = library.glossary && library.glossary.groups.length > 0 ? library.glossary : null;
  const packs = parseIndustryPacks(systemMd);
  const scriptPages = loadScriptPages(rootDir, merged.entries.map((e) => e.slug));
  const preview = drafts.length > 0;
  const company = readCompanyName(kernelPath, lang);
  const date = now.toISOString().slice(0, 10);
  const heading = escapeHtml(t(lang, 'view.title', { company }) + (preview ? t(lang, 'view.previewSuffix') : ''));
  const text = (key, vars) => escapeHtml(t(lang, key, vars));

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>${PAGE_CSS}</style>
</head>
<body class="${C.BODY}">
<main class="${C.MAIN}">
<header class="${C.HEADER}">
<h1>${heading}</h1>
<p>${text('view.updated', { date })}</p>
</header>
${preview ? `<p class="${C.NOTE_PREVIEW}">${text('view.previewNote')}</p>\n` : ''}<nav class="${C.NAV}" aria-label="${text('view.navLabel')}">${[...plays.map((p) => [p.anchor, escapeHtml(p.title)]), ...(glossary || merged.entries.length > 0 || scriptPages.length > 0 ? [['scripts', text('view.scripts.title')]] : []), ...(packs ? [['industry-packs', text('view.packs.title')]] : []), ...(glossary ? [['glossary', text('view.glossary.title')]] : [])].map(([anchor, label]) => `<a href="#${anchor}">${label}</a>`).join('')}</nav>
<h2>${text('view.system.title')}</h2>
<section class="${C.CARD}">
${markdownToHtml(plainSystemSection(systemMd))}
</section>
${renderDashboard(loadSalesReport(rootDir, { now, lang }), lang)}
<h2>${text('view.pipeline.title')}</h2>
<section class="${C.CARD}">
${pipelineDraft ? `<div class="${C.CARD_HEAD}">${draftBadge(true, lang)}</div>\n` : ''}${pipelineRendered ? pipelineRendered.html : `<p>${text('view.pipeline.empty')}</p>`}
</section>
<h2>${text('view.guides.title')}</h2>
${plays.map((play) => renderPlay(play, lang)).join('\n')}
${renderScriptsSection(merged.entries, lang, scriptPages)}
${renderIndustryPacksSection(packs, lang)}
${renderGlossarySection(glossary, lang)}
<footer class="${C.FOOTER}">${text('view.footer')}</footer>
</main>
</body>
</html>
`;
  return { html, plays, diagrams, drafts: draftStatus, library: merged.entries, lang, company, outputPath: path.join(salesDir, SALES_VIEW_FILE) };
}

/** Build a preview with drafts and write it to a new OS temp folder (never inside the brain). */
export function writeSalesPreview(rootDir, { drafts = [], now, tmpRoot = os.tmpdir() } = {}) {
  const view = buildSalesView(rootDir, { drafts, now });
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'clc-brain-preview-'));
  const outputPath = path.join(dir, SALES_PREVIEW_FILE);
  fs.writeFileSync(outputPath, view.html);
  const draftSlugs = view.drafts.filter((d) => d.kind === 'script').map((d) => d.id);
  const pages = writeScriptPages({ scripts: view.library }, { rootDir, outDir: dir, lang: view.lang, company: view.company, draftSlugs });
  const draftPages = Object.fromEntries(draftSlugs.filter((slug) => pages.written.includes(slug)).map((slug) => [slug, path.join(dir, 'scripts', `${slug}.html`)]));
  return { ...view, outputPath, pages, draftPages };
}

/** Build and write the page to sales/sales-system.html. */
export function writeSalesView(rootDir, options) {
  const view = buildSalesView(rootDir, options);
  const pages = writeScriptPages({ scripts: view.library }, { rootDir, lang: view.lang, company: view.company });
  fs.writeFileSync(view.outputPath, view.html);
  return { ...view, pages };
}
