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
// The look follows the hand-made live script pages (ADR 0010 addendum): white cards with a coloured top stripe per tone,
// the words to say behind a blue bar, amber "what to do" and violet advice boxes, a sticky top bar and big answer buttons.
const S = Object.freeze({
  html: 'scroll-smooth motion-reduce:scroll-auto bg-page text-ink',
  body: 'm-0 bg-page text-ink font-sans antialiased [&_a:not([class])]:text-accent',
  nav: 'sticky top-0 z-20 border-b border-line bg-card shadow-xs',
  navInner: 'mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5',
  brand: 'text-xs font-extrabold tracking-wide text-accent',
  navLinks: 'flex flex-wrap gap-1.5',
  navLink: 'rounded-full border border-line bg-page px-3 py-1.5 text-[12.5px] font-bold text-ink no-underline hover:border-accent hover:text-accent max-tablet:px-2 max-tablet:text-xs',
  modes: 'inline-flex gap-1 rounded-full border border-line bg-page p-[3px]',
  mode: 'font-sans cursor-pointer rounded-full border-0 bg-transparent px-3.5 py-1.5 text-xs font-bold text-muted transition hover:text-ink aria-pressed:bg-accent aria-pressed:text-on-accent aria-pressed:shadow-md',
  badges: 'mx-auto flex max-w-[1200px] flex-wrap gap-2 px-4 pt-4',
  draft: 'inline-block rounded-full border border-tip-line bg-tip px-2.5 py-1 text-[11px] font-bold text-tip-label',
  header: 'mx-auto max-w-[1200px] px-4 pb-2.5 pt-7',
  kicker: 'text-[11px] font-extrabold uppercase tracking-[.12em] text-accent',
  h1: 'mb-1 mt-1.5 text-[27px] font-extrabold leading-tight max-tablet:text-[22px]',
  subtitle: 'max-w-[780px] text-[13px] leading-snug text-muted [&_p]:mt-0 [&_p]:mb-1.5 [&_strong]:font-bold [&_strong]:text-ink-soft',
  legend: 'mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-muted',
  legendItem: 'inline-flex items-center gap-1.5',
  swatch: 'inline-block h-3.5 w-3.5 rounded-sm border border-line border-t-4 bg-card',
  flow: 'scroll-mt-[calc(var(--nav-h)+8px)] border-t border-line first-of-type:border-t-0',
  board: 'mx-auto max-w-[1200px] px-4 pb-16 pt-2.5',
  step: 'scroll-mt-[calc(var(--nav-h)+16px)]',
  col: 'flex flex-col items-center',
  connector: 'relative h-5 w-0.5 flex-none bg-line-strong after:absolute after:-bottom-px after:-left-1 after:border-x-[5px] after:border-t-[7px] after:border-x-transparent after:border-t-line-strong',
  card: 'relative w-full rounded-2xl border-[1.5px] border-line bg-card px-[17px] py-[15px] shadow-xs',
  cardNarrow: 'max-w-[680px]',
  cardWide: 'max-w-none',
  when: 'mb-1.5 text-[11.5px] leading-snug text-muted',
  label: 'mb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-faint',
  stepLabel: 'mb-2 text-center text-[10px] font-extrabold uppercase tracking-[.1em] text-faint',
  say: 'border-l-4 border-accent pl-3 text-base font-semibold leading-snug text-ink',
  sayLane: 'border-l-4 border-accent pl-3 text-[14px] font-semibold leading-snug text-ink',
  script: 'mt-2.5 border-l-4 border-accent/40 pl-3 text-[13.5px] leading-relaxed text-ink-soft [&_p]:mt-0 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-ink',
  condition: 'text-[0.92em] text-subtle',
  tip: 'mt-2.5 rounded-lg border border-tip-line bg-tip px-3 py-2 text-[12px] font-medium leading-snug text-tip-ink',
  tipLabel: 'mb-0.5 text-[9.5px] font-extrabold uppercase tracking-[.1em] text-tip-label',
  coach: 'mt-2.5 rounded-xl border border-coach-line bg-coach px-3.5 py-2.5 text-[12.5px] leading-snug text-coach-ink [&_p]:m-0',
  coachLabel: 'mb-0.5 text-[9.5px] font-extrabold uppercase tracking-[.1em] text-coach-label',
  pill: 'absolute -top-[11px] rounded-full border bg-card px-2.5 py-[3px] text-[9px] font-extrabold tracking-[.07em]',
  next: 'mt-2.5 text-[12px] font-semibold text-muted [&_a]:text-accent [&_a]:no-underline',
  pair: 'grid w-full max-w-[1000px] grid-cols-1 items-start gap-5 tablet:grid-cols-2',
  closeRow: 'grid w-full max-w-[1000px] grid-cols-1 items-start gap-3 tablet:grid-cols-3',
  sectionTitle: 'mb-3.5 mt-8 text-center text-[11px] font-extrabold uppercase tracking-[.11em] text-muted',
  lane: 'rounded-[18px] border border-line bg-lane px-3.5 pb-5 pt-[18px]',
  laneHead: 'mb-4 text-center',
  laneNumber: 'text-[10px] font-extrabold uppercase tracking-[.1em] text-accent',
  laneTitle: 'mb-0 mt-1 text-base font-bold',
  laneWhen: 'mt-1 text-[11.5px] leading-snug text-muted',
  note: 'mx-auto mt-[18px] max-w-[860px] rounded-xl border border-coach-line bg-coach px-4 py-3 text-[12.5px] leading-normal text-coach-ink [&_strong]:text-coach-strong [&_ul]:mb-0 [&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-[18px]',
  noteLabel: 'mb-1 text-[9.5px] font-extrabold uppercase tracking-[.1em] text-coach-label',
  back: 'mx-auto -mt-8 mb-10 max-w-[1200px] px-4 text-right text-xs [&_a]:font-bold [&_a]:text-accent [&_a]:no-underline',
  // Live assistant shell: a sticky top bar (a sidebar from 1200px), the conversation header with its legend, the stream.
  assistant: 'mx-auto max-w-[860px] px-4 pb-20 pt-6 wide:grid wide:max-w-[1180px] wide:grid-cols-[250px_minmax(0,860px)] wide:items-start wide:justify-center wide:gap-x-8',
  sidebar: 'contents wide:sticky wide:top-[calc(var(--nav-h)+24px)] wide:col-start-1 wide:row-span-2 wide:row-start-1 wide:block wide:self-start',
  topbar: 'sticky top-[calc(var(--nav-h)+8px)] z-[15] mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-line bg-card px-[18px] py-3 shadow-xs '
    + 'max-tablet:flex-nowrap max-tablet:gap-2 max-tablet:rounded-[14px] max-tablet:px-2.5 max-tablet:py-2 wide:static wide:flex-col wide:items-stretch',
  tabs: 'flex flex-wrap gap-2 max-tablet:min-w-0 max-tablet:flex-1 max-tablet:flex-nowrap max-tablet:overflow-x-auto max-tablet:[scrollbar-width:none] wide:flex-col',
  flowTab: 'font-sans cursor-pointer rounded-full border-[1.5px] border-line bg-page px-4 py-[7px] text-xs font-bold text-muted transition hover:text-ink '
    + 'aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent max-tablet:whitespace-nowrap max-tablet:px-[11px] max-tablet:py-1.5 wide:rounded-xl wide:px-3.5 wide:py-2.5 wide:text-left',
  actions: 'flex gap-2 max-tablet:shrink-0 max-tablet:gap-1.5 wide:flex-col wide:border-t wide:border-line wide:pt-3',
  undo: 'font-sans cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-line bg-card px-3 py-[7px] text-[11.5px] font-bold text-ink transition hover:border-faint max-tablet:px-2 max-tablet:py-1.5 wide:py-[9px]',
  restart: 'font-sans cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-line bg-card px-3 py-[7px] text-[11.5px] font-bold text-ink transition hover:border-red-line hover:text-red max-tablet:px-2 max-tablet:py-1.5 wide:py-[9px]',
  actionLabel: 'max-tablet:hidden',
  liveIntro: 'mb-6 text-center wide:col-start-2 wide:row-start-1',
  liveTitle: 'mb-1 mt-1.5 text-[26px] font-extrabold leading-tight max-tablet:text-[22px]',
  liveSubtitle: 'mx-auto max-w-[640px] text-[13px] leading-snug text-muted [&_strong]:font-bold [&_strong]:text-ink-soft',
  liveLegend: 'mx-auto mt-3.5 flex max-w-[640px] flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-subtle',
  swatchSay: 'inline-block h-3.5 w-3.5 rounded-sm border border-line border-l-4 border-l-accent bg-card',
  swatchAnswered: 'inline-block h-3.5 w-3.5 rounded-full border border-line-strong bg-chip',
  swatchTip: 'inline-block h-3.5 w-3.5 rounded-sm border border-tip-line bg-tip',
  swatchCoach: 'inline-block h-3.5 w-3.5 rounded-sm border border-coach-line bg-coach',
  liveHint: 'mx-auto mb-0 mt-2.5 max-w-[640px] text-[11.5px] leading-snug text-faint',
  streamWrap: 'wide:col-start-2 wide:row-start-2',
  stream: 'flex flex-col items-center'
});

