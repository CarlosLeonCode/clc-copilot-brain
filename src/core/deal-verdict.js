// Deal verdicts: advance, close or not enough information. Pure: no fs access, computed over ALL calls.
// Code decides the verdict; skills and pages only read it.
import { resolveCriteria, criterionLabel } from './scorecard.js';

export const VERDICTS = Object.freeze(['advance', 'close', 'not-enough-information']);
export const CLOSE_REASONS = Object.freeze(['outcome', 'flag', 'lost-record']);

const CLOSING_OUTCOMES = new Set(['disqualified', 'closed-lost']);
// List order: advance, not-enough-information, close.
const RANK = Object.freeze({ advance: 0, 'not-enough-information': 1, close: 2 });

// Plain comparison on purpose: deterministic, never locale dependent.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byDateThenPath = (a, b) => cmp(a.date, b.date) || cmp(a.relPath, b.relPath);

/**
 * @param {{ calls?: object[], wins?: object[], criteria?: object }} input
 * @returns {{ deals: object[], summary: object }}
 */
export function computeDealVerdicts({ calls = [], wins = [], criteria } = {}) {
  const resolved = criteria ?? resolveCriteria(null);
  const label = (id) => ({ id, label: criterionLabel(id, resolved.labels) });
  const requires = resolved.advanceRequires.map(label);

  const groups = new Map();
  let noDeal = 0;
  for (const c of calls) {
    if (!c.dealKey) {
      noDeal += 1;
      continue;
    }
    if (!groups.has(c.dealKey)) groups.set(c.dealKey, []);
    groups.get(c.dealKey).push(c);
  }
  const results = new Map();
  for (const w of wins) {
    if (!w.dealKey) continue;
    if (!results.has(w.dealKey)) results.set(w.dealKey, new Set());
    results.get(w.dealKey).add(w.result);
  }

  const deals = [];
  let excludedWon = 0;
  for (const [key, group] of groups) {
    const ordered = [...group].sort(byDateThenPath);
    const last = ordered[ordered.length - 1];
    const record = results.get(key) ?? new Set();
    if (last.outcome === 'closed-won' || record.has('won')) {
      excludedWon += 1;
      continue;
    }
    const scored = ordered.filter((c) => c.scorecard?.status === 'scored');
    const has = (id) => scored.some((c) => c.scorecard.qualification?.[id] === 'evidenced');
    const evidenced = resolved.ids.filter(has).map(label);
    const missing = requires.filter((r) => !has(r.id));

    let reason = null;
    if (CLOSING_OUTCOMES.has(last.outcome)) reason = 'outcome';
    else if (ordered.some((c) => c.disqualify === true)) reason = 'flag';
    else if (record.has('lost')) reason = 'lost-record';
    const verdict = reason ? 'close' : missing.length === 0 ? 'advance' : 'not-enough-information';

    deals.push({
      dealKey: key, company: last.company, rep: last.rep, calls: ordered.length, scoredCalls: scored.length,
      lastDate: last.date, lastOutcome: last.outcome, verdict, reason, evidenced, missing
    });
  }

  deals.sort((a, b) => RANK[a.verdict] - RANK[b.verdict] || cmp(b.lastDate, a.lastDate) || cmp(a.dealKey, b.dealKey));
  const count = (v) => deals.filter((d) => d.verdict === v).length;
  return {
    deals,
    summary: {
      advance: count('advance'), close: count('close'), notEnough: count('not-enough-information'),
      excludedWon, noDeal, requires, requiresSource: resolved.advanceSource
    }
  };
}
