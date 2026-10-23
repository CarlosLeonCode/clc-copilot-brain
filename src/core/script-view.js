// Render a parsed sales script as one standard, offline HTML page. Pure: no I/O.
// Every text is escaped first; only allowlisted relative links become <a>; no images or external urls.
// One inline script (no src, no network) turns the page into a live call assistant; without it the full diagram shows.
import { escapeHtml } from './html-escape.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';
import { foldText } from './sales-normalize.js';
import { PAGE_CSS } from './styles/compiled.js';

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

// Tailwind class lists of script pages. This file is an @source of src/core/styles/brain.css, so every class here is
// compiled into src/core/styles/compiled.js: write whole class names only (never build them from pieces), then run
// `npm run build:css`. State lives in attributes (aria-pressed, data-current, data-past), styled with variants.
const S = Object.freeze({
  html: 'scroll-smooth motion-reduce:scroll-auto bg-page text-ink',
  body: 'm-0 bg-page text-ink font-ui [&_a:not([class])]:text-accent',
  header: 'max-w-[1200px] mx-auto pt-7 px-4 pb-2.5',
  kicker: 'text-[11px] font-extrabold tracking-[.12em] uppercase text-accent',
  h1: 'mt-1.5 mb-1 mx-0 text-[22px] tablet:text-[27px] leading-[1.15]',
  h2: 'mt-1.5 mb-1 mx-0 text-[22px] leading-[1.2]',
  subtitle: 'text-muted text-[13px] leading-[1.45] max-w-[780px] [&_p]:mt-0 [&_p]:mb-1.5',
  draft: 'inline-block mt-2.5 py-1 px-2.5 rounded-full bg-yellow-soft border border-yellow text-yellow text-[11px] font-bold',
  board: 'max-w-[1200px] mx-auto pt-2.5 px-4 pb-10',
  col: 'flex flex-col items-center',
  connector: 'relative flex-none h-5 w-0.5 bg-line after:absolute after:-bottom-px after:-left-1 after:border-x-[5px] after:border-x-transparent after:border-t-[7px] after:border-t-line',
  card: 'relative border-[1.5px] rounded-[15px] shadow-[var(--card-shadow)] py-[15px] px-[17px] w-full in-data-current:shadow-[0_0_0_2px_var(--color-accent),var(--card-shadow)]',
  cardNarrow: 'max-w-[680px]',
  cardWide: 'max-w-none',
  when: 'text-[11.5px] text-muted mb-1.5',
  tag: 'text-[9.5px] font-[850] tracking-[.1em] uppercase text-muted mb-[7px]',
  title: 'text-[15px] leading-[1.38] font-bold',
  details: 'mt-[9px] text-[13px] leading-[1.5] text-muted [&_p]:mt-0 [&_p]:mb-[7px] [&_p:last-child]:mb-0',
  tip: 'mt-2.5 text-[11.5px] leading-[1.4] text-accent font-semibold',
  coach: 'mt-2.5 py-2.5 px-[13px] border-[1.5px] border-dashed border-accent rounded-xl bg-[color-mix(in_srgb,var(--color-accent-soft)_50%,var(--color-card))] text-[12px] leading-[1.5] text-ink [&_p]:m-0',
  coachTag: 'text-[9.5px] font-[850] tracking-[.1em] uppercase text-accent mb-[5px]',
  pill: 'absolute -top-[11px] py-[3px] px-[9px] rounded-full bg-card border text-[9px] font-[850] tracking-[.07em]',
  stepTitle: 'mt-0 mb-2 text-[11px] font-bold text-muted text-center',
  next: 'mt-2.5 text-[12px] text-muted font-semibold',
  pair: 'grid grid-cols-1 tablet:grid-cols-[2fr_1fr] gap-5 w-full max-w-[1000px] items-start',
  closeRow: 'grid grid-cols-1 tablet:grid-cols-3 gap-4 w-full max-w-[1000px]',
  sectionTitle: 'mt-[30px] mb-3.5 text-center text-[11px] font-[850] tracking-[.11em] uppercase text-muted',
  lane: 'border border-line rounded-[18px] pt-[18px] px-3.5 pb-5 bg-[color-mix(in_srgb,var(--color-card)_55%,var(--color-page))]',
  laneHead: 'text-center mb-4',
  laneNumber: 'text-[10px] font-[850] tracking-[.1em] text-accent uppercase',
  laneTitle: 'mt-1 mb-0 mx-0 text-[16px]',
  laneWhen: 'mt-[5px] text-[11.5px] text-muted leading-[1.35]',
  note: 'max-w-[860px] mt-3.5 mb-0 mx-0 py-3 px-4 border border-line rounded-xl text-muted text-[12px] leading-[1.5] bg-card [&_strong]:text-ink [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ul]:pl-[18px]',
  nav: 'sticky top-0 z-20 bg-card border-b border-line',
  navInner: 'max-w-[1200px] mx-auto py-2.5 px-4 flex flex-wrap gap-1.5',
  navLink: 'text-[12.5px] font-bold text-ink no-underline py-1.5 px-[11px] rounded-full border border-line bg-page',
  flow: 'scroll-mt-[60px] border-t border-line',
  back: 'max-w-[1200px] mx-auto pt-0 px-4 pb-[30px] text-right text-[12px]',
  legend: 'flex flex-wrap justify-center gap-[18px] mt-[26px] mx-auto mb-0 text-[11px] text-muted',
  legendItem: 'flex items-center gap-1.5',
  dot: 'inline-block w-2.5 h-2.5 rounded-full border',
  modes: 'inline-flex gap-1 mt-3 p-[3px] rounded-full border border-line bg-card',
  mode: 'font-ui text-[12px] font-[750] border-0 bg-transparent text-muted py-1.5 px-3.5 rounded-full cursor-pointer aria-pressed:bg-accent aria-pressed:text-card',
  assistant: 'max-w-[860px] mx-auto pt-2.5 px-4 pb-[60px]',
  liveBar: 'flex flex-wrap justify-between items-center gap-2.5 py-2.5 px-3.5 mb-[18px] bg-card border-[1.5px] border-line rounded-2xl shadow-[var(--card-shadow)]',
  group: 'flex flex-wrap gap-1.5',
  flowTab: 'font-ui text-[12px] font-[750] py-[7px] px-[13px] rounded-full border-[1.5px] border-line bg-page text-muted cursor-pointer aria-pressed:bg-accent-soft aria-pressed:border-accent aria-pressed:text-accent',
  undo: 'font-ui text-[11.5px] font-[750] py-[7px] px-3 rounded-[10px] border-[1.5px] border-line bg-card text-ink cursor-pointer hover:border-muted',
  restart: 'font-ui text-[11.5px] font-[750] py-[7px] px-3 rounded-[10px] border-[1.5px] border-line bg-card text-ink cursor-pointer hover:border-red hover:text-red',
  liveHead: '[&_h2]:mt-1',
  liveHint: 'mt-3 mb-[18px] mx-0 text-muted text-[12.5px] leading-[1.45]',
  stream: 'flex flex-col items-center'
});

