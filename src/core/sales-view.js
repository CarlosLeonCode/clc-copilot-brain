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
import { DASHBOARD_CSS, renderDashboard } from './sales-dashboard.js';
import { linkInline } from './script-view.js';
import { loadLibrary, writeScriptPages } from './sales-library.js';
import { mergeDraftScripts, renderGlossarySection, renderScriptsSection } from './sales-sections.js';
import { FLOWCHART_CSS, layoutFlowchart, parseFlowchart, renderFlowchartSvg } from './flowchart.js';

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
  return `<div class="diagram-text"><p class="note">${escapeHtml(t(lang, 'diagram.stepsNote'))}</p><ol>${items.join('')}</ol></div>`;
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
      : `<div class="diagram-text"><p class="note">${escapeHtml(t(lang, 'diagram.cannotDraw'))}</p></div>`;
    return { html, ok: false, error: err.message };
  }
  const layout = layoutFlowchart(graph);
  const minWidth = wide ? undefined : Math.min(layout.width, Math.max(MIN_TREE_WIDTH, layout.width * MIN_TREE_SCALE));
  return { html: `<div class="diagram${wide ? ' diagram-wide' : ''}">${renderFlowchartSvg(graph, layout, { title, idPrefix, minWidth })}</div>`, ok: true };
}

/** The Guion cell of a play row, shown only when it holds an allowed script link. */
function scriptLink(cell) {
  const html = cell ? inline(cell) : '';
  return html.includes('<a ') ? `<span class="script-link">${html}</span>` : '';
}

const draftBadge = (draft, lang) => (draft ? `<span class="badge badge-draft">${escapeHtml(t(lang, 'view.draftBadge'))}</span>` : '');

function renderPlay(play, lang) {
  const label = (key) => `<span class="label">${escapeHtml(t(lang, key))}</span>`;
  const steps = play.steps.length > 0 ? `<p class="meta">${label('play.usedIn')} ${play.steps.map(escapeHtml).join(', ')}</p>` : '';
  const goal = play.goal ? `<p class="goal">${label('play.goal')} ${inline(play.goal)}</p>` : '';
  const version = play.version ? `<span class="badge">${escapeHtml(t(lang, 'play.version', { version: play.version }))}</span>` : '';
  const say = play.branches.length > 0
    ? `<details><summary>${escapeHtml(t(lang, 'play.whatToSay'))}</summary><ul class="talk">${play.branches.map((b) => `<li>${b.when ? `<span class="when">${inline(b.when)}</span>` : ''}<span class="say">${inline(b.say)}</span>${scriptLink(b.script)}</li>`).join('')}</ul></details>`
    : '';
  const learned = play.learnings.length > 0
    ? `<details><summary>${escapeHtml(t(lang, 'play.learned'))}</summary><ul>${play.learnings.map((l) => `<li>${inline(l)}</li>`).join('')}</ul></details>`
    : '';
  return `<section class="card" id="${play.anchor}">
<div class="card-head"><h3>${escapeHtml(play.title)}</h3>${version}${draftBadge(play.draft, lang)}</div>
${goal}
${steps}
${play.rendered ? play.rendered.html : ''}
${say}
${learned}
</section>`;
}

