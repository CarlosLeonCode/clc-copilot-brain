// Visual, plain-language HTML page of a brain's sales system (pipeline + call guides).
// Reads brain files and returns a self-contained HTML string; every file-sourced text is escaped.
import fs from 'node:fs';
import path from 'node:path';
import { BrainError } from './errors.js';
import { parseFrontmatter } from './plays.js';

export const SALES_VIEW_FILE = 'sales-system.html';
export const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';

const MERMAID_FENCE = /```mermaid\r?\n([\s\S]*?)```/;
const FRONTMATTER_BLOCK = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

const HTML_ESCAPES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Escape first, then apply **bold**; inline code and links become plain text. */
function inline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

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

/** Body of a `## Heading` section, up to the next `## ` heading. */
function section(markdown, heading) {
  const lines = String(markdown).split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Plain-language part of system.md: the "How your sales system works" section, before the AI-only rule. */
function plainSystemSection(systemMd) {
  const body = section(systemMd, 'How your sales system works');
  const cut = body.search(/^-{3,}\s*$/m);
  const plain = cut === -1 ? body : body.slice(0, cut);
  // The "Want to see it?" hint points at this very page, so it is dropped here.
  return plain.split(/\r?\n/).filter((l) => !/^\s*want to see it\?/i.test(l)).join('\n');
}

/** Stage number -> name, from the system.md stage table, else from its numbered list. */
function stageNames(systemMd) {
  const names = new Map();
  for (const m of String(systemMd).matchAll(/^\|\s*(\d+)\.\s*([^|]+?)\s*\|/gm)) names.set(m[1], m[2].trim());
  if (names.size === 0) {
    for (const m of plainSystemSection(systemMd).matchAll(/^\s*(\d+)\.\s+\*\*([^*]+)\*\*/gm)) names.set(m[1], m[2].trim());
  }
  return names;
}

function tableRows(markdown) {
  return String(markdown).split(/\r?\n/)
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells) => !cells.every((c) => /^:?-{3,}:?$/.test(c)));
}

function parseBranches(markdown) {
  const rows = tableRows(section(markdown, 'Branches'));
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => c.toLowerCase());
  const triggerCol = header.indexOf('trigger') === -1 ? 1 : header.indexOf('trigger');
  const talkCol = header.indexOf('talk track') === -1 ? 2 : header.indexOf('talk track');
  return rows.slice(1)
    .map((cells) => ({ when: cells[triggerCol] || '', say: cells[talkCol] || '' }))
    .filter((b) => b.say);
}

function parseLearnings(markdown) {
  return section(markdown, 'Learnings Log').split(/\r?\n/)
    .map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1]?.trim())
    .filter((item) => item && !/^no entries yet/i.test(item));
}

