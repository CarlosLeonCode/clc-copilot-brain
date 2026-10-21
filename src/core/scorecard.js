// Call scorecard and qualification evidence. Pure: no fs access (the loader reads the matrix).
// Dimensions are fixed; qualification criteria come only from the matrix frontmatter (fallback below).

export const DIMENSIONS = Object.freeze(['talk_ratio', 'discovery', 'listening', 'objection_handling', 'value_framing', 'next_step']);
export const NOT_ENOUGH = 'not-enough-evidence';
export const STATUSES = Object.freeze(['scored', 'too-thin']);
export const QUAL_VALUES = Object.freeze(['evidenced', 'missing']);
export const COUNT_KEYS = Object.freeze({
  repTalkShare: 'rep_talk_share',
  questionsAsked: 'questions_asked',
  followUpQuestions: 'follow_up_questions',
  longestMonologueSeconds: 'longest_monologue_seconds'
});
// Used only when the matrix declares no `criteria` list.
export const FALLBACK_CRITERIA = Object.freeze([
  'metrics', 'economic_buyer', 'decision_criteria', 'decision_process', 'paper_process', 'identified_pain', 'champion', 'competition'
]);

const SCORE = /^[1-5]$/;
const COUNT = /^\d+$/;

/** Comma list -> normalized unique ids in order, or null when nothing usable. */
export function parseCriteria(value) {
  if (typeof value !== 'string') return null;
  const ids = [];
  for (const part of value.split(',')) {
    const id = part.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (/^[a-z0-9_]+$/.test(id) && !ids.includes(id)) ids.push(id);
  }
  return ids.length ? ids : null;
}

/** @returns {{ ids: string[], labels: Record<string,string>, source: 'matrix'|'fallback' }} */
export function resolveCriteria(frontmatter) {
  const fields = frontmatter ?? {};
  const parsed = parseCriteria(fields.criteria);
  const ids = parsed ?? [...FALLBACK_CRITERIA];
  const labels = {};
  for (const id of ids) {
    const label = String(fields[`label_${id}`] ?? '').trim();
    if (label) labels[id] = label;
  }
  return { ids, labels, source: parsed ? 'matrix' : 'fallback' };
}

export function criterionLabel(id, labels = {}) {
  return labels[id] || String(id).split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/** @returns {null | { status, statusImplied, scores, counts, qualification, problems }} null when the call is unscored. */
export function readScorecard(fields) {
  const fm = fields ?? {};
  const scoreKeys = Object.keys(fm).filter((k) => k.startsWith('score_'));
  if (fm.scorecard_status === undefined && scoreKeys.length === 0) return null;

  const problems = [];
  const hasStatus = fm.scorecard_status !== undefined;
  if (hasStatus && !STATUSES.includes(fm.scorecard_status)) problems.push(`invalid scorecard_status "${fm.scorecard_status}"`);
  else if (!hasStatus) problems.push('missing scorecard_status');

  const scores = {};
  for (const key of scoreKeys) {
    const id = key.slice('score_'.length);
    const value = fm[key];
    if (!DIMENSIONS.includes(id)) problems.push(`unknown score key ${key}`);
    else if (value === NOT_ENOUGH) scores[id] = NOT_ENOUGH;
    else if (SCORE.test(value)) scores[id] = Number(value);
    else problems.push(`invalid ${key} "${value}"`);
  }

  const counts = {};
  for (const [name, key] of Object.entries(COUNT_KEYS)) {
    if (fm[key] === undefined) continue;
    const n = COUNT.test(fm[key]) ? Number(fm[key]) : NaN;
    if (Number.isNaN(n) || (name === 'repTalkShare' && n > 100)) problems.push(`invalid ${key} "${fm[key]}"`);
    else counts[name] = n;
  }

  const qualification = {};
  for (const key of Object.keys(fm).filter((k) => k.startsWith('qual_'))) {
    if (QUAL_VALUES.includes(fm[key])) qualification[key.slice('qual_'.length)] = fm[key];
    else problems.push(`invalid ${key} "${fm[key]}"`);
  }

  return {
    status: STATUSES.includes(fm.scorecard_status) ? fm.scorecard_status : 'scored',
    statusImplied: !hasStatus,
    scores,
    counts,
    qualification,
    problems
  };
}

/** Parse problems of a scorecard plus qual_ ids outside the resolved criteria. [] when unscored. */
export function scorecardProblems(card, criteriaIds) {
  if (!card) return [];
  const unknown = Object.keys(card.qualification).filter((id) => !criteriaIds.includes(id));
  return [...card.problems, ...unknown.map((id) => `unknown qualification key qual_${id}`)];
}