/** Card tones: border and background of each `tone:`. */
const TONE = Object.freeze({
  start: 'border-line bg-card',
  plain: 'border-line bg-card',
  yes: 'border-green bg-green-soft',
  no: 'border-red bg-red-soft',
  action: 'border-accent bg-accent-soft',
  follow: 'border-yellow bg-yellow-soft'
});

/** The answer pill on a card: [data-pill value, side and colours]. */
const PILL = Object.freeze({
  plain: ['plain', 'left-[14px] border-line'],
  yes: ['y', 'left-[14px] text-green border-green'],
  no: ['n', 'right-[14px] text-red border-red']
});
const PILL_BY_TONE = { yes: PILL.yes, no: PILL.no, follow: PILL.no };

/** Legend dots: [tone key, dot colours]. */
const LEGEND = [['yes', 'bg-green-soft border-green'], ['no', 'bg-red-soft border-red'], ['action', 'bg-accent-soft border-accent'], ['follow', 'bg-yellow-soft border-yellow']];

/** Answer layouts: [data-layout value, grid classes] by lane count (4 or more share the last one). */
const LANES = Object.freeze({
  1: ['lanes-1', 'grid gap-4 items-start grid-cols-[minmax(0,680px)] justify-center'],
  2: ['lanes-2', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 mx-auto desktop:max-w-[calc((100%-32px)/3*2+16px)]'],
  3: ['lanes-3', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3'],
  many: ['lanes', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4']
});

/** Classes the live assistant script puts on the elements it builds (sent to the page in its data). */
export const LIVE_CLASSES = Object.freeze({
  node: 'w-full max-w-[680px] outline-none',
  connector: S.connector,
  jump: 'mb-2 text-center text-[11px] font-[850] tracking-[.08em] uppercase text-accent',
  stepTitle: 'mt-0 mb-2 text-[11px] font-bold text-muted text-left',
  cards: 'flex flex-col items-center',
  response: 'mt-3 py-3 px-3.5 border-[1.5px] border-dashed border-line rounded-[14px] bg-card in-data-current:border-accent',
  prompt: 'mb-2.5 text-[11px] font-[850] tracking-[.08em] uppercase text-accent',
  options: 'flex flex-col gap-2',
  option: 'font-ui text-left flex flex-col gap-[3px] py-[11px] px-3.5 rounded-xl border-[1.5px] border-line bg-card text-ink cursor-pointer text-[13.5px] font-bold leading-[1.35] '
    + 'hover:border-accent hover:bg-accent-soft focus-visible:border-accent focus-visible:bg-accent-soft aria-pressed:border-accent aria-pressed:bg-accent-soft in-data-past:not-aria-pressed:opacity-55',
  optionWhen: 'text-[11.5px] font-medium text-muted',
  choice: 'py-[5px] px-3 rounded-full border border-accent bg-accent-soft text-accent text-[12px] font-semibold outline-none',
  reply: 'w-full max-w-[680px] outline-none flex flex-col items-center',
  end: 'w-full max-w-[680px] text-center py-4 px-[18px] rounded-[14px] bg-green-soft border-[1.5px] border-green text-green font-extrabold text-[14.5px] outline-none',
  rise: 'animate-rise motion-reduce:animate-none'
});

const CONNECTOR = `<div class="${S.connector}"></div>`;
const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${linkInline(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('');
const isEnd = (owner) => foldText(owner.next).trim() === 'end';

// An answer may have no card at all (a pure routing option: its label leads straight to `next:`).
const NO_CARD = Object.freeze({ tag: '', say: '', details: [], tip: '', coach: '', tone: 'plain' });

function renderCard(card = NO_CARD, { lang = DEFAULT_LANGUAGE, pill = '', when = '', extra = '', wide = false } = {}) {
  const coach = card.coach && `<div data-coach class="${S.coach}"><div class="${S.coachTag}">${plain(t(lang, 'script.coach'))}</div><p>${linkInline(card.coach)}</p></div>`;
  const parts = [pill, when && `<div class="${S.when}">${plain(when)}</div>`, card.tag && `<div class="${S.tag}">${plain(card.tag)}</div>`,
    card.say && `<div class="${S.title}">${linkInline(card.say)}</div>`,
    card.details?.length ? `<div class="${S.details}">${card.details.map((d) => `<p>${linkInline(d)}</p>`).join('')}</div>` : '',
    card.tip && `<div class="${S.tip}">${linkInline(card.tip)}</div>`, coach, extra];
  const tone = TONE[card.tone] ? card.tone : 'plain';
  return `<div data-tone="${tone}" class="${S.card} ${wide ? S.cardWide : S.cardNarrow} ${TONE[tone]}">${parts.filter(Boolean).join('')}</div>`;
}

const renderCards = (cards, lang) => cards.map((card) => renderCard(card, { lang })).join(CONNECTOR);

function nextLine(owner, lang) {
  if (!owner.next) return '';
  if (isEnd(owner)) return `<div class="${S.next}">${plain(t(lang, 'script.end'))}</div>`;
  const label = plain(owner.next);
  const target = owner.nextAnchor ? `<a href="#${escapeHtml(owner.nextAnchor)}">${label}</a>` : label;
  return `<div class="${S.next}">${plain(t(lang, 'script.next'))} ${target}</div>`;
}

function answerPill(answer) {
  const [kind, side] = PILL_BY_TONE[answer.cards[0]?.tone] ?? PILL.plain;
  return `<div data-pill="${kind}" class="${S.pill} ${side}">${plain(answer.label)}</div>`;
}

function renderLane(answer, number, lang) {
  const head = `<div class="${S.laneHead}"><div class="${S.laneNumber}">${plain(t(lang, 'script.route', { number: String(number).padStart(2, '0') }))}</div>`
    + `<h3 class="${S.laneTitle}">${plain(answer.label)}</h3>${answer.when ? `<div class="${S.laneWhen}">${plain(answer.when)}</div>` : ''}</div>`;
  const cards = answer.cards.map((card, i) => renderCard(card, { lang, wide: true, pill: i === 0 ? answerPill(answer) : '' }));
  return `<section data-lane class="${S.lane}">${head}<div class="${S.col}">${cards.join(CONNECTOR)}</div>${nextLine(answer, lang)}</section>`;
}

function renderAnswers(step, lang) {
  const { answers } = step;
  const n = answers.length;
  if (n === 0) return '';
  const single = (answer, wide) => renderCard(answer.cards[0], { lang, wide, pill: answerPill(answer), when: answer.when, extra: nextLine(answer, lang) });
  const lanes = answers.some((a) => a.cards.length > 1) || n >= 4;
  const wrap = (inner) => `<div class="${S.col}">${CONNECTOR}</div>${inner}`;
  if (lanes) {
    const [layout, cls] = LANES[n] ?? LANES.many;
    return wrap(`<div class="${S.sectionTitle}">${plain(t(lang, 'script.routes', { count: n }))}</div><div data-layout="${layout}" class="${cls}">${answers.map((a, i) => renderLane(a, i + 1, lang)).join('')}</div>`);
  }
  if (n === 1) return wrap(`<div data-layout="single" class="${S.col}">${single(answers[0], false)}</div>`);
  const [layout, cls] = n === 2 ? ['pair', S.pair] : ['close-row', S.closeRow];
  return wrap(`<div data-layout="${layout}" class="${cls}">${answers.map((a) => single(a, true)).join('')}</div>`);
}

function renderStep(step, lang) {
  const next = step.answers.length === 0 ? nextLine(step, lang) : '';
  return `<div id="${escapeHtml(step.anchor)}"><div class="${S.stepTitle}">${plain(step.title)}</div>`
    + `<div class="${S.col}">${renderCards(step.cards, lang)}${next}</div>${renderAnswers(step, lang)}${step.answers.length ? nextLine(step, lang) : ''}</div>`;
}

function conversationHead(conv, index, lang) {
  const rules = conv.rules.length
    ? `<div class="${S.note}"><strong>${plain(t(lang, 'script.rules'))}</strong><ul>${conv.rules.map((r) => `<li>${linkInline(r)}</li>`).join('')}</ul></div>` : '';
  const goal = conv.goal ? `<div class="${S.subtitle}"><strong>${plain(t(lang, 'script.goal'))}:</strong> ${linkInline(conv.goal)}</div>` : '';
  const note = conv.note ? `<div class="${S.note}">${linkInline(conv.note)}</div>` : '';
  return `<div class="${S.kicker}">${index + 1}</div><h2 class="${S.h2}">${plain(conv.title)}</h2>${goal}${note}${rules}`;
}

function renderConversation(conv, index, { lang, hasNav }) {
  const links = [hasNav && `<a href="#top">${plain(t(lang, 'script.backToMenu'))}</a>`, `<a href="../sales-system.html">${plain(t(lang, 'script.backToPage'))}</a>`].filter(Boolean);
  return `<section class="${S.flow}" id="${escapeHtml(conv.anchor)}"><header class="${S.header}">${conversationHead(conv, index, lang)}</header>`
    + `<main class="${S.board}">${conv.steps.map((s) => renderStep(s, lang)).join(`<div class="${S.col}">${CONNECTOR}</div>`)}</main>`
    + `<div class="${S.back}">${links.join(' · ')}</div></section>`;
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
  return { flows, anchors, ui, cls: LIVE_CLASSES };
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
  var cls = data.cls;
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
      var box = node('div', cls.node + (i > from ? ' ' + cls.rise : ''));
      box.setAttribute(last ? 'data-current' : 'data-past', '');
      box.id = 'live-' + i;
      box.tabIndex = -1;
      if (i > 0) {
        stream.appendChild(node('div', cls.connector));
        if (trail[i - 1].f !== entry.f) box.appendChild(node('div', cls.jump, data.flows[entry.f].title));
      }
      if (step.title) box.appendChild(node('div', cls.stepTitle, step.title));
      if (step.html) box.appendChild(node('div', cls.cards, step.html));
      if (step.options.length) {
        var response = node('div', cls.response);
        if (step.ask) response.appendChild(label('div', cls.prompt, data.ui.ask));
        var list = node('div', cls.options);
        step.options.forEach(function (option, o) {
          var button = node('button', cls.option);
          button.type = 'button';
          button.setAttribute('aria-pressed', entry.pick === o ? 'true' : 'false');
          button.appendChild(node('span', '', option.label));
          if (option.when) button.appendChild(node('span', cls.optionWhen, option.when));
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
        var badge = label('div', cls.choice, data.ui.answered + ' ');
        badge.appendChild(node('strong', '', chosen.label));
        after.push(badge);
      }
      if (chosen.reply) after.push(node('div', cls.reply, chosen.reply));
      after.forEach(function (el) {
        stream.appendChild(node('div', cls.connector));
        if (i >= from) el.className += ' ' + cls.rise;
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
    stream.appendChild(node('div', cls.connector));
    var banner = label('div', cls.end + (isNew ? ' ' + cls.rise : ''), data.ui.end);
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
  const tabs = script.conversations.map((c, i) => `<button type="button" class="${S.flowTab}" data-flow="${i}" aria-pressed="false">${i + 1}. ${plain(c.title)}</button>`).join('');
  return `<div id="assistant" class="${S.assistant}" hidden>`
    + `<div class="${S.liveBar}"><div class="${S.group}" role="group" aria-label="${plain(t(lang, 'script.live.tabs'))}">${tabs}</div>`
    + `<div class="${S.group}"><button type="button" id="live-undo" class="${S.undo}">⬅ ${plain(t(lang, 'script.live.undo'))}</button>`
    + `<button type="button" id="live-restart" class="${S.restart}">↺ ${plain(t(lang, 'script.live.restart'))}</button></div></div>`
    + `<div id="live-head" class="${S.liveHead}"></div><p class="${S.liveHint}">${plain(t(lang, 'script.live.hint'))}</p>`
    + `<div id="live-stream" class="${S.stream}" aria-live="polite"></div></div>`;
}

/** One complete offline HTML document for a parsed script: the live assistant (with JavaScript) and the full diagram. */
export function renderScriptPage(script, { lang = DEFAULT_LANGUAGE, company = '', draft = false } = {}) {
  const hasNav = script.conversations.length > 1;
  const title = company ? `${company} · ${script.title}` : script.title;
  const nav = hasNav
    ? `<nav class="${S.nav}" id="top"><div class="${S.navInner}">${script.conversations.map((c, i) => `<a class="${S.navLink}" href="#${escapeHtml(c.anchor)}">${i + 1}. ${plain(c.title)}</a>`).join('')}</div></nav>` : '<span id="top"></span>';
  const badges = [script.status === 'draft' && t(lang, 'script.draftBadge'), draft && t(lang, 'view.draftBadge')].filter(Boolean)
    .map((label) => `<div data-badge="draft" class="${S.draft}">${plain(label)}</div>`).join('');
  const legend = LEGEND
    .map(([key, colors]) => `<span class="${S.legendItem}"><i class="${S.dot} ${colors}"></i>${plain(t(lang, `script.legend.${key}`))}</span>`).join('');
  const modes = `<div id="modes" class="${S.modes}" role="group" aria-label="${plain(t(lang, 'script.live.views'))}" hidden>`
    + `<button type="button" class="${S.mode}" data-mode="live" aria-pressed="false">${plain(t(lang, 'script.live.mode'))}</button>`
    + `<button type="button" class="${S.mode}" data-mode="diagram" aria-pressed="false">${plain(t(lang, 'script.live.diagram'))}</button></div>`;
  return `<!doctype html>
<html lang="${escapeHtml(lang)}" class="${S.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="clc-brain">
<title>${plain(title)}</title>
<style>${PAGE_CSS}</style>
</head>
<body class="${S.body}">
<header class="${S.header}">${script.industry ? `<div class="${S.kicker}">${plain(script.industry)}</div>` : ''}<h1 class="${S.h1}">${plain(script.title)}</h1>${script.intro ? `<div class="${S.subtitle}">${paragraphs(script.intro)}</div>` : ''}${badges}${modes}</header>
${renderAssistant(script, lang)}
<div id="diagram">
${nav}
${script.conversations.map((c, i) => renderConversation(c, i, { lang, hasNav })).join('\n')}
<div class="${S.legend}">${legend}</div>
</div>
<script>${ASSISTANT_JS.replace('__DATA__', () => scriptJson(buildAssistant(script, lang)))}</script>
</body>
</html>
`;
}