const STYLE = `:root{--bg:#f7f7f5;--card:#fff;--text:#1f2328;--muted:#5b6470;--border:#e3e3de;--accent:#2f6fde;--soft:#eef3fc;--fc-node:#fff;--fc-stroke:#2f6fde;--fc-decision:#fff8e6;--fc-decision-stroke:#c98a00;--fc-text:#1f2328;--fc-line:#8a929c;--fc-label-bg:#eef3fc;--fc-label:#3d4550;--draft-bg:#fff4d6;--draft-text:#7a4b00;--draft-border:#e8c46a}
@media (prefers-color-scheme:dark){:root{--bg:#16181c;--card:#1f2227;--text:#e8e8e6;--muted:#a3a9b2;--border:#33373e;--accent:#7aa7ff;--soft:#232a36;--fc-node:#1f2227;--fc-stroke:#7aa7ff;--fc-decision:#2e2715;--fc-decision-stroke:#e0b04a;--fc-text:#e8e8e6;--fc-line:#7d848e;--fc-label-bg:#232a36;--fc-label:#c9ced6;--draft-bg:#3a2f12;--draft-text:#f3d58a;--draft-border:#6b5520}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:960px;margin:0 auto;padding:32px 16px 64px}
header h1{margin:0;font-size:1.9rem;line-height:1.2}
header p{margin:4px 0 0;color:var(--muted)}
nav{margin:24px 0;display:flex;flex-wrap:wrap;gap:8px}
nav a{padding:6px 12px;border-radius:999px;background:var(--soft);color:var(--accent);text-decoration:none;font-size:.95rem}
nav a:hover{text-decoration:underline}
h2{margin:40px 0 12px;font-size:1.4rem}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px 24px;margin:16px 0}
.card-head{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.card-head h3{margin:0;font-size:1.25rem}
.badge{font-size:.8rem;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:2px 10px}
.badge-draft{color:var(--draft-text);background:var(--draft-bg);border-color:var(--draft-border);font-weight:600}
.preview-note{background:var(--draft-bg);color:var(--draft-text);border:1px solid var(--draft-border)}
.label{font-weight:600}
.meta{color:var(--muted)}
.diagram{overflow-x:auto;margin:16px 0;padding:12px;border-radius:10px;background:var(--bg)}
.diagram svg{display:block;margin:0 auto;max-width:100%;height:auto}
.diagram-wide{overflow-x:auto;-webkit-overflow-scrolling:touch}
.diagram-wide svg{max-width:none;margin:0}
.diagram-text ol{margin:8px 0 0}
.diagram-text ul{color:var(--muted)}
.note{font-size:.9rem;color:var(--muted);background:var(--soft);border-radius:10px;padding:8px 12px}
details{margin-top:12px;border-top:1px solid var(--border);padding-top:10px}
summary{cursor:pointer;font-weight:600;color:var(--accent)}
ul.talk{list-style:none;padding:0}
table{border-collapse:collapse;width:100%;margin-top:8px;font-size:.95rem}
th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--border);padding:6px 10px}
th{color:var(--muted);font-weight:600}
.script-link{display:block;font-size:.9rem}
.needs-fix{background:var(--draft-bg);color:var(--draft-text)}
ul.talk li{margin:12px 0;padding-left:12px;border-left:3px solid var(--soft)}
.when{display:block;font-size:.9rem;color:var(--muted)}
.say{display:block}
footer{margin-top:48px;color:var(--muted);font-size:.9rem}
${DASHBOARD_CSS}
${FLOWCHART_CSS}`;

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
    throw new BrainError('DRAFT_INVALID', `Cannot read the draft ${file}.`);
  }
  const kind = detectDraftKind(content);
  if (!kind) {
    throw new BrainError('DRAFT_INVALID', `The draft ${file} is neither a call guide (no "play:" line at the top), a script (no "script:" line at the top) nor a pipeline (no flowchart diagram).`);
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
<style>${STYLE}</style>
</head>
<body>
<main>
<header>
<h1>${heading}</h1>
<p>${text('view.updated', { date })}</p>
</header>
${preview ? `<p class="note preview-note">${text('view.previewNote')}</p>\n` : ''}<nav aria-label="${text('view.navLabel')}">${[...plays.map((p) => `<a href="#${p.anchor}">${escapeHtml(p.title)}</a>`), ...(glossary ? [`<a href="#scripts">${text('view.scripts.title')}</a>`, `<a href="#glossary">${text('view.glossary.title')}</a>`] : merged.entries.length > 0 ? [`<a href="#scripts">${text('view.scripts.title')}</a>`] : [])].join('')}</nav>
<h2>${text('view.system.title')}</h2>
<section class="card">
${markdownToHtml(plainSystemSection(systemMd))}
</section>
${renderDashboard(loadSalesReport(rootDir, { now, lang }), lang)}
<h2>${text('view.pipeline.title')}</h2>
<section class="card">
${pipelineDraft ? `<div class="card-head">${draftBadge(true, lang)}</div>\n` : ''}${pipelineRendered ? pipelineRendered.html : `<p>${text('view.pipeline.empty')}</p>`}
</section>
<h2>${text('view.guides.title')}</h2>
${plays.map((play) => renderPlay(play, lang)).join('\n')}
${renderScriptsSection(merged.entries, lang)}
${renderGlossarySection(glossary, lang)}
<footer>${text('view.footer')}</footer>
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
