// Pure sales metrics: month windows, sample-size rules and motion resolution. No I/O.
import { toSlug, motionName, DEFAULT_MOTIONS } from './sales-normalize.js';
import { DEFAULT_LANGUAGE, t } from './i18n.js';

export const COUNT_ONLY_BELOW = 5;
export const TOO_EARLY_BELOW = 10;
export const UNCLASSIFIED = 'unclassified';

const pad = (n) => String(n).padStart(2, '0');

/** UTC month windows: the current month (to date) and the last complete one, as 'YYYY-MM'. */
export function monthWindows(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const last = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  return { current: `${year}-${pad(month + 1)}`, lastComplete: `${last.y}-${pad(last.m)}` };
}

/** A rate with its sample label: under 5 counts only, under 10 too early to tell, else ok. */
export function makeRate(count, of) {
  if (of < COUNT_ONLY_BELOW) return { count, of, value: null, sample: 'count-only' };
  return { count, of, value: count / of, sample: of < TOO_EARLY_BELOW ? 'too-early' : 'ok' };
}

/** Map of deal key to the motion of that deal's earliest tagged record (calls and win-loss). */
export function buildDealIndex(calls = [], wins = []) {
  const earliest = new Map();
  for (const r of [...calls, ...wins]) {
    const motion = toSlug(r.motion);
    if (!r.dealKey || !motion) continue;
    const seen = earliest.get(r.dealKey);
    if (!seen || String(r.date) < seen.date) earliest.set(r.dealKey, { date: String(r.date), motion });
  }
  return new Map([...earliest].map(([key, { motion }]) => [key, motion]));
}

/** Motion slug for a record: own tag, then its deal's earliest tag, then the play's only motion, else 'unclassified'. */
export function resolveMotion(record, dealIndex, playsById) {
  const own = toSlug(record.motion);
  if (own) return own;
  const fromDeal = record.dealKey ? dealIndex?.get(record.dealKey) : undefined;
  if (fromDeal) return fromDeal;
  const play = record.play ? playsById?.get(record.play) : undefined;
  if (Array.isArray(play?.motions) && play.motions.length === 1) return play.motions[0];
  return UNCLASSIFIED;
}

// ---- computed metrics (pure) ----
const OUTCOMES = ['closed-won', 'closed-lost', 'disqualified', 'stalled', 'advanced', 'unclassified'];

/** Rate of `true` over decided (true+false) values of `key`; undefined values are left out. */
function rateOf(items, key) {
  const decided = items.filter((c) => typeof c[key] === 'boolean');
  return makeRate(decided.filter((c) => c[key]).length, decided.length);
}

function group(items, keyOf) {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function stallPoints(calls, play, lang) {
  const whenOf = (branch) => {
    if (!branch) return t(lang, 'metrics.noBranch');
    return play?.branches?.find((b) => b.id === branch)?.when || t(lang, 'metrics.unknownBranch');
  };
  const counts = new Map();
  for (const c of calls.filter((x) => x.goalMet === false)) {
    const key = whenOf(c.branch);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([when, count]) => ({ branch: when, when, count })).sort((a, b) => b.count - a.count);
}

const motionLabel = (slug, lang) => (slug === UNCLASSIFIED ? t(lang, 'metrics.unclassified') : motionName(slug, lang));
const motionRank = (slug) => {
  const defaults = Object.keys(DEFAULT_MOTIONS);
  if (slug === UNCLASSIFIED) return defaults.length + 1;
  const i = defaults.indexOf(slug);
  return i === -1 ? defaults.length : i;
};

/** Metrics for one 'YYYY-MM' month. `records` is the readSalesRecords result; labels are in `lang`. */
export function computeSalesMetrics(records, { month, complete = false, lang = DEFAULT_LANGUAGE } = {}) {
  const { calls = [], wins = [], plays = [] } = records;
  const playsById = new Map(plays.map((p) => [p.id, p]));
  const dealIndex = buildDealIndex(calls, wins);
  const inMonth = calls.filter((c) => c.month === month);
  const motionOf = (r) => resolveMotion(r, dealIndex, playsById);
  const decided = new Set(wins.map((w) => w.dealKey).filter(Boolean));
  const winsInMonth = wins.filter((w) => String(w.date).slice(0, 7) === month);

  const outcomes = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  for (const c of inMonth) outcomes[Object.hasOwn(outcomes, c.outcome) ? c.outcome : 'unclassified'] += 1;

  const motionSlugs = new Set([...inMonth.map(motionOf), ...winsInMonth.map(motionOf)]);
  const byMotion = [...motionSlugs].sort((a, b) => motionRank(a) - motionRank(b) || a.localeCompare(b)).map((motion) => {
    const mine = inMonth.filter((c) => motionOf(c) === motion);
    const results = winsInMonth.filter((w) => motionOf(w) === motion);
    const won = results.filter((w) => w.result === 'won').length;
    const lost = results.filter((w) => w.result === 'lost').length;
    const open = new Set(mine.map((c) => c.dealKey).filter((k) => k && !decided.has(k))).size;
    return { motion, name: motionLabel(motion, lang), calls: mine.length, success: rateOf(mine, 'goalMet'), stageAdvance: rateOf(mine, 'gateAdvanced'), won, lost, open, winRate: makeRate(won, won + lost) };
  });

  const playIds = [...new Set([...plays.map((p) => p.id), ...inMonth.map((c) => c.play || '')])];
  const byPlay = playIds.map((id) => {
    const meta = playsById.get(id);
    const mine = inMonth.filter((c) => (c.play || '') === id);
    return {
      play: id,
      title: id === '' ? t(lang, 'metrics.noPlay') : meta?.title ?? id,
      successText: meta?.success ?? '',
      successDefined: meta?.successDefined ?? false,
      calls: mine.length,
      success: rateOf(mine, 'goalMet'),
      stageAdvance: rateOf(mine, 'gateAdvanced'),
      stallPoints: stallPoints(mine, meta, lang)
    };
  }).filter((p) => p.play !== '' || p.calls > 0);

  const byRep = [...group(inMonth, (c) => (c.rep ?? '').trim().toLowerCase())].map(([key, mine]) => ({
    rep: key === '' ? t(lang, 'metrics.noRep') : mine[0].rep.trim(), calls: mine.length, success: rateOf(mine, 'goalMet'), stageAdvance: rateOf(mine, 'gateAdvanced')
  }));

  return {
    month,
    complete,
    totals: { calls: inMonth.length, success: rateOf(inMonth, 'goalMet'), notRecorded: inMonth.filter((c) => typeof c.goalMet !== 'boolean').length, stageAdvance: rateOf(inMonth, 'gateAdvanced') },
    outcomes,
    byMotion,
    byPlay,
    byRep
  };
}

const previousMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
};

