// Pure sales metrics: month windows, sample-size rules and motion resolution. No I/O.
import { toSlug } from './sales-normalize.js';

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
