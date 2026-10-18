// Shared sales normalizers: one slug, company, deal and outcome rule for calls, records, metrics and doctor.
// Pure: no I/O, never throws on odd input.

export const DEFAULT_MOTIONS = Object.freeze({
  'cold-outbound': 'Cold outreach',
  inbound: 'Inbound',
  referral: 'Referral',
  expansion: 'Existing customers'
});

// Trailing legal suffixes dropped when comparing company names.
const LEGAL_SUFFIXES = new Set(['inc', 'llc', 'ltd', 'corp', 'co', 'sa', 'sas', 'gmbh', 'srl', 'plc']);

// Ordered keyword rules: the first match wins.
const OUTCOME_RULES = Object.freeze([
  ['closed-won', /closed[\s-]*won|\bwon\b/],
  ['closed-lost', /closed[\s-]*lost|\blost\b/],
  ['disqualified', /disqualif/],
  ['stalled', /stall/],
  ['advanced', /advanc/]
]);

const text = (value) => (typeof value === 'string' ? value : value == null ? '' : String(value));

/** Lowercase, non-alphanumeric runs become one `-`, trimmed. Empty string when nothing is left. */
export function toSlug(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Lowercase company name without punctuation or trailing legal suffixes ("Acme, Inc." -> "acme"). */
export function normalizeCompany(name) {
  const words = text(name)
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/** A deal is its `deal_id` when present, else the normalized company name. */
export function dealKey({ dealId, company } = {}) {
  return toSlug(dealId) || normalizeCompany(company);
}

/** Free-text outcome to one of: closed-won, closed-lost, disqualified, stalled, advanced, unclassified. */
export function normalizeOutcome(value) {
  const lower = text(value).toLowerCase();
  for (const [outcome, pattern] of OUTCOME_RULES) if (pattern.test(lower)) return outcome;
  return 'unclassified';
}

/** Booleans and case-insensitive "true"/"false" only; anything else is undefined. */
export function parseBool(value) {
  if (typeof value === 'boolean') return value;
  const lower = text(value).trim().toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return undefined;
}

/** Friendly motion name: the default name, else the slug title-cased. */
export function motionName(slug) {
  if (Object.hasOwn(DEFAULT_MOTIONS, slug)) return DEFAULT_MOTIONS[slug];
  return text(slug).split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
