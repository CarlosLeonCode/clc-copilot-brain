// "How it's going" section of the sales page. Pure: renders a sales report (buildSalesReport) as offline HTML.
// No scripts, links, images or URLs; bars are plain divs. Every text from brain files is escaped.
import { escapeHtml as esc } from './html-escape.js';
import { monthTitle, plural, rateText } from './sales-report-text.js';

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

const goalText = (rate) => (rate.of === 0 ? 'Goal reached: not recorded yet' : `Goal reached: ${rateText(rate)}`);

function successLine(p) {
  if (p.play === '') return '';
  if (p.successDefined) return `<p class="sub">Success means: ${esc(p.successText)}</p>`;
  return `<p class="sub">Success not defined yet${p.successText ? ` (the goal is: ${esc(p.successText)})` : ''}</p>`;
}

function guideBlock(p) {
  const misses = p.stallPoints.length === 0 ? ''
    : `<div class="sub"><strong>Where calls miss their goal</strong><ul>${p.stallPoints.map((s) => `<li>${esc(s.when)}: ${plural(s.count, 'time')}</li>`).join('')}</ul></div>`;
  return metric(p.title, `${plural(p.calls, 'call')}. ${goalText(p.success)}`, p.success, successLine(p) + misses);
}

function windowCard(w) {
  const title = `${monthTitle(w.month)}${w.complete ? '' : ' (so far)'}`;
  if (w.totals.calls === 0) return `<section class="card dash"><h3>${esc(title)}</h3><p>No calls logged yet.</p></section>`;
  const parts = [
    metric('Calls logged', String(w.totals.calls)),
    metric('Goal reached', w.totals.success.of === 0 ? 'not recorded yet' : rateText(w.totals.success), w.totals.success),
    w.totals.stageAdvance.of > 0 ? metric('Moved to the next step', rateText(w.totals.stageAdvance), w.totals.stageAdvance) : '',
    w.totals.notRecorded > 0 ? `<p class="note">${plural(w.totals.notRecorded, 'call')} without a goal result ${w.totals.notRecorded === 1 ? 'is' : 'are'} left out of the goal numbers.</p>` : ''
  ];
  parts.push('<h4>By type of sale</h4>');
  for (const m of w.byMotion) {
    const won = m.won + m.lost > 0 ? `Deals won: ${rateText(m.winRate, 'deals')}` : '';
    const text = [plural(m.calls, 'call'), m.calls > 0 ? goalText(m.success) : '', won].filter(Boolean).join('. ');
    parts.push(metric(m.name, text, m.success));
  }
  const guides = w.byPlay.filter((p) => p.calls > 0);
  if (guides.length > 0) parts.push('<h4>By call guide</h4>', ...guides.map(guideBlock));
  parts.push('<h4>By person</h4>', ...w.byRep.map((r) => metric(r.rep, `${plural(r.calls, 'call')}. ${goalText(r.success)}`, r.success)));
  return `<section class="card dash"><h3>${esc(title)}</h3>\n${parts.join('\n')}\n</section>`;
}

function comparisonLine(c) {
  if (!c) return '<p class="note">Comparison with the month before: too early to tell (it needs at least 10 calls in both months).</p>';
  const pts = (n) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)} points`;
  const parts = [`${plural(Math.abs(c.calls), 'call')} ${c.calls >= 0 ? 'more' : 'fewer'}`];
  if (c.success != null) parts.push(`goal reached ${pts(c.success)}`);
  if (c.stageAdvance != null) parts.push(`moved to the next step ${pts(c.stageAdvance)}`);
  return `<p class="note">Compared with ${esc(monthTitle(c.from))}: ${esc(parts.join(', '))}.</p>`;
}

function journeys(list) {
  const shown = list.filter((j) => j.plays.length > 0);
  if (shown.length === 0) return '';
  const items = shown.map((j) => {
    const start = j.entryName ? `Starts at ${esc(j.entryName)}. ` : '';
    return `<li><strong>${esc(j.name)}</strong>: ${start}Call guides: ${j.plays.map((p) => esc(p.title)).join(', ')}.</li>`;
  });
  return `<h3>How deals start</h3>\n<section class="card"><ul>${items.join('')}</ul></section>`;
}

/** The whole section, as an HTML string. */
export function renderDashboard(report) {
  const notes = [];
  if (report.unclassified.length > 0) {
    notes.push(`Not classified yet: ${plural(report.unclassified.length, 'call or deal')}. Ask your assistant to classify your older calls.`);
  }
  if (report.excluded.demo > 0) notes.push('Sample records are left out of these numbers.');
  if (report.excluded.skipped > 0) {
    notes.push(`${plural(report.excluded.skipped, 'record')} could not be read and ${report.excluded.skipped === 1 ? 'was' : 'were'} left out.`);
  }
  return `<h2 id="how-its-going">${esc("How it's going")}</h2>
${report.windows.map(windowCard).join('\n')}
${comparisonLine(report.comparison)}
${notes.map((n) => `<p class="note">${esc(n)}</p>`).join('\n')}
${journeys(report.journeys)}`;
}