/** Cards of the live assistant: bigger words to say, labelled boxes, and a ring on the step in progress. */
const L = Object.freeze({
  card: 'relative w-full max-w-[680px] rounded-2xl border border-line bg-card p-4 shadow-xs transition tablet:p-5 '
    + 'in-data-current:shadow-lg in-data-current:ring-2 in-data-current:ring-accent/25',
  label: S.label,
  words: 'border-l-4 border-accent pl-4',
  wordsLabel: 'mb-1 text-[10px] font-extrabold uppercase tracking-[.1em] text-accent',
  say: 'text-base font-semibold leading-snug text-ink in-data-current:text-[18px] tablet:in-data-current:text-[19px]',
  script: 'mt-3 text-[14.5px] leading-relaxed text-ink-soft in-data-current:text-[15.5px] [&_p]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-ink',
  tip: 'mt-4 rounded-xl border border-tip-line bg-tip px-3.5 py-2.5 text-[13px] leading-snug text-tip-ink in-data-past:opacity-75',
  tipLabel: 'mb-0.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-tip-label',
  coach: 'mt-3 rounded-xl border border-coach-line bg-coach px-3.5 py-2.5 text-[13px] leading-snug text-coach-ink in-data-past:opacity-75 [&_p]:m-0',
  coachLabel: 'mb-0.5 text-[10px] font-extrabold uppercase tracking-[.1em] text-coach-label'
});

