// Plain-language text rendering of the sales report for people, in the report's language. Pure: no I/O, no UI imports.
import { DEFAULT_LANGUAGE, formatMonth, formatPercent, t } from './i18n.js';
import { COUNT_KEYS } from './scorecard.js';
import { COUNT_ONLY_BELOW } from './sales-metrics.js';

/** "October 2026" / "Octubre de 2026". */
export const monthTitle = (month, lang = DEFAULT_LANGUAGE) => formatMonth(lang, month);

/** Month title, with "(so far)" while the month is still running. */
export const windowTitle = (w, lang = DEFAULT_LANGUAGE) => (w.complete ? monthTitle(w.month, lang) : t(lang, 'dash.soFar', { month: monthTitle(w.month, lang) }));

/** "3 calls", "1 time"… from a `count.<noun>` key. */
export const plural = (n, noun, lang = DEFAULT_LANGUAGE) => t(lang, `count.${noun}`, { count: n });

/** "3 of 4 calls", plus a percentage once the sample is big enough, or "too early to tell". `noun` is calls or deals. */
export function rateText(rate, noun = 'calls', lang = DEFAULT_LANGUAGE) {
  const base = t(lang, `rate.${noun}`, { count: rate.count, of: rate.of });
  if (rate.value == null) return base;
  const percent = formatPercent(lang, rate.value);
  return t(lang, rate.sample === 'too-early' ? 'rate.tooEarly' : 'rate.withPercent', { base, percent });
}

/** "+12 points" / "-3 puntos". */
export function points(n, lang = DEFAULT_LANGUAGE) {
  const rounded = Math.round(n * 100);
  return t(lang, 'compare.points', { sign: rounded >= 0 ? '+' : '-', count: Math.abs(rounded) });
}

/** The parts of the month-to-month comparison sentence. */
export function comparisonParts(c, lang = DEFAULT_LANGUAGE) {
  const parts = [t(lang, c.calls >= 0 ? 'compare.more' : 'compare.fewer', { count: Math.abs(c.calls) })];
  if (c.success != null) parts.push(t(lang, 'compare.goal', { points: points(c.success, lang) }));
  if (c.stageAdvance != null) parts.push(t(lang, 'compare.moved', { points: points(c.stageAdvance, lang) }));
  return parts;
}

const shownRate = (r) => (r.sample === 'count-only' ? { ...r, value: null } : r);

function dimensionText(d, lang) {
  if (d.count === 0) return t(lang, 'score.noneYet');
  if (d.sample === 'count-only') return t(lang, 'score.fewScored', { count: d.count });
  return t(lang, d.sample === 'too-early' ? 'score.valueEarly' : 'score.value', { value: d.average, count: d.count });
}

/**
 * Plain-language parts of a window's score section, shared by the text report and the page.
 * `fraction` (0-1) is set only when the sample is big enough for a bar.
 */
export function scorecardView(sc, lang = DEFAULT_LANGUAGE) {
  const summary = [
    sc.scored > 0 ? t(lang, 'score.scoredCalls', { count: sc.scored }) : '',
    sc.tooThin > 0 ? t(lang, 'score.tooThin', { count: sc.tooThin }) : '',
    sc.notScored > 0 ? t(lang, 'score.notScored', { count: sc.notScored }) : ''
  ].filter(Boolean);
  if (sc.scored === 0) return { summary, dimensions: [], counts: [], criteria: [] };
  const dimensions = sc.dimensions.map((d) => ({ name: t(lang, `score.dim.${d.id}`), text: dimensionText(d, lang), fraction: d.sample === 'count-only' || d.average == null ? null : d.average / 5 }));
  const counts = sc.scored < COUNT_ONLY_BELOW ? [] : Object.keys(COUNT_KEYS).filter((k) => sc.counts[k].count > 0).map((k) => {
    const value = k === 'repTalkShare' ? `${sc.counts[k].average}%` : String(sc.counts[k].average);
    return { name: t(lang, `score.count.${k}`), text: t(lang, 'score.estimated', { value }) };
  });
  const criteria = sc.criteria.map((c) => {
    const rate = shownRate(c.coverage);
    const base = rate.of === 0 ? t(lang, 'dash.notRecorded') : rateText(rate, 'calls', lang);
    const text = c.notRecorded > 0 && rate.of > 0 ? `${base}. ${t(lang, 'score.notRecordedCount', { count: c.notRecorded })}` : base;
    return { name: c.label, text, fraction: rate.value };
  });
  return { summary, dimensions, counts, criteria };
}

/** One sentence on score changes against the month before; null unless the report carries `comparison.scorecard`. */
export function scoreComparisonText(c, lang = DEFAULT_LANGUAGE) {
  if (!c?.scorecard) return null;
  const parts = c.scorecard.dimensions.filter((d) => d.delta != null).map((d) => `${t(lang, `score.dim.${d.id}`)} ${d.delta >= 0 ? '+' : '-'}${Math.abs(d.delta)}`);
  return parts.length ? t(lang, 'score.compare', { month: formatMonth(lang, c.from, { capitalize: false }), parts: parts.join(', ') }) : null;
}

/**
 * Plain-language deal verdicts, shared by the text report and the page. Reads report.deals only:
 * labels, never ids. `none` is set (and rows empty) when there is nothing to review.
 */
