// Plain-language text rendering of the sales report for people. Pure: no I/O, no UI imports.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthTitle = (month) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 of 4 calls", plus a percentage once the sample is big enough, or "too early to tell". */
export function rateText(rate, noun = 'calls') {
  const base = `${rate.count} of ${rate.of} ${noun}`;
  if (rate.value == null) return base;
  const pct = `${Math.round(rate.value * 100)}%`;
  return rate.sample === 'too-early' ? `${base} (${pct}, too early to tell)` : `${base} (${pct})`;
}

function windowLines(w) {
  const title = `${monthTitle(w.month)}${w.complete ? '' : ' (so far)'}`;
  const lines = [title, '='.repeat(title.length)];
  if (w.totals.calls === 0) return [...lines, 'No calls logged yet.', ''];
  lines.push(`Calls logged: ${w.totals.calls}`);
  lines.push(`Goal reached: ${w.totals.success.of === 0 ? 'not recorded yet' : rateText(w.totals.success)}`);
  if (w.totals.notRecorded > 0) lines.push(`  (${plural(w.totals.notRecorded, 'call')} without a goal result are left out)`);
  if (w.totals.stageAdvance.of > 0) lines.push(`Moved to the next step: ${rateText(w.totals.stageAdvance)}`);

  lines.push('', 'By type of sale');
  for (const m of w.byMotion) {
    const won = m.won + m.lost > 0 ? `, deals won ${m.won} of ${m.won + m.lost}` : '';
    lines.push(`  ${m.name}: ${plural(m.calls, 'call')}${m.calls ? `, goal reached ${rateText(m.success)}` : ''}${won}`);
  }

  const guides = w.byPlay.filter((p) => p.calls > 0);
  if (guides.length) {
    lines.push('', 'By call guide');
    for (const p of guides) {
      lines.push(`  ${p.title}: ${plural(p.calls, 'call')}, goal reached ${rateText(p.success)}`);
      if (!p.successDefined && p.title !== 'Not tied to a call guide') lines.push('    (success is not defined for this guide yet)');
      for (const s of p.stallPoints) lines.push(`    Goal missed ${plural(s.count, 'time')} when: ${s.when}`);
    }
  }

  lines.push('', 'By person');
  for (const r of w.byRep) lines.push(`  ${r.rep}: ${plural(r.calls, 'call')}, goal reached ${rateText(r.success)}`);
  return [...lines, ''];
}

const pts = (n) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)} points`;

/** Render the whole report (from buildSalesReport) as plain, non-technical text. */
export function formatSalesReport(report) {
  const out = report.windows.flatMap(windowLines);
  const c = report.comparison;
  if (c) {
    const parts = [`${plural(Math.abs(c.calls), 'call')} ${c.calls >= 0 ? 'more' : 'fewer'}`];
    if (c.success != null) parts.push(`goal reached ${pts(c.success)}`);
    if (c.stageAdvance != null) parts.push(`moved to the next step ${pts(c.stageAdvance)}`);
    out.push(`Compared with ${monthTitle(c.from)}: ${parts.join(', ')}.`, '');
  } else {
    out.push('Comparison with the month before: too early to tell (it needs at least 10 calls in both months).', '');
  }
  if (report.unclassified.length) out.push(`Not classified yet: ${plural(report.unclassified.length, 'record')}. Ask your assistant to classify your older calls and deals by type of sale.`, '');
  if (report.excluded.demo) out.push(`Sample records are left out of these numbers (${report.excluded.demo}).`, '');
  if (report.excluded.skipped) out.push(`${plural(report.excluded.skipped, 'record')} could not be read and ${report.excluded.skipped === 1 ? 'was' : 'were'} left out.`, '');
  return out.join('\n').trimEnd() + '\n';
}
