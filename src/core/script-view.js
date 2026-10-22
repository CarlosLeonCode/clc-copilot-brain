// Render a parsed sales script as one standard, offline HTML page. Pure: no I/O.
// Every text is escaped first; only allowlisted relative links become <a>; no images or external urls.
// One inline script (no src, no network) turns the page into a live call assistant; without it the full diagram shows.
import { escapeHtml } from './html-escape.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { foldText } from './sales-normalize.js';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SCRIPT_LINK = new RegExp(`^(?:\\./|\\.\\./)scripts/(${SLUG})\\.html(#${SLUG})?$`);
const SIBLING_LINK = new RegExp(`^\\.\\./scripts/(${SLUG})\\.html(#${SLUG})?$`);
const GLOSSARY_LINK = new RegExp(`^\\./(?:glossary|glosario(?:-${SLUG})?)\\.md$`);
const ICP_LINK = new RegExp(`^\\./icps/${SLUG}\\.md$`);
const MD_LINK = /\[([^\]]+)\]\(((?:[^\s()]|\([^\s()]*\))*)\)/g;

// Keeps typed urls readable but never literal, so the page holds no external reference.
const neuter = (html) => html.replace(/\b(https?):\/\//gi, '$1&#58;//').replace(/url\(/gi, 'url&#40;');
const plain = (value) => neuter(escapeHtml(value));

function hrefFor(target, page) {
  if (page) {
    if (GLOSSARY_LINK.test(target)) return '#glossary';
    if (ICP_LINK.test(target)) return target;
    const m = SCRIPT_LINK.exec(target);
    return m ? `./scripts/${m[1]}.html${m[2] ?? ''}` : null;
  }
  return SIBLING_LINK.test(target) ? target : null;
}

/**
 * Escape first, then **bold** and allowlisted links. With `page: true` (the sales page) `./scripts/x.html#a`,
 * `../scripts/x.html#a` and `./icps/x.md` and the glossary (`./glossary.md`, `./glosario-x.md`) link; in a script page only `../scripts/x.html#a` links.
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
.coach{margin-top:10px;padding:10px 13px;border:1.5px dashed var(--accent);border-radius:12px;background:color-mix(in srgb,var(--accent-bg) 50%,var(--card));font-size:12px;line-height:1.5;color:var(--ink)}
.coach-tag{font-size:9.5px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:5px}
.coach p{margin:0}
[hidden]{display:none!important}
.modes{display:inline-flex;gap:4px;margin-top:12px;padding:3px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.mode{font:inherit;font-size:12px;font-weight:750;border:0;background:none;color:var(--muted);padding:6px 14px;border-radius:999px;cursor:pointer}
.mode.active{background:var(--accent);color:var(--card)}
.assistant{max-width:860px;margin:0 auto;padding:10px 16px 60px}
.live-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:10px 14px;margin-bottom:18px;background:var(--card);border:1.5px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.flow-tabs,.live-actions{display:flex;flex-wrap:wrap;gap:6px}
.flow-tab{font:inherit;font-size:12px;font-weight:750;padding:7px 13px;border-radius:999px;border:1.5px solid var(--line);background:var(--bg);color:var(--muted);cursor:pointer}
.flow-tab.active{background:var(--accent-bg);border-color:var(--accent);color:var(--accent)}
.live-btn{font:inherit;font-size:11.5px;font-weight:750;padding:7px 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}
.live-btn:hover{border-color:var(--muted)}
#live-restart:hover{border-color:var(--red);color:var(--red)}
.live-head h2{margin-top:4px}
.live-hint{color:var(--muted);font-size:12.5px;line-height:1.45;margin:12px 0 18px}
.stream{display:flex;flex-direction:column;align-items:center}
.live-node,.live-reply{width:100%;max-width:680px;outline:none}
.live-node .step-title{text-align:left}
.live-cards,.live-reply{display:flex;flex-direction:column;align-items:center}
.live-node.current .live-cards .card{box-shadow:0 0 0 2px var(--accent),var(--shadow)}
.response{margin-top:12px;padding:12px 14px;border:1.5px dashed var(--line);border-radius:14px;background:var(--card)}
.live-node.current .response{border-color:var(--accent)}
.response-prompt{font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.options{display:flex;flex-direction:column;gap:8px}
.opt{font:inherit;text-align:left;display:flex;flex-direction:column;gap:3px;padding:11px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;font-size:13.5px;font-weight:700;line-height:1.35}
.opt:hover,.opt:focus-visible,.opt.chosen{border-color:var(--accent);background:var(--accent-bg)}
.live-node:not(.current) .opt:not(.chosen){opacity:.55}
.opt-when{font-size:11.5px;font-weight:500;color:var(--muted)}
.choice{padding:5px 12px;border-radius:999px;border:1px solid var(--accent);background:var(--accent-bg);color:var(--accent);font-size:12px;font-weight:600;outline:none}
.jump{font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;text-align:center}
.end-banner{width:100%;max-width:680px;text-align:center;padding:16px 18px;border-radius:14px;background:var(--green-bg);border:1.5px solid var(--green);color:var(--green);font-weight:800;font-size:14.5px;outline:none}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.live-new{animation:rise .2s ease-out}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.live-new{animation:none}}
@media (max-width:980px){.lanes,.lanes.three{grid-template-columns:repeat(2,1fr)}.lanes.two{max-width:none}}
@media (max-width:640px){.pair,.close-row,.lanes,.lanes.three,.lanes.two{grid-template-columns:1fr}h1{font-size:22px}}`;

const CONNECTOR = '<div class="connector"></div>';
const PILL_BY_TONE = { yes: 'pill y', no: 'pill n', follow: 'pill n' };
const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${linkInline(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('');
const isEnd = (owner) => foldText(owner.next).trim() === 'end';

// An answer may have no card at all (a pure routing option: its label leads straight to `next:`).
const NO_CARD = Object.freeze({ tag: '', say: '', details: [], tip: '', coach: '', tone: 'plain' });

function renderCard(card = NO_CARD, { lang = DEFAULT_LANGUAGE, pill = '', when = '', extra = '' } = {}) {
  const coach = card.coach && `<div class="coach"><div class="coach-tag">${plain(t(lang, 'script.coach'))}</div><p>${linkInline(card.coach)}</p></div>`;
  const parts = [pill, when && `<div class="when">${plain(when)}</div>`, card.tag && `<div class="tag">${plain(card.tag)}</div>`,
    card.say && `<div class="title">${linkInline(card.say)}</div>`,
    card.details?.length ? `<div class="script">${card.details.map((d) => `<p>${linkInline(d)}</p>`).join('')}</div>` : '',
    card.tip && `<div class="tip">${linkInline(card.tip)}</div>`, coach, extra];
  return `<div class="card ${card.tone || 'plain'}">${parts.filter(Boolean).join('')}</div>`;
}

const renderCards = (cards, lang) => cards.map((card) => renderCard(card, { lang })).join(CONNECTOR);

function nextLine(owner, lang) {
  if (!owner.next) return '';
  if (isEnd(owner)) return `<div class="next">${plain(t(lang, 'script.end'))}</div>`;
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
  const cards = answer.cards.map((card, i) => renderCard(card, { lang, pill: i === 0 ? answerPill(answer) : '' }));
  return `<section class="lane">${head}<div class="stack">${cards.join(CONNECTOR)}</div>${nextLine(answer, lang)}</section>`;
}

function renderAnswers(step, lang) {
  const { answers } = step;
  const n = answers.length;
  if (n === 0) return '';
  const single = (answer) => renderCard(answer.cards[0], { lang, pill: answerPill(answer), when: answer.when, extra: nextLine(answer, lang) });
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
  const next = step.answers.length === 0 ? nextLine(step, lang) : '';
  return `<div class="step" id="${escapeHtml(step.anchor)}"><div class="step-title">${plain(step.title)}</div>`
    + `<div class="col">${renderCards(step.cards, lang)}${next}</div>${renderAnswers(step, lang)}${step.answers.length ? nextLine(step, lang) : ''}</div>`;
}

function conversationHead(conv, index, lang) {
  const rules = conv.rules.length
    ? `<div class="note"><strong>${plain(t(lang, 'script.rules'))}</strong><ul>${conv.rules.map((r) => `<li>${linkInline(r)}</li>`).join('')}</ul></div>` : '';
  const goal = conv.goal ? `<div class="subtitle"><strong>${plain(t(lang, 'script.goal'))}:</strong> ${linkInline(conv.goal)}</div>` : '';
  const note = conv.note ? `<div class="note">${linkInline(conv.note)}</div>` : '';
  return `<div class="kicker">${index + 1}</div><h2>${plain(conv.title)}</h2>${goal}${note}${rules}`;
}

function renderConversation(conv, index, { lang, hasNav }) {
  const links = [hasNav && `<a href="#top">${plain(t(lang, 'script.backToMenu'))}</a>`, `<a href="../sales-system.html">${plain(t(lang, 'script.backToPage'))}</a>`].filter(Boolean);
  return `<section class="flow" id="${escapeHtml(conv.anchor)}"><header class="header">${conversationHead(conv, index, lang)}</header>`
    + `<main class="board">${conv.steps.map((s) => renderStep(s, lang)).join(`<div class="col">${CONNECTOR}</div>`)}</main>`
    + `<div class="back">${links.join(' · ')}</div></section>`;
}

const LIVE_UI = ['ask', 'answered', 'end'];

/**
 * The live assistant's data: every conversation is a flow, every step a node and every buyer answer an option.
 * All text is escaped HTML built here (the page script only inserts it); `to` is [flow, step] or null for the end of the call.
 * Where an option leads: the answer's `next:`, else the step's `next:`, else the step below it, else the end.
 * `next:` may name a step or a whole conversation (its first step), in this or another conversation.
 * A step with no answers gets one "Continue" option to the same place, or none at all (the end) when nothing follows.
 */
export function buildAssistant(script, lang = DEFAULT_LANGUAGE) {
  const anchors = {};
  script.conversations.forEach((conv, f) => {
    if (conv.steps.length) anchors[conv.anchor] = [f, 0];
    conv.steps.forEach((step, s) => { anchors[step.anchor] = [f, s]; });
  });
  const target = (owner, fallback) => {
    if (isEnd(owner)) return null;
    return (owner.nextAnchor && anchors[owner.nextAnchor]) || fallback;
  };
  const flows = script.conversations.map((conv, f) => ({
    title: plain(conv.title),
    head: conversationHead(conv, f, lang),
    steps: conv.steps.map((step, s) => {
      const below = s + 1 < conv.steps.length ? [f, s + 1] : null;
      const go = target(step, below);
      const options = step.answers.length
        ? step.answers.map((answer) => ({
          label: plain(answer.label),
          when: answer.when ? plain(answer.when) : '',
          reply: renderCards(answer.cards, lang),
          to: target(answer, go)
        }))
        : go ? [{ label: plain(t(lang, 'script.live.continue')), when: '', reply: '', to: go }] : [];
      return { title: plain(step.title), html: renderCards(step.cards, lang), ask: step.answers.length > 0, options };
    })
  }));
  const ui = Object.fromEntries(LIVE_UI.map((key) => [key, t(lang, `script.live.${key}`)]));
  return { flows, anchors, ui };
}

// JSON inside the one inline script: `<` and `>` become \u escapes so the data can never close the script or open
// a comment; U+2028/2029 are escaped for older parsers. The text in it is already escaped HTML.
const scriptJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// The live assistant. Offline and self-contained: no network, no eval. Escaped HTML from `data` goes in with
// innerHTML; every UI label goes in with textContent. Without JavaScript the page keeps showing the full diagram.
const ASSISTANT_JS = `(function () {
  var data = __DATA__;
  var doc = document;
  var app = doc.getElementById('assistant');
  var diagram = doc.getElementById('diagram');
  var modes = doc.getElementById('modes');
  var stream = doc.getElementById('live-stream');
  var head = doc.getElementById('live-head');
  var tabs = [].slice.call(doc.querySelectorAll('[data-flow]'));
  var modeButtons = [].slice.call(doc.querySelectorAll('[data-mode]'));
  var trail = [];

  function node(tag, cls, html) {
    var el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (html) el.innerHTML = html;
    return el;
  }
  function label(tag, cls, text) {
    var el = doc.createElement(tag);
    el.className = cls;
    el.textContent = text;
    return el;
  }
  function stepOf(entry) { return data.flows[entry.f].steps[entry.s]; }
  function press(button, on) {
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function start(f, s) {
    trail = [{ f: f, s: s || 0, pick: -1 }];
    render(-1);
  }
  function choose(i, o) {
    trail = trail.slice(0, i + 1);
    trail[i].pick = o;
    var to = stepOf(trail[i]).options[o].to;
    if (to) trail.push({ f: to[0], s: to[1], pick: -1 });
    render(i);
  }
  function undo() {
    var last = trail[trail.length - 1];
    if (last.pick >= 0) last.pick = -1;
    else if (trail.length > 1) { trail.pop(); trail[trail.length - 1].pick = -1; }
    render(trail.length);
  }

  function render(from) {
    var flow = trail[trail.length - 1].f;
    tabs.forEach(function (tab) { press(tab, Number(tab.getAttribute('data-flow')) === flow); });
    head.innerHTML = data.flows[flow].head;
    stream.textContent = '';
    var focus = null;
    trail.forEach(function (entry, i) {
      var step = stepOf(entry);
      var last = i === trail.length - 1;
      var box = node('div', 'live-node' + (last ? ' current' : '') + (i > from ? ' live-new' : ''));
      box.id = 'live-' + i;
      box.tabIndex = -1;
      if (i > 0) {
        stream.appendChild(node('div', 'connector'));
        if (trail[i - 1].f !== entry.f) box.appendChild(node('div', 'jump', data.flows[entry.f].title));
      }
      if (step.title) box.appendChild(node('div', 'step-title', step.title));
      if (step.html) box.appendChild(node('div', 'live-cards', step.html));
      if (step.options.length) {
        var response = node('div', 'response');
        if (step.ask) response.appendChild(label('div', 'response-prompt', data.ui.ask));
        var list = node('div', 'options');
        step.options.forEach(function (option, o) {
          var button = node('button', 'opt' + (entry.pick === o ? ' chosen' : ''));
          button.type = 'button';
          button.setAttribute('aria-pressed', entry.pick === o ? 'true' : 'false');
          button.appendChild(node('span', 'opt-label', option.label));
          if (option.when) button.appendChild(node('span', 'opt-when', option.when));
          button.addEventListener('click', function () { choose(i, o); });
          list.appendChild(button);
        });
        response.appendChild(list);
        box.appendChild(response);
      }
      stream.appendChild(box);
      if (from >= 0 && i > from && !focus) focus = box;
      if (entry.pick < 0) {
        if (!step.options.length) { var ended = endBanner(i > from); focus = focus || ended; }
        return;
      }
      var chosen = step.options[entry.pick];
      var after = [];
      if (step.ask) {
        var badge = label('div', 'choice', data.ui.answered + ' ');
        badge.appendChild(node('strong', '', chosen.label));
        after.push(badge);
      }
      if (chosen.reply) after.push(node('div', 'live-reply', chosen.reply));
      after.forEach(function (el) {
        stream.appendChild(node('div', 'connector'));
        if (i >= from) el.className += ' live-new';
        el.tabIndex = -1;
        stream.appendChild(el);
        if (i >= from && from >= 0 && !focus) focus = el;
      });
      if (!chosen.to) { var done = endBanner(i >= from); focus = focus || done; }
    });
    if (from >= 0 && focus) {
      focus.focus({ preventScroll: true });
      focus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  function endBanner(isNew) {
    stream.appendChild(node('div', 'connector'));
    var banner = label('div', 'end-banner' + (isNew ? ' live-new' : ''), data.ui.end);
    banner.tabIndex = -1;
    stream.appendChild(banner);
    return isNew ? banner : null;
  }

  function setMode(mode) {
    var live = mode === 'live';
    app.hidden = !live;
    diagram.hidden = live;
    modeButtons.forEach(function (button) { press(button, button.getAttribute('data-mode') === mode); });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { start(Number(tab.getAttribute('data-flow')), 0); });
  });
  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () { setMode(button.getAttribute('data-mode')); });
  });
  doc.getElementById('live-undo').addEventListener('click', undo);
  doc.getElementById('live-restart').addEventListener('click', function () { start(trail[trail.length - 1].f, 0); });

  var target = data.anchors[location.hash.slice(1)];
  start(target ? target[0] : 0, target ? target[1] : 0);
  modes.hidden = false;
  setMode('live');
})();`;

function renderAssistant(script, lang) {
  const tabs = script.conversations.map((c, i) => `<button type="button" class="flow-tab" data-flow="${i}" aria-pressed="false">${i + 1}. ${plain(c.title)}</button>`).join('');
  return `<div id="assistant" class="assistant" hidden>`
    + `<div class="live-bar"><div class="flow-tabs" role="group" aria-label="${plain(t(lang, 'script.live.tabs'))}">${tabs}</div>`
    + `<div class="live-actions"><button type="button" id="live-undo" class="live-btn">⬅ ${plain(t(lang, 'script.live.undo'))}</button>`
    + `<button type="button" id="live-restart" class="live-btn">↺ ${plain(t(lang, 'script.live.restart'))}</button></div></div>`
    + `<div id="live-head" class="live-head"></div><p class="live-hint">${plain(t(lang, 'script.live.hint'))}</p>`
    + `<div id="live-stream" class="stream" aria-live="polite"></div></div>`;
}

/** One complete offline HTML document for a parsed script: the live assistant (with JavaScript) and the full diagram. */
export function renderScriptPage(script, { lang = DEFAULT_LANGUAGE, company = '', draft = false } = {}) {
  const hasNav = script.conversations.length > 1;
  const title = company ? `${company} · ${script.title}` : script.title;
  const nav = hasNav
    ? `<nav class="flows" id="top"><div class="nav-inner">${script.conversations.map((c, i) => `<a href="#${escapeHtml(c.anchor)}">${i + 1}. ${plain(c.title)}</a>`).join('')}</div></nav>` : '<span id="top"></span>';
  const badges = [script.status === 'draft' && t(lang, 'script.draftBadge'), draft && t(lang, 'view.draftBadge')].filter(Boolean)
    .map((label) => `<div class="draft">${plain(label)}</div>`).join('');
  const legend = [['g', 'yes'], ['r', 'no'], ['b', 'action'], ['y', 'follow']]
    .map(([dot, key]) => `<span><i class="dot ${dot}"></i>${plain(t(lang, `script.legend.${key}`))}</span>`).join('');
  const modes = `<div id="modes" class="modes" role="group" aria-label="${plain(t(lang, 'script.live.views'))}" hidden>`
    + `<button type="button" class="mode" data-mode="live" aria-pressed="false">${plain(t(lang, 'script.live.mode'))}</button>`
    + `<button type="button" class="mode" data-mode="diagram" aria-pressed="false">${plain(t(lang, 'script.live.diagram'))}</button></div>`;
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
<header class="header">${script.industry ? `<div class="kicker">${plain(script.industry)}</div>` : ''}<h1>${plain(script.title)}</h1>${script.intro ? `<div class="subtitle">${paragraphs(script.intro)}</div>` : ''}${badges}${modes}</header>
${renderAssistant(script, lang)}
<div id="diagram" class="diagram">
${nav}
${script.conversations.map((c, i) => renderConversation(c, i, { lang, hasNav })).join('\n')}
<div class="legend">${legend}</div>
</div>
<script>${ASSISTANT_JS.replace('__DATA__', () => scriptJson(buildAssistant(script, lang)))}</script>
</body>
</html>
`;
}