function humanize(id) {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function parsePlay(fileName, text, names) {
  const id = fileName.replace(/\.md$/, '');
  const fm = parseFrontmatter(text) || {};
  const body = String(text).replace(FRONTMATTER_BLOCK, '');
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
  const stageNumbers = String(fm.stages ?? fm.stage ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
  return {
    id,
    anchor: `play-${id.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`,
    title: heading ? heading.replace(/^play:\s*/i, '') : humanize(id),
    goal: fm.goal || '',
    version: fm.version || '',
    firstStage: stageNumbers.length > 0 ? Number(stageNumbers[0]) : Number.MAX_SAFE_INTEGER,
    steps: stageNumbers.map((n) => names.get(n) || `Step ${n}`),
    diagram: MERMAID_FENCE.exec(body)?.[1]?.trim() || '',
    branches: parseBranches(body),
    learnings: parseLearnings(body)
  };
}

function readCompanyName(kernelPath) {
  try {
    const name = JSON.parse(fs.readFileSync(kernelPath, 'utf8'))?.organization?.name;
    return typeof name === 'string' && name.trim() ? name.trim() : 'Your company';
  } catch {
    return 'Your company';
  }
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// The wide LR pipeline keeps its natural size (no max-width scaling) and scrolls sideways instead.
const WIDE_DIRECTIVE = '%%{init: {"flowchart": {"useMaxWidth": false}}}%%';

function diagram(code, { wide = false } = {}) {
  const source = wide ? `${WIDE_DIRECTIVE}\n${code}` : code;
  return `<div class="diagram${wide ? ' diagram-wide' : ''}"><pre class="mermaid">${escapeHtml(source)}</pre></div>`;
}

function renderPlay(play) {
  const steps = play.steps.length > 0 ? `<p class="meta"><span class="label">Used in:</span> ${play.steps.map(escapeHtml).join(', ')}</p>` : '';
  const goal = play.goal ? `<p class="goal"><span class="label">Goal:</span> ${inline(play.goal)}</p>` : '';
  const version = play.version ? `<span class="badge">Version ${escapeHtml(play.version)}</span>` : '';
  const say = play.branches.length > 0
    ? `<details><summary>What to say</summary><ul class="talk">${play.branches.map((b) => `<li>${b.when ? `<span class="when">${inline(b.when)}</span>` : ''}<span class="say">${inline(b.say)}</span></li>`).join('')}</ul></details>`
    : '';
  const learned = play.learnings.length > 0
    ? `<details><summary>What we've learned</summary><ul>${play.learnings.map((l) => `<li>${inline(l)}</li>`).join('')}</ul></details>`
    : '';
  return `<section class="card" id="${play.anchor}">
<div class="card-head"><h3>${escapeHtml(play.title)}</h3>${version}</div>
${goal}
${steps}
${play.diagram ? diagram(play.diagram) : ''}
${say}
${learned}
</section>`;
}

const STYLE = `:root{--bg:#f7f7f5;--card:#fff;--text:#1f2328;--muted:#5b6470;--border:#e3e3de;--accent:#2f6fde;--soft:#eef3fc}
@media (prefers-color-scheme:dark){:root{--bg:#16181c;--card:#1f2227;--text:#e8e8e6;--muted:#a3a9b2;--border:#33373e;--accent:#7aa7ff;--soft:#232a36}}
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
.label{font-weight:600}
.meta{color:var(--muted)}
.diagram{overflow-x:auto;margin:16px 0;padding:12px;border-radius:10px;background:var(--bg)}
pre.mermaid{margin:0;white-space:pre-wrap;font-size:.85rem;text-align:center}
.diagram-wide{overflow-x:auto;-webkit-overflow-scrolling:touch}
.diagram-wide pre.mermaid{text-align:left;width:max-content;min-width:100%}
.note{font-size:.9rem;color:var(--muted);background:var(--soft);border-radius:10px;padding:8px 12px}
.diagrams-ready .note{display:none}
details{margin-top:12px;border-top:1px solid var(--border);padding-top:10px}
summary{cursor:pointer;font-weight:600;color:var(--accent)}
ul.talk{list-style:none;padding:0}
ul.talk li{margin:12px 0;padding-left:12px;border-left:3px solid var(--soft)}
.when{display:block;font-size:.9rem;color:var(--muted)}
.say{display:block}
footer{margin-top:48px;color:var(--muted);font-size:.9rem}`;

const SCRIPT = `<script type="module">
import mermaid from '${MERMAID_URL}';
const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
mermaid.initialize({ startOnLoad: true, securityLevel: 'strict', theme: dark ? 'dark' : 'default' });
document.documentElement.classList.add('diagrams-ready');
</script>`;

/**
 * Build the sales system page for a brain.
 * @returns {{ html: string, plays: object[], outputPath: string }}
 */
export function buildSalesView(rootDir, { now = new Date() } = {}) {
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

  const names = stageNames(systemMd);
  const plays = playFiles
    .map((f) => parsePlay(f, fs.readFileSync(path.join(playsDir, f), 'utf8'), names))
    .sort((a, b) => a.firstStage - b.firstStage || a.id.localeCompare(b.id));
  const pipelineMd = readIfExists(path.join(salesDir, 'stages', 'pipeline-stages.md'));
  const pipeline = pipelineMd ? MERMAID_FENCE.exec(pipelineMd)?.[1]?.trim() : '';
  const company = readCompanyName(kernelPath);
  const date = now.toISOString().slice(0, 10);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(company)} · Sales system</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header>
<h1>${escapeHtml(company)} · Sales system</h1>
<p>Updated ${date}</p>
</header>
<nav aria-label="Call guides">${plays.map((p) => `<a href="#${p.anchor}">${escapeHtml(p.title)}</a>`).join('')}</nav>
<p class="note">Diagrams need an internet connection; the text version is shown below.</p>
<h2>How your sales system works</h2>
<section class="card">
${markdownToHtml(plainSystemSection(systemMd))}
</section>
<h2>Your pipeline</h2>
<section class="card">
${pipeline ? diagram(pipeline, { wide: true }) : '<p>No pipeline diagram yet. Ask your assistant to draw one.</p>'}
</section>
<h2>Your call guides</h2>
${plays.map(renderPlay).join('\n')}
<footer>Want a change? Ask your assistant, for example: "Improve the cold call guide".</footer>
</main>
${SCRIPT}
</body>
</html>
`;
  return { html, plays, outputPath: path.join(salesDir, SALES_VIEW_FILE) };
}

/** Build and write the page to sales/sales-system.html. */
export function writeSalesView(rootDir, options) {
  const view = buildSalesView(rootDir, options);
  fs.writeFileSync(view.outputPath, view.html);
  return view;
}
