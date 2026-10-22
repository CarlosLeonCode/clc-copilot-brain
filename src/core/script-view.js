// Render a parsed sales script as one standard, offline HTML page. Pure: no I/O.
// Every text is escaped first; only allowlisted relative links become <a>; no scripts, images or external urls.
import { escapeHtml } from './html-escape.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { foldText } from './sales-normalize.js';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SCRIPT_LINK = new RegExp(`^(?:\\./|\\.\\./)scripts/(${SLUG})\\.html(#${SLUG})?$`);
const SIBLING_LINK = new RegExp(`^\\.\\./scripts/(${SLUG})\\.html(#${SLUG})?$`);
const GLOSSARY_LINK = new RegExp(`^\\./(?:glossary|glosario(?:-${SLUG})?)\\.md$`);
const MD_LINK = /\[([^\]]+)\]\(((?:[^\s()]|\([^\s()]*\))*)\)/g;

// Keeps typed urls readable but never literal, so the page holds no external reference.
const neuter = (html) => html.replace(/\b(https?):\/\//gi, '$1&#58;//').replace(/url\(/gi, 'url&#40;');
const plain = (value) => neuter(escapeHtml(value));

function hrefFor(target, page) {
  if (page) {
    if (GLOSSARY_LINK.test(target)) return '#glossary';
    const m = SCRIPT_LINK.exec(target);
    return m ? `./scripts/${m[1]}.html${m[2] ?? ''}` : null;
  }
  return SIBLING_LINK.test(target) ? target : null;
}

/**
 * Escape first, then **bold** and allowlisted links. With `page: true` (the sales page) `./scripts/x.html#a`,
 * `../scripts/x.html#a` and the glossary (`./glossary.md`, `./glosario-x.md`) link; in a script page only `../scripts/x.html#a` links.
 * Any other link keeps its label as plain text.
 */
export function linkInline(text, { page = false } = {}) {
  return neuter(escapeHtml(text))
    .replace(MD_LINK, (_, label, target) => {
      const href = hrefFor(target, page);
      return href ? `<a href="${href}">${label}</a>` : label;
    })
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export const SCRIPT_CSS = `:root{--bg:#f7f7f5;--card:#fff;--ink:#1f2328;--muted:#5b6470;--line:#e3e3de;--accent:#2f6fde;--accent-bg:#eef3fc;--green:#2f8f5b;--green-bg:#eef8f2;--red:#c2405a;--red-bg:#fdf1f4;--yellow:#b7791f;--yellow-bg:#fdf6e9;--shadow:0 6px 20px rgba(31,35,40,.07)}
@media (prefers-color-scheme:dark){:root{--bg:#16181c;--card:#1f2227;--ink:#e8e8e6;--muted:#a3a9b2;--line:#33373e;--accent:#7aa7ff;--accent-bg:#232a36;--green:#6fcf97;--green-bg:#1c2b23;--red:#ef8aa0;--red-bg:#2f1c22;--yellow:#e8b65a;--yellow-bg:#2d2618;--shadow:0 6px 20px rgba(0,0,0,.35)}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent)}
.header{max-width:1200px;margin:0 auto;padding:28px 16px 10px}
.kicker{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
h1{margin:6px 0 4px;font-size:27px;line-height:1.15}
h2{margin:6px 0 4px;font-size:22px;line-height:1.2}
.subtitle{color:var(--muted);font-size:13px;line-height:1.45;max-width:780px}
.subtitle p{margin:0 0 6px}
.draft{display:inline-block;margin-top:10px;padding:4px 10px;border-radius:999px;background:var(--yellow-bg);border:1px solid var(--yellow);color:var(--yellow);font-size:11px;font-weight:700}
.board{max-width:1200px;margin:0 auto;padding:10px 16px 40px}
.col{display:flex;flex-direction:column;align-items:center}
.card{position:relative;background:var(--card);border:1.5px solid var(--line);border-radius:15px;box-shadow:var(--shadow);padding:15px 17px;width:100%;max-width:680px}
.card .when{font-size:11.5px;color:var(--muted);margin-bottom:6px}
.card .tag{font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.card .title{font-size:15px;line-height:1.38;font-weight:700}
.card .script{margin-top:9px;font-size:13px;line-height:1.5;color:var(--muted)}
.card .script p{margin:0 0 7px}
.card .script p:last-child{margin:0}
.card .tip{margin-top:10px;font-size:11.5px;line-height:1.4;color:var(--accent);font-weight:600}
.start,.plain{background:var(--card)}
.yes{border-color:var(--green);background:var(--green-bg)}
.no{border-color:var(--red);background:var(--red-bg)}
.action{border-color:var(--accent);background:var(--accent-bg)}
.follow{border-color:var(--yellow);background:var(--yellow-bg)}
.pill{position:absolute;top:-11px;left:14px;padding:3px 9px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-size:9px;font-weight:850;letter-spacing:.07em}
.pill.y{color:var(--green);border-color:var(--green)}
.pill.n{left:auto;right:14px;color:var(--red);border-color:var(--red)}
.connector{height:20px;width:2px;background:var(--line);position:relative;flex:none}
.connector:after{content:"";position:absolute;bottom:-1px;left:-4px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid var(--line)}
.step-title{font-size:11px;font-weight:700;color:var(--muted);margin:0 0 8px;text-align:center}
.next{margin-top:10px;font-size:12px;color:var(--muted);font-weight:600}
.pair{display:grid;grid-template-columns:2fr 1fr;gap:20px;width:100%;max-width:1000px;align-items:start}
.pair .card,.close-row .card,.lane .card{max-width:none}
.close-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%;max-width:1000px}
.section-title{margin:30px 0 14px;text-align:center;font-size:11px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;color:var(--muted)}
.lanes{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:start}
.lanes.three{grid-template-columns:repeat(3,1fr)}
.lanes.two{grid-template-columns:repeat(2,1fr);max-width:calc((100% - 32px) / 3 * 2 + 16px);margin:0 auto}
.lanes.one{grid-template-columns:minmax(0,680px);justify-content:center}
.lane{border:1px solid var(--line);border-radius:18px;padding:18px 14px 20px;background:color-mix(in srgb,var(--card) 55%,var(--bg))}
.lane-head{text-align:center;margin-bottom:16px}
.lane-head .number{font-size:10px;font-weight:850;letter-spacing:.1em;color:var(--accent);text-transform:uppercase}
.lane-head h3{margin:4px 0 0;font-size:16px}
.lane-head .when{margin-top:5px;font-size:11.5px;color:var(--muted);line-height:1.35}
.stack{display:flex;flex-direction:column;align-items:center}
.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;margin:26px auto 0;font-size:11px;color:var(--muted)}
.legend span{display:flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid var(--line)}
.dot.g{background:var(--green-bg);border-color:var(--green)}
.dot.r{background:var(--red-bg);border-color:var(--red)}
.dot.b{background:var(--accent-bg);border-color:var(--accent)}
.dot.y{background:var(--yellow-bg);border-color:var(--yellow)}
.note{max-width:860px;margin:14px 0 0;padding:12px 16px;border:1px solid var(--line);border-radius:12px;color:var(--muted);font-size:12px;line-height:1.5;background:var(--card)}
.note strong{color:var(--ink)}
.note ul{margin:6px 0 0;padding-left:18px}
.flows{position:sticky;top:0;z-index:20;background:var(--card);border-bottom:1px solid var(--line)}
.nav-inner{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;gap:6px}
.nav-inner a{font-size:12.5px;font-weight:700;color:var(--ink);text-decoration:none;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:var(--bg)}
.flow{scroll-margin-top:60px;border-top:1px solid var(--line)}
.back{max-width:1200px;margin:0 auto;padding:0 16px 30px;text-align:right;font-size:12px}
@media (max-width:980px){.lanes,.lanes.three{grid-template-columns:repeat(2,1fr)}.lanes.two{max-width:none}}
@media (max-width:640px){.pair,.close-row,.lanes,.lanes.three,.lanes.two{grid-template-columns:1fr}h1{font-size:22px}}`;

const CONNECTOR = '<div class="connector"></div>';
const PILL_BY_TONE = { yes: 'pill y', no: 'pill n', follow: 'pill n' };
const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${linkInline(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('');

function renderCard(card, { pill = '', when = '', extra = '' } = {}) {
  const parts = [pill, when && `<div class="when">${plain(when)}</div>`, card.tag && `<div class="tag">${plain(card.tag)}</div>`,
    `<div class="title">${linkInline(card.say)}</div>`,
    card.details.length ? `<div class="script">${card.details.map((d) => `<p>${linkInline(d)}</p>`).join('')}</div>` : '',
    card.tip && `<div class="tip">${linkInline(card.tip)}</div>`, extra];
  return `<div class="card ${card.tone}">${parts.filter(Boolean).join('')}</div>`;
}

function nextLine(owner, lang) {
  if (!owner.next) return '';
  if (foldText(owner.next).trim() === 'end') return `<div class="next">${plain(t(lang, 'script.end'))}</div>`;
  const label = plain(owner.next);
  const target = owner.nextAnchor ? `<a href="#${escapeHtml(owner.nextAnchor)}">${label}</a>` : label;
  return `<div class="next">${plain(t(lang, 'script.next'))} ${target}</div>`;
}

function answerPill(answer) {
  const cls = PILL_BY_TONE[answer.cards[0]?.tone] ?? 'pill';
  return `<div class="${cls}">${plain(answer.label)}</div>`;
}

function renderLane(answer, number, lang) {
  const head = `<div class="lane-head"><div class="number">${plain(t(lang, 'script.route', { number: String(number).padStart(2, '0') }))}</div>`
    + `<h3>${plain(answer.label)}</h3>${answer.when ? `<div class="when">${plain(answer.when)}</div>` : ''}</div>`;
  const cards = answer.cards.map((card, i) => renderCard(card, { pill: i === 0 ? answerPill(answer) : '' }));
  return `<section class="lane">${head}<div class="stack">${cards.join(CONNECTOR)}</div>${nextLine(answer, lang)}</section>`;
}

function renderAnswers(step, lang) {
  const { answers } = step;
  const n = answers.length;
  if (n === 0) return '';
  const single = (answer) => renderCard(answer.cards[0], { pill: answerPill(answer), when: answer.when, extra: nextLine(answer, lang) });
  const lanes = answers.some((a) => a.cards.length > 1) || n >= 4;
  const wrap = (inner) => `<div class="col">${CONNECTOR}</div>${inner}`;
  if (lanes) {
    const cls = { 1: 'lanes one', 2: 'lanes two', 3: 'lanes three' }[n] ?? 'lanes';
    return wrap(`<div class="section-title">${plain(t(lang, 'script.routes', { count: n }))}</div><div class="${cls}">${answers.map((a, i) => renderLane(a, i + 1, lang)).join('')}</div>`);
  }
  if (n === 1) return wrap(`<div class="col answers">${single(answers[0])}</div>`);
  return wrap(`<div class="${n === 2 ? 'pair' : 'close-row'}">${answers.map(single).join('')}</div>`);
}

function renderStep(step, lang) {
  const cards = step.cards.map((card) => renderCard(card)).join(CONNECTOR);
  const next = step.answers.length === 0 ? nextLine(step, lang) : '';
  return `<div class="step" id="${escapeHtml(step.anchor)}"><div class="step-title">${plain(step.title)}</div>`
    + `<div class="col">${cards}${next}</div>${renderAnswers(step, lang)}${step.answers.length ? nextLine(step, lang) : ''}</div>`;
}

function renderConversation(conv, index, { lang, hasNav }) {
  const rules = conv.rules.length
    ? `<div class="note"><strong>${plain(t(lang, 'script.rules'))}</strong><ul>${conv.rules.map((r) => `<li>${linkInline(r)}</li>`).join('')}</ul></div>` : '';
  const goal = conv.goal ? `<div class="subtitle"><strong>${plain(t(lang, 'script.goal'))}:</strong> ${linkInline(conv.goal)}</div>` : '';
  const note = conv.note ? `<div class="note">${linkInline(conv.note)}</div>` : '';
  const links = [hasNav && `<a href="#top">${plain(t(lang, 'script.backToMenu'))}</a>`, `<a href="../sales-system.html">${plain(t(lang, 'script.backToPage'))}</a>`].filter(Boolean);
  return `<section class="flow" id="${escapeHtml(conv.anchor)}"><header class="header"><div class="kicker">${index + 1}</div>`
    + `<h2>${plain(conv.title)}</h2>${goal}${note}${rules}</header>`
    + `<main class="board">${conv.steps.map((s) => renderStep(s, lang)).join(`<div class="col">${CONNECTOR}</div>`)}</main>`
    + `<div class="back">${links.join(' · ')}</div></section>`;
}

/** One complete offline HTML document for a parsed script. */
export function renderScriptPage(script, { lang = DEFAULT_LANGUAGE, company = '', draft = false } = {}) {
  const hasNav = script.conversations.length > 1;
  const title = company ? `${company} · ${script.title}` : script.title;
  const nav = hasNav
    ? `<nav class="flows" id="top"><div class="nav-inner">${script.conversations.map((c, i) => `<a href="#${escapeHtml(c.anchor)}">${i + 1}. ${plain(c.title)}</a>`).join('')}</div></nav>` : '<span id="top"></span>';
  const badges = [script.status === 'draft' && t(lang, 'script.draftBadge'), draft && t(lang, 'view.draftBadge')].filter(Boolean)
    .map((label) => `<div class="draft">${plain(label)}</div>`).join('');
  const legend = [['g', 'yes'], ['r', 'no'], ['b', 'action'], ['y', 'follow']]
    .map(([dot, key]) => `<span><i class="dot ${dot}"></i>${plain(t(lang, `script.legend.${key}`))}</span>`).join('');
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="clc-brain">
<title>${plain(title)}</title>
<style>${SCRIPT_CSS}</style>
</head>
<body>
${nav}
<header class="header">${script.industry ? `<div class="kicker">${plain(script.industry)}</div>` : ''}<h1>${plain(script.title)}</h1>${script.intro ? `<div class="subtitle">${paragraphs(script.intro)}</div>` : ''}${badges}</header>
${script.conversations.map((c, i) => renderConversation(c, i, { lang, hasNav })).join('\n')}
<div class="legend">${legend}</div>
</body>
</html>
`;
}
