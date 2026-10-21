// "How it's going" section of the sales page. Pure: renders a sales report (buildSalesReport) as offline HTML in its language.
// No scripts, links, images or URLs; bars are plain divs. Every text from brain files is escaped.
import { escapeHtml as esc } from './html-escape.js';
import { DEFAULT_LANGUAGE, formatMonth, t } from './i18n.js';
import { comparisonParts, dealsView, plural, rateText, scoreComparisonText, scorecardView, windowTitle } from './sales-report-text.js';

export const DASHBOARD_CSS = `.metric{margin:10px 0}
.metric-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px}
.metric-name{font-weight:600}
.metric-text{color:var(--muted)}
.bar{height:8px;border-radius:999px;background:var(--soft);overflow:hidden;margin-top:4px}
.fill{height:100%;background:var(--accent)}
.sub{margin:4px 0 0 12px;padding-left:12px;border-left:3px solid var(--soft);color:var(--muted);font-size:.95rem}
.dash h4{margin:20px 0 4px}`;

const percent = (rate) => Math.round(rate.value * 100);
const bar = (rate) => (rate.value == null ? '' : `<div class="bar" aria-hidden="true"><div class="fill" style="width:${percent(rate)}%"></div></div>`);

/** One labelled figure with its text and, once the sample is big enough, a bar. */
function metric(name, text, rate, extra = '') {
  return `<div class="metric"><div class="metric-head"><span class="metric-name">${esc(name)}</span><span class="metric-text">${esc(text)}</span></div>${rate ? bar(rate) : ''}${extra}</div>`;
}

const goalText = (rate, lang) => t(lang, 'dash.goalReachedValue', { value: rate.of === 0 ? t(lang, 'dash.notRecorded') : rateText(rate, 'calls', lang) });

function successLine(p, lang) {
  if (p.play === '') return '';
  if (p.successDefined) return `<p class="sub">${esc(t(lang, 'dash.successMeans', { text: p.successText }))}</p>`;
  const goal = p.successText ? t(lang, 'dash.successGoalIs', { text: p.successText }) : '';
  return `<p class="sub">${esc(t(lang, 'dash.successUndefined') + goal)}</p>`;
}

function guideBlock(p, lang) {
  const misses = p.stallPoints.length === 0 ? ''
    : `<div class="sub"><strong>${esc(t(lang, 'dash.misses'))}</strong><ul>${p.stallPoints.map((s) => `<li>${esc(s.when)}: ${esc(plural(s.count, 'times', lang))}</li>`).join('')}</ul></div>`;
  return metric(p.title, `${plural(p.calls, 'calls', lang)}. ${goalText(p.success, lang)}`, p.success, successLine(p, lang) + misses);
}

function scoreSection(sc, lang) {
  const v = scorecardView(sc, lang);
  const rows = (list) => list.map((x) => metric(x.name, x.text, x.fraction == null ? null : { value: x.fraction })).join('\n');
  const block = (title, list) => (list.length ? `<h4>${esc(title)}</h4>\n${rows(list)}` : '');
  return [
    `<h4>${esc(t(lang, 'score.title'))}</h4>`,
    `<p class="note">${esc(v.summary.join(', '))}</p>`,
    rows(v.dimensions),
    block(t(lang, 'score.countsTitle'), v.counts),
    block(t(lang, 'score.coverage'), v.criteria)
  ].filter(Boolean).join('\n');
}

function dealsCard(report, lang) {
  const v = dealsView(report, lang);
  const body = v.none
    ? `<p>${esc(v.none)}</p>`
    : `<p>${esc(v.summary)}</p>\n${v.rows.map((r) => metric(r.name, r.text, null)).join('\n')}`;
  return `<section class="card dash"><h3>${esc(t(lang, 'deal.title'))}</h3>\n<p class="note">${esc(t(lang, 'deal.allMonths'))}</p>\n${body}\n</section>`;
}

