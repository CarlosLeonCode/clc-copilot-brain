// Plain-language text rendering of the sales report for people, in the report's language. Pure: no I/O, no UI imports.
import { DEFAULT_LANGUAGE, formatMonth, formatPercent, t } from './i18n.js';

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
  return [...lines, ''];
}

/** Render the whole report (from buildSalesReport) as plain, non-technical text in its language. */
export function formatSalesReport(report, lang = report.language ?? DEFAULT_LANGUAGE) {
  const out = report.windows.flatMap((w) => windowLines(w, lang));
  const c = report.comparison;
  if (c) {
    out.push(t(lang, 'compare.with', { month: formatMonth(lang, c.from, { capitalize: false }), parts: comparisonParts(c, lang).join(', ') }), '');
  } else {
    out.push(t(lang, 'compare.tooEarly'), '');
  }
  if (report.unclassified.length) out.push(t(lang, 'report.unclassified', { records: plural(report.unclassified.length, 'records', lang) }), '');
  if (report.excluded.demo) out.push(t(lang, 'report.sample', { count: report.excluded.demo }), '');
  if (report.excluded.skipped) out.push(t(lang, 'notes.skipped', { count: report.excluded.skipped }), '');
  return out.join('\n').trimEnd() + '\n';
}