export function dealsView(report, lang = DEFAULT_LANGUAGE) {
  const deals = report.deals ?? [];
  const s = report.dealSummary ?? { advance: 0, notEnough: 0, close: 0 };
  if (deals.length === 0) return { summary: '', rows: [], none: t(lang, 'deal.none') };
  const rows = deals.map((d) => {
    const parts = [t(lang, `deal.verdict.${d.verdict}`)];
    let text = parts[0];
    if (d.verdict === 'close' && d.reason) text = `${text} (${t(lang, `deal.reason.${d.reason}`)})`;
    if (d.verdict === 'not-enough-information') {
      if (d.scoredCalls === 0) text = `${text}. ${t(lang, 'deal.noScored')}`;
      else if (d.missing.length) text = `${text}. ${t(lang, 'deal.missing', { list: d.missing.map((m) => m.label).join(', ') })}`;
    }
    return { name: d.company || d.dealKey, text };
  });
  return { summary: t(lang, 'deal.summary', { advance: s.advance, notEnough: s.notEnough, close: s.close }), rows, none: '' };
}

function dealLines(report, lang) {
  const v = dealsView(report, lang);
  const lines = [t(lang, 'deal.title'), '='.repeat(t(lang, 'deal.title').length), t(lang, 'deal.allMonths')];
  if (v.none) return [...lines, v.none, ''];
  return [...lines, v.summary, ...v.rows.map((r) => `  ${r.name}: ${r.text}`), ''];
}

function scoreLines(sc, lang) {
  const v = scorecardView(sc, lang);
  const lines = ['', `${t(lang, 'score.title')}: ${v.summary.join(', ')}`];
  for (const d of v.dimensions) lines.push(`  ${d.name}: ${d.text}`);
  if (v.counts.length) lines.push('', t(lang, 'score.countsTitle'), ...v.counts.map((c) => `  ${c.name}: ${c.text}`));
  if (v.criteria.length) lines.push('', t(lang, 'score.coverage'), ...v.criteria.map((c) => `  ${c.name}: ${c.text}`));
  return lines;
}

function windowLines(w, lang) {
  const title = windowTitle(w, lang);
  const lines = [title, '='.repeat(title.length)];
  if (w.totals.calls === 0) return [...lines, t(lang, 'dash.noCalls'), ''];
  lines.push(`${t(lang, 'dash.callsLogged')}: ${w.totals.calls}`);
  lines.push(`${t(lang, 'dash.goalReached')}: ${w.totals.success.of === 0 ? t(lang, 'dash.notRecorded') : rateText(w.totals.success, 'calls', lang)}`);
  if (w.totals.notRecorded > 0) lines.push(`  ${t(lang, 'report.leftOut', { count: w.totals.notRecorded })}`);
  if (w.totals.stageAdvance.of > 0) lines.push(`${t(lang, 'dash.movedNext')}: ${rateText(w.totals.stageAdvance, 'calls', lang)}`);

  lines.push('', t(lang, 'dash.byMotion'));
  for (const m of w.byMotion) {
    const parts = [plural(m.calls, 'calls', lang)];
    if (m.calls) parts.push(t(lang, 'report.goalReached', { value: rateText(m.success, 'calls', lang) }));
    if (m.won + m.lost > 0) parts.push(t(lang, 'report.dealsWon', { won: m.won, total: m.won + m.lost }));
    lines.push(`  ${m.name}: ${parts.join(', ')}`);
  }

  const guides = w.byPlay.filter((p) => p.calls > 0);
  if (guides.length) {
    lines.push('', t(lang, 'dash.byPlay'));
    for (const p of guides) {
      lines.push(`  ${p.title}: ${plural(p.calls, 'calls', lang)}, ${t(lang, 'report.goalReached', { value: rateText(p.success, 'calls', lang) })}`);
      if (!p.successDefined && p.play !== '') lines.push(`    ${t(lang, 'report.successUndefined')}`);
      for (const s of p.stallPoints) lines.push(`    ${t(lang, 'report.missed', { times: plural(s.count, 'times', lang), when: s.when })}`);
    }
  }

  lines.push('', t(lang, 'dash.byRep'));
  for (const r of w.byRep) lines.push(`  ${r.rep}: ${plural(r.calls, 'calls', lang)}, ${t(lang, 'report.goalReached', { value: rateText(r.success, 'calls', lang) })}`);
  return [...lines, ...scoreLines(w.scorecard, lang), ''];
}

/** Render the whole report (from buildSalesReport) as plain, non-technical text in its language. */
export function formatSalesReport(report, lang = report.language ?? DEFAULT_LANGUAGE) {
  const out = report.windows.flatMap((w) => windowLines(w, lang));
  out.push(...dealLines(report, lang));
  const c = report.comparison;
  if (c) {
    out.push(t(lang, 'compare.with', { month: formatMonth(lang, c.from, { capitalize: false }), parts: comparisonParts(c, lang).join(', ') }), '');
  } else {
    out.push(t(lang, 'compare.tooEarly'), '');
  }
  const scores = scoreComparisonText(c, lang);
  if (scores) out.push(scores, '');
  if (report.unclassified.length) out.push(t(lang, 'report.unclassified', { records: plural(report.unclassified.length, 'records', lang) }), '');
  if (report.excluded.demo) out.push(t(lang, 'report.sample', { count: report.excluded.demo }), '');
  if (report.excluded.skipped) out.push(t(lang, 'notes.skipped', { count: report.excluded.skipped }), '');
  return out.join('\n').trimEnd() + '\n';
}