const delta = (a, b) => (a.value == null || b.value == null ? null : b.value - a.value);

function compare(from, to) {
  if (from.totals.calls < TOO_EARLY_BELOW || to.totals.calls < TOO_EARLY_BELOW) return null;
  return {
    from: from.month,
    to: to.month,
    calls: to.totals.calls - from.totals.calls,
    success: delta(from.totals.success, to.totals.success),
    stageAdvance: delta(from.totals.stageAdvance, to.totals.stageAdvance)
  };
}

function journeysOf(records, motionSlugs, lang) {
  const { plays = [], stageNames = new Map() } = records;
  return [...motionSlugs].sort((a, b) => motionRank(a) - motionRank(b) || a.localeCompare(b)).map((motion) => {
    const tagged = plays
      .filter((p) => p.motions === 'all' || (Array.isArray(p.motions) && p.motions.includes(motion)))
      .sort((a, b) => (a.firstStage ?? Infinity) - (b.firstStage ?? Infinity));
    const entry = tagged.find((p) => p.firstStage != null)?.firstStage ?? null;
    return {
      motion,
      name: motionName(motion, lang),
      plays: tagged.map((p) => ({ play: p.id, title: p.title })),
      entryStage: entry,
      entryName: entry == null ? null : stageNames.get(String(entry)) ?? t(lang, 'metrics.step', { number: entry })
    };
  });
}

/**
 * Full report. Default windows: current month so far and the last complete month.
 * With `month`: that month, compared with the one before it. Labels are in `lang`, which the report carries.
 */
export function buildSalesReport(records, { now = new Date(), month, lang = DEFAULT_LANGUAGE } = {}) {
  const { current, lastComplete } = monthWindows(now);
  const isComplete = (m) => m < current;
  let windows;
  let comparison;
  if (month) {
    const shown = computeSalesMetrics(records, { month, complete: isComplete(month), lang });
    windows = [shown];
    comparison = compare(computeSalesMetrics(records, { month: previousMonth(month), complete: true, lang }), shown);
  } else {
    windows = [computeSalesMetrics(records, { month: current, complete: false, lang }), computeSalesMetrics(records, { month: lastComplete, complete: true, lang })];
    comparison = compare(windows[1], windows[0]);
  }

  const { calls = [], wins = [], plays = [] } = records;
  const playsById = new Map(plays.map((p) => [p.id, p]));
  const dealIndex = buildDealIndex(calls, wins);
  const resolved = [...calls, ...wins].map((r) => ({ r, motion: resolveMotion(r, dealIndex, playsById) }));
  const motionSlugs = new Set([...Object.keys(DEFAULT_MOTIONS), ...plays.flatMap((p) => (Array.isArray(p.motions) ? p.motions : [])), ...resolved.map((x) => x.motion).filter((m) => m !== UNCLASSIFIED)]);

  return {
    language: lang,
    windows,
    comparison,
    journeys: journeysOf(records, motionSlugs, lang),
    unclassified: resolved.filter((x) => x.motion === UNCLASSIFIED).map((x) => x.r.relPath),
    excluded: { demo: records.demoExcluded ?? 0, skipped: (records.skipped ?? []).length }
  };
}