function windowCard(w, lang) {
  const title = windowTitle(w, lang);
  if (w.totals.calls === 0) return `<section class="card dash"><h3>${esc(title)}</h3><p>${esc(t(lang, 'dash.noCalls'))}</p></section>`;
  const parts = [
    metric(t(lang, 'dash.callsLogged'), String(w.totals.calls)),
    metric(t(lang, 'dash.goalReached'), w.totals.success.of === 0 ? t(lang, 'dash.notRecorded') : rateText(w.totals.success, 'calls', lang), w.totals.success),
    w.totals.stageAdvance.of > 0 ? metric(t(lang, 'dash.movedNext'), rateText(w.totals.stageAdvance, 'calls', lang), w.totals.stageAdvance) : '',
    w.totals.notRecorded > 0 ? `<p class="note">${esc(t(lang, 'dash.leftOutNote', { count: w.totals.notRecorded }))}</p>` : ''
  ];
  parts.push(`<h4>${esc(t(lang, 'dash.byMotion'))}</h4>`);
  for (const m of w.byMotion) {
    const won = m.won + m.lost > 0 ? t(lang, 'dash.dealsWon', { value: rateText(m.winRate, 'deals', lang) }) : '';
    const text = [plural(m.calls, 'calls', lang), m.calls > 0 ? goalText(m.success, lang) : '', won].filter(Boolean).join('. ');
    parts.push(metric(m.name, text, m.success));
  }
  const guides = w.byPlay.filter((p) => p.calls > 0);
  if (guides.length > 0) parts.push(`<h4>${esc(t(lang, 'dash.byPlay'))}</h4>`, ...guides.map((p) => guideBlock(p, lang)));
  parts.push(`<h4>${esc(t(lang, 'dash.byRep'))}</h4>`, ...w.byRep.map((r) => metric(r.rep, `${plural(r.calls, 'calls', lang)}. ${goalText(r.success, lang)}`, r.success)));
  parts.push(scoreSection(w.scorecard, lang));
  return `<section class="card dash"><h3>${esc(title)}</h3>\n${parts.join('\n')}\n</section>`;
}

function comparisonLine(c, lang) {
  if (!c) return `<p class="note">${esc(t(lang, 'compare.tooEarly'))}</p>`;
  const month = formatMonth(lang, c.from, { capitalize: false });
  return `<p class="note">${esc(t(lang, 'compare.with', { month, parts: comparisonParts(c, lang).join(', ') }))}</p>`;
}

function journeys(list, lang) {
  const shown = list.filter((j) => j.plays.length > 0);
  if (shown.length === 0) return '';
  const items = shown.map((j) => {
    const start = j.entryName ? esc(t(lang, 'dash.startsAt', { name: j.entryName })) : '';
    return `<li><strong>${esc(j.name)}</strong>: ${start}${esc(t(lang, 'dash.guides', { list: j.plays.map((p) => p.title).join(', ') }))}</li>`;
  });
  return `<h3>${esc(t(lang, 'dash.journeys'))}</h3>\n<section class="card"><ul>${items.join('')}</ul></section>`;
}

/** The whole section, as an HTML string, in the report's language. */
export function renderDashboard(report, lang = report.language ?? DEFAULT_LANGUAGE) {
  const notes = [];
  if (report.unclassified.length > 0) {
    notes.push(t(lang, 'notes.unclassified', { records: plural(report.unclassified.length, 'callsOrDeals', lang) }));
  }
  if (report.excluded.demo > 0) notes.push(t(lang, 'notes.sample'));
  if (report.excluded.skipped > 0) notes.push(t(lang, 'notes.skipped', { count: report.excluded.skipped }));
  return `<h2 id="how-its-going">${esc(t(lang, 'dash.title'))}</h2>
${report.windows.map((w) => windowCard(w, lang)).join('\n')}
${comparisonLine(report.comparison, lang)}
${scoreComparisonText(report.comparison, lang) ? `<p class="note">${esc(scoreComparisonText(report.comparison, lang))}</p>` : ''}
${notes.map((n) => `<p class="note">${esc(n)}</p>`).join('\n')}
${dealsCard(report, lang)}
${journeys(report.journeys, lang)}`;
}