/** Card tones: the coloured top stripe of each `tone:` (start and plain have none). */
const TONE = Object.freeze({
  start: '',
  plain: '',
  yes: 'border-t-4 border-t-green-line',
  no: 'border-t-4 border-t-red-line',
  action: 'border-t-4 border-t-accent',
  follow: 'border-t-4 border-t-yellow-line'
});

/** The answer pill on a card: [data-pill value, side and colours]. */
const PILL = Object.freeze({
  plain: ['plain', 'left-3.5 border-line'],
  yes: ['y', 'left-3.5 border-green-line text-green'],
  no: ['n', 'right-3.5 border-red-line text-red']
});
const PILL_BY_TONE = { yes: PILL.yes, no: PILL.no, follow: PILL.no };

/** Legend swatches of the diagram: [tone key, stripe colour]. */
const LEGEND = [['yes', 'border-t-green-line'], ['no', 'border-t-red-line'], ['action', 'border-t-accent'], ['follow', 'border-t-yellow-line']];
/** Legend of the live assistant: [legend key, swatch]. */
const LIVE_LEGEND = [['say', S.swatchSay], ['answered', S.swatchAnswered], ['tip', S.swatchTip], ['coach', S.swatchCoach]];

/** Answer layouts: [data-layout value, grid classes] by lane count (4 or more share the last one). */
const LANES = Object.freeze({
  1: ['lanes-1', 'grid gap-4 items-start grid-cols-[minmax(0,680px)] justify-center'],
  2: ['lanes-2', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 mx-auto desktop:max-w-[calc((100%-32px)/3*2+16px)]'],
  3: ['lanes-3', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3'],
  many: ['lanes', 'grid gap-4 items-start grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4']
});

/** Classes the live assistant script puts on the elements it builds (sent to the page in its data). */
export const LIVE_CLASSES = Object.freeze({
  group: 'flex w-full max-w-[680px] flex-col items-center outline-none',
  cards: 'flex w-full flex-col items-center',
  connector: S.connector,
  jump: 'mb-2 text-center text-[11px] font-extrabold uppercase tracking-[.08em] text-accent',
  host: L.card,
  hostLabel: S.label,
  badge: 'mb-3 inline-block max-w-full rounded-2xl border border-line bg-chip px-2.5 py-1 text-[11.5px] font-medium leading-snug text-subtle [&_strong]:font-bold [&_strong]:text-ink-soft',
  response: 'mt-5 border-x-0 border-b-0 border-t border-dashed border-line-strong pt-4',
  promptRow: 'mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1',
  prompt: 'text-[11.5px] font-extrabold uppercase tracking-[.08em] text-muted',
  keys: 'text-[11px] font-medium text-faint max-tablet:hidden',
  options: 'flex flex-col gap-2',
  option: 'font-sans cursor-pointer flex w-full items-center justify-between gap-3 rounded-xl border-2 border-line bg-card px-4 py-3 text-left text-[14px] font-bold leading-snug text-ink-soft transition '
    + 'hover:translate-x-0.5 hover:border-accent hover:bg-accent-soft focus-visible:border-accent focus-visible:bg-accent-soft active:scale-[.99]',
  optionMain: 'flex min-w-0 items-center gap-3',
  kbd: 'flex h-6 min-w-[24px] flex-none items-center justify-center rounded-md border border-line-strong bg-page px-1.5 font-sans text-[12px] font-bold text-subtle shadow-[inset_0_-1px_0_rgba(15,23,42,.12)] max-tablet:hidden',
  optionText: 'flex flex-col gap-[3px]',
  optionWhen: 'text-[11.5px] font-medium text-muted',
  arrow: 'flex-none text-base text-accent',
  end: 'mt-4 w-full rounded-xl border-2 border-green-line bg-green-soft px-5 py-4 text-center text-[14.5px] font-extrabold text-green-strong',
  rise: 'animate-rise motion-reduce:animate-none'
});

const CONNECTOR = `<div class="${S.connector}"></div>`;
const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${linkInline(p.replace(/\s*\n\s*/g, ' '))}</p>`).join('');
const isEnd = (owner) => foldText(owner.next).trim() === 'end';
// A detail that opens with a bold condition ("**If they hesitate:** ...") reads a bit smaller, like a stage direction.
const CONDITION = /^<strong>[^<]*:\s*<\/strong>/;
const detailParagraph = (detail) => {
  const html = linkInline(detail);
  return CONDITION.test(html) ? `<p class="${S.condition}">${html}</p>` : `<p>${html}</p>`;
};

// An answer may have no card at all (a pure routing option: its label leads straight to `next:`).
const NO_CARD = Object.freeze({ tag: '', say: '', details: [], tip: '', coach: '', tone: 'plain' });

/** The inside of a card: label (step title and/or tag), the words to say, the script lines, what to do and the advice. */
function cardBody(card, { lang, live, label, lane }) {
  const C = live ? L : S;
  // A tag that already names the step ("Step 1 · Greet" under "Greet") is the whole label.
  const labelText = label && !foldText(card.tag).includes(foldText(label)) ? [label, card.tag].filter(Boolean).join(' · ') : card.tag;
  const say = card.say ? `<div class="${lane ? S.sayLane : C.say}">${linkInline(card.say)}</div>` : '';
  const details = card.details?.length ? `<div class="${C.script}">${card.details.map(detailParagraph).join('')}</div>` : '';
  const words = live && (say || details)
    ? `<div class="${L.words}"><div class="${L.wordsLabel}">${plain(t(lang, 'script.live.say'))}</div>${say}${details}</div>`
    : say + details;
  return [
    labelText && `<div class="${C.label}">${plain(labelText)}</div>`,
    words,
    card.tip && `<div data-tip class="${C.tip}"><div class="${C.tipLabel}">${plain(t(lang, 'script.tipLabel'))}</div>${linkInline(card.tip)}</div>`,
    card.coach && `<div data-coach class="${C.coach}"><div class="${C.coachLabel}">${plain(t(lang, 'script.coach'))}</div><p>${linkInline(card.coach)}</p></div>`
  ].filter(Boolean).join('');
}

function renderCard(card = NO_CARD, { lang = DEFAULT_LANGUAGE, pill = '', when = '', extra = '', wide = false, live = false, label = '', lane = false } = {}) {
  const tone = Object.hasOwn(TONE, card.tone) ? card.tone : 'plain';
  const body = cardBody(card, { lang, live, label, lane });
  if (live) return `<div data-tone="${tone}" class="${L.card} ${TONE[tone]}">${body}</div>`;
  const parts = [pill, when && `<div class="${S.when}">${plain(when)}</div>`, body, extra];
  return `<div data-tone="${tone}" class="${S.card} ${wide ? S.cardWide : S.cardNarrow} ${TONE[tone]}">${parts.filter(Boolean).join('')}</div>`;
}

/** Cards joined by connectors; `label` (the step title) heads the first card. */
const renderCards = (cards, lang, { live = false, label = '' } = {}) => cards
  .map((card, i) => renderCard(card, { lang, live, label: i === 0 ? label : '' })).join(CONNECTOR);

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
  const cards = answer.cards.map((card, i) => renderCard(card, { lang, wide: true, lane: true, pill: i === 0 ? answerPill(answer) : '' }));
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
  const cards = step.cards.length ? renderCards(step.cards, lang, { label: step.title }) : `<div class="${S.stepLabel}">${plain(step.title)}</div>`;
  const next = step.answers.length === 0 ? nextLine(step, lang) : '';
  return `<div id="${escapeHtml(step.anchor)}" class="${S.step}"><div class="${S.col}">${cards}${next}</div>${renderAnswers(step, lang)}${step.answers.length && step.next ? `<div class="${S.col}">${nextLine(step, lang)}</div>` : ''}</div>`;
}

const goalLine = (conv, lang, cls) => (conv.goal
  ? `<div class="${cls}">${plain(t(lang, 'script.goal'))}: <strong>${linkInline(conv.goal)}</strong></div>` : '');

/** The conversation header the live assistant shows above the stream. */
function liveHead(conv, index, lang) {
  return `<div class="${S.kicker}">${plain(t(lang, 'script.conversationNumber', { number: index + 1 }))}</div>`
    + `<h2 class="${S.liveTitle}">${plain(conv.title)}</h2>${goalLine(conv, lang, S.liveSubtitle)}`;
}

/** Advice and rules close the conversation in the diagram, in the violet advice box. */
function conversationNotes(conv, lang) {
  const note = conv.note ? `<div class="${S.note}"><div class="${S.noteLabel}">${plain(t(lang, 'script.noteLabel'))}</div>${linkInline(conv.note)}</div>` : '';
  const rules = conv.rules.length
    ? `<div class="${S.note}"><div class="${S.noteLabel}">${plain(t(lang, 'script.rules'))}</div><ul>${conv.rules.map((r) => `<li>${linkInline(r)}</li>`).join('')}</ul></div>` : '';
  return note + rules;
}

function renderConversation(conv, index, { lang, hasNav }) {
  const links = [hasNav && `<a href="#top">↑ ${plain(t(lang, 'script.backToMenu'))}</a>`, `<a href="../sales-system.html">${plain(t(lang, 'script.backToPage'))}</a>`].filter(Boolean);
  const head = `<div class="${S.kicker}">${plain(t(lang, 'script.conversationNumber', { number: index + 1 }))}</div>`
    + `<h2 class="${S.h1}">${plain(conv.title)}</h2>${goalLine(conv, lang, S.subtitle)}`;
  return `<section class="${S.flow}" id="${escapeHtml(conv.anchor)}"><header class="${S.header}">${head}</header>`
    + `<main class="${S.board}">${conv.steps.map((s) => renderStep(s, lang)).join(`<div class="${S.col}">${CONNECTOR}</div>`)}${conversationNotes(conv, lang)}</main>`
    + `<div class="${S.back}">${links.join(' · ')}</div></section>`;
}

const LIVE_UI = ['ask', 'answered', 'end', 'keys'];

/**
 * The live assistant's data: every conversation is a flow, every step a node and every buyer answer an option.
 * All text is escaped HTML built here (the page script only inserts it); `to` is [flow, step] or null for the end of the call.
 * Where an option leads: the answer's `next:`, else the step's `next:`, else the step below it, else the end.
 * `next:` may name a step or a whole conversation (its first step), in this or another conversation.
 * A step with no answers gets one "Continue" option to the same place, or none at all (the end) when nothing follows.
 * A step with answers also gets "Continue — the conversation went on" to that place unless an answer already goes there.
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
    head: liveHead(conv, f, lang),
    steps: conv.steps.map((step, s) => {
      const below = s + 1 < conv.steps.length ? [f, s + 1] : null;
      const go = target(step, below);
      const options = step.answers.map((answer) => ({
        label: plain(answer.label),
        when: answer.when ? plain(answer.when) : '',
        reply: renderCards(answer.cards, lang, { live: true }),
        to: target(answer, go)
      }));
      // The default path (the step's next: or the step below) stays reachable when no answer already takes it.
      if (go && !options.some((o) => o.to && o.to[0] === go[0] && o.to[1] === go[1])) {
        const key = options.length ? 'script.live.continueDefault' : 'script.live.continue';
        options.push({ label: plain(t(lang, key)), when: '', reply: '', to: go });
      }
      return { title: plain(step.title), html: renderCards(step.cards, lang, { live: true, label: step.title }), ask: step.answers.length > 0, options };
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
// One card group per step (and per reply), joined by connectors; only the step in progress shows the answer buttons,
// and what the client answered shows as a chip on top of the next card. Keys 1-9 pick an answer, Backspace undoes.
const ASSISTANT_JS = `(function () {
  var data = __DATA__;
  var doc = document;
  var root = doc.documentElement;
  var nav = doc.getElementById('top');
  var navLinks = doc.getElementById('nav-links');
  var app = doc.getElementById('assistant');
  var diagram = doc.getElementById('diagram');
  var modes = doc.getElementById('modes');
  var stream = doc.getElementById('live-stream');
  var head = doc.getElementById('live-head');
  var tabs = [].slice.call(doc.querySelectorAll('[data-flow]'));
  var modeButtons = [].slice.call(doc.querySelectorAll('[data-mode]'));
  var cls = data.cls;
  var trail = [];
  var choices = [];

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
  function cardsIn(box) { return box.querySelectorAll('[data-tone], [data-host]'); }
  function lastCard(box) { var all = cardsIn(box); return all[all.length - 1]; }

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
    choices = [];
    var groups = [];
    var chip = null;
    var focus = null;

    function group(html, isNew, jump, title) {
      if (groups.length) stream.appendChild(node('div', cls.connector));
      var box = node('div', cls.group + (isNew ? ' ' + cls.rise : ''));
      box.id = 'live-' + groups.length;
      box.tabIndex = -1;
      box.setAttribute('data-past', '');
      if (jump) box.appendChild(node('div', cls.jump, jump));
      if (html) box.appendChild(node('div', cls.cards, html));
      else {
        var host = node('div', cls.host);
        host.setAttribute('data-host', '');
        if (title) host.appendChild(node('div', cls.hostLabel, title));
        box.appendChild(host);
      }
      if (chip) { var first = cardsIn(box)[0]; first.insertBefore(chip, first.firstChild); chip = null; }
      stream.appendChild(box);
      groups.push(box);
      if (isNew && from >= 0 && !focus) focus = box;
      return box;
    }
    function options(box, step, i) {
      var response = node('div', cls.response);
      var row = node('div', cls.promptRow);
      if (step.ask) row.appendChild(label('span', cls.prompt, data.ui.ask));
      if (step.options.length > 1) row.appendChild(label('span', cls.keys, data.ui.keys.replace('{n}', String(Math.min(9, step.options.length)))));
      if (row.firstChild) response.appendChild(row);
      var list = node('div', cls.options);
      step.options.forEach(function (option, o) {
        var button = node('button', cls.option);
        button.type = 'button';
        var main = node('span', cls.optionMain);
        if (o < 9) {
          var key = label('kbd', cls.kbd, String(o + 1));
          key.setAttribute('aria-hidden', 'true');
          main.appendChild(key);
        }
        var text = node('span', cls.optionText);
        text.appendChild(node('span', '', option.label));
        if (option.when) text.appendChild(node('span', cls.optionWhen, option.when));
        main.appendChild(text);
        button.appendChild(main);
        var arrow = label('span', cls.arrow, '\u2794');
        arrow.setAttribute('aria-hidden', 'true');
        button.appendChild(arrow);
        button.addEventListener('click', function () { choose(i, o); });
        list.appendChild(button);
        choices.push(button);
      });
      response.appendChild(list);
      lastCard(box).appendChild(response);
    }
    function end(box) {
      var banner = label('div', cls.end, data.ui.end);
      if (chip) { banner.insertBefore(chip, banner.firstChild); chip = null; }
      lastCard(box).appendChild(banner);
    }

    trail.forEach(function (entry, i) {
      var step = stepOf(entry);
      var jump = i > 0 && trail[i - 1].f !== entry.f ? data.flows[entry.f].title : '';
      var box = group(step.html, i > from, jump, step.title);
      if (entry.pick < 0) {
        if (step.options.length) options(box, step, i);
        else end(box);
        return;
      }
      var chosen = step.options[entry.pick];
      if (step.ask) {
        chip = label('div', cls.badge, data.ui.answered + ' ');
        chip.appendChild(node('strong', '', chosen.label));
      }
      if (chosen.reply) group(chosen.reply, i >= from, '', '');
      if (!chosen.to) end(groups[groups.length - 1]);
    });
    var current = groups[groups.length - 1];
    current.removeAttribute('data-past');
    current.setAttribute('data-current', '');
    if (from >= 0) {
      focus = focus || current;
      focus.focus({ preventScroll: true });
      focus.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function syncNav() { root.style.setProperty('--nav-h', nav.offsetHeight + 'px'); }
  function setMode(mode) {
    var live = mode === 'live';
    app.hidden = !live;
    diagram.hidden = live;
    if (navLinks) navLinks.hidden = live;
    modeButtons.forEach(function (button) { press(button, button.getAttribute('data-mode') === mode); });
    syncNav();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { start(Number(tab.getAttribute('data-flow')), 0); });
  });
  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () { setMode(button.getAttribute('data-mode')); });
  });
  doc.getElementById('live-undo').addEventListener('click', undo);
  doc.getElementById('live-restart').addEventListener('click', function () { start(trail[trail.length - 1].f, 0); });
  doc.addEventListener('keydown', function (e) {
    if (app.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    var el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    if (e.key === 'Backspace') { e.preventDefault(); undo(); return; }
    var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '') || /^([1-9])$/.exec(e.key || '');
    var button = m && choices[Number(m[1]) - 1];
    if (!button) return;
    e.preventDefault();
    button.click();
  });
  window.addEventListener('resize', syncNav);

  var target = data.anchors[location.hash.slice(1)];
  start(target ? target[0] : 0, target ? target[1] : 0);
  modes.hidden = false;
  setMode('live');
})();`;

function renderAssistant(script, lang) {
  const tabs = script.conversations.map((c, i) => `<button type="button" class="${S.flowTab}" data-flow="${i}" aria-pressed="false">${i + 1}. ${plain(c.title)}</button>`).join('');
  const legend = LIVE_LEGEND.map(([key, swatch]) => `<span class="${S.legendItem}"><i class="${swatch}"></i>${plain(t(lang, `script.legend.${key}`))}</span>`).join('');
  const action = (id, cls, icon, key) => `<button type="button" id="${id}" class="${cls}" title="${plain(t(lang, key))}">${icon}`
    + `<span class="${S.actionLabel}"> ${plain(t(lang, key))}</span></button>`;
  return `<div id="assistant" class="${S.assistant}" hidden>`
    + `<aside class="${S.sidebar}"><div class="${S.topbar}"><div class="${S.tabs}" role="group" aria-label="${plain(t(lang, 'script.live.tabs'))}">${tabs}</div>`
    + `<div class="${S.actions}">${action('live-undo', S.undo, '⬅', 'script.live.undo')}${action('live-restart', S.restart, '↺', 'script.live.restart')}</div></div></aside>`
    + `<div class="${S.liveIntro}"><div id="live-head"></div><div class="${S.liveLegend}">${legend}</div><p class="${S.liveHint}">${plain(t(lang, 'script.live.hint'))}</p></div>`
    + `<div class="${S.streamWrap}"><div id="live-stream" class="${S.stream}" aria-live="polite"></div></div></div>`;
}

/** One complete offline HTML document for a parsed script: the live assistant (with JavaScript) and the full diagram. */
export function renderScriptPage(script, { lang = DEFAULT_LANGUAGE, company = '', draft = false } = {}) {
  const hasNav = script.conversations.length > 1;
  const title = company ? `${company} · ${script.title}` : script.title;
  const navLinks = hasNav
    ? `<div id="nav-links" class="${S.navLinks}">${script.conversations.map((c, i) => `<a class="${S.navLink}" href="#${escapeHtml(c.anchor)}">${i + 1}. ${plain(c.title)}</a>`).join('')}</div>` : '';
  const modes = `<div id="modes" class="${S.modes}" role="group" aria-label="${plain(t(lang, 'script.live.views'))}" hidden>`
    + `<button type="button" class="${S.mode}" data-mode="live" aria-pressed="false">${plain(t(lang, 'script.live.mode'))}</button>`
    + `<button type="button" class="${S.mode}" data-mode="diagram" aria-pressed="false">${plain(t(lang, 'script.live.diagram'))}</button></div>`;
  const nav = `<nav class="${S.nav}" id="top"><div class="${S.navInner}"><div class="${S.brand}">${plain(title)}</div>${modes}${navLinks}</div></nav>`;
  const badges = [script.status === 'draft' && t(lang, 'script.draftBadge'), draft && t(lang, 'view.draftBadge')].filter(Boolean)
    .map((label) => `<div data-badge="draft" class="${S.draft}">${plain(label)}</div>`).join('');
  const legend = LEGEND
    .map(([key, stripe]) => `<span class="${S.legendItem}"><i class="${S.swatch} ${stripe}"></i>${plain(t(lang, `script.legend.${key}`))}</span>`).join('');
  const pageHead = `<header class="${S.header}">${script.industry ? `<div class="${S.kicker}">${plain(script.industry)}</div>` : ''}<h1 class="${S.h1}">${plain(script.title)}</h1>`
    + `${script.intro ? `<div class="${S.subtitle}">${paragraphs(script.intro)}</div>` : ''}<div class="${S.legend}">${legend}</div></header>`;
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
${nav}
${badges ? `<div class="${S.badges}">${badges}</div>` : ''}
${renderAssistant(script, lang)}
<div id="diagram">
${pageHead}
${script.conversations.map((c, i) => renderConversation(c, i, { lang, hasNav })).join('\n')}
</div>
<script>${ASSISTANT_JS.replace('__DATA__', () => scriptJson(buildAssistant(script, lang)))}</script>
</body>
</html>
`;
}
