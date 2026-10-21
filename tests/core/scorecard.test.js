import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withTmp, writeFiles } from './helpers.js';
import { parseFrontmatter } from '../../src/core/plays.js';
import { readCallLog } from '../../src/core/calls.js';
import { readSalesRecords } from '../../src/core/sales-records.js';
import {
  DIMENSIONS, NOT_ENOUGH, FALLBACK_CRITERIA, COUNT_KEYS, parseCriteria, resolveCriteria, criterionLabel, readScorecard, scorecardProblems
} from '../../src/core/scorecard.js';

const fm = (text) => parseFrontmatter(`---\n${text}\n---\n`);
const MATRIX = new URL('../../templates/areas/sales/qualification/qualification-matrix.md', import.meta.url);

test('DIMENSIONS and COUNT_KEYS are the pinned constants', () => {
  assert.deepEqual(DIMENSIONS, ['talk_ratio', 'discovery', 'listening', 'objection_handling', 'value_framing', 'next_step']);
  assert.equal(NOT_ENOUGH, 'not-enough-evidence');
  assert.deepEqual(Object.values(COUNT_KEYS), ['rep_talk_share', 'questions_asked', 'follow_up_questions', 'longest_monologue_seconds']);
});

test('scores: 1-5 and not-enough-evidence are valid; 0, 7, 3.5 and abc are problems', () => {
  const card = readScorecard(fm('scorecard_status: scored\nscore_discovery: 4\nscore_listening: not-enough-evidence\nscore_next_step: 0\nscore_talk_ratio: 7\nscore_value_framing: 3.5\nscore_objection_handling: abc'));
  assert.deepEqual(card.scores, { discovery: 4, listening: NOT_ENOUGH });
  assert.equal(card.problems.length, 4);
  assert.match(card.problems.join('\n'), /score_next_step/);
  assert.equal(readScorecard(fm('scorecard_status: scored\nscore_discovery: 5')).scores.discovery, 5);
});

test('status: too-thin is kept, a bad value is a problem, missing status is implied', () => {
  assert.equal(readScorecard(fm('scorecard_status: too-thin\nscore_discovery: 5')).status, 'too-thin');
  const bad = readScorecard(fm('scorecard_status: great\nscore_discovery: 2'));
  assert.match(bad.problems.join('\n'), /scorecard_status/);
  const implied = readScorecard(fm('score_discovery: 3'));
  assert.equal(implied.status, 'scored');
  assert.equal(implied.statusImplied, true);
  assert.match(implied.problems.join('\n'), /missing scorecard_status/);
  assert.equal(readScorecard(fm('scorecard_status: scored\nscore_discovery: 3')).statusImplied, false);
});

test('unknown score_ ids are problems and never stored', () => {
  const card = readScorecard(fm('scorecard_status: scored\nscore_charisma: 4'));
  assert.deepEqual(card.scores, {});
  assert.match(card.problems.join('\n'), /score_charisma/);
});

test('estimated counts: valid kept, invalid ignored with a problem', () => {
  const card = readScorecard(fm('scorecard_status: scored\nrep_talk_share: 62\nquestions_asked: 14\nfollow_up_questions: -2\nlongest_monologue_seconds: long'));
  assert.deepEqual(card.counts, { repTalkShare: 62, questionsAsked: 14 });
  assert.equal(card.problems.length, 2);
  assert.deepEqual(readScorecard(fm('scorecard_status: scored\nrep_talk_share: 140')).counts, {});
});

test('qual_ values: evidenced and missing only; partial is a problem', () => {
  const card = readScorecard(fm('scorecard_status: scored\nqual_budget: evidenced\nqual_need: missing\nqual_timeline: partial'));
  assert.deepEqual(card.qualification, { budget: 'evidenced', need: 'missing' });
  assert.match(card.problems.join('\n'), /qual_timeline/);
});

test('legacy and qualification-only calls are unscored (null)', () => {
  assert.equal(readScorecard(fm('rep: Ana\ndate: 2026-09-10')), null);
  assert.equal(readScorecard(fm('qual_budget: evidenced')), null);
  assert.equal(readScorecard(null), null);
  assert.equal(readCallLog('---\nrep: "Ana"\ndate: "2026-09-10"\n---\n').scorecard, null);
});

test('readCallLog attaches the scorecard', () => {
  const log = readCallLog('---\nrep: "Ana"\ndate: "2026-09-10"\nscorecard_status: scored\nscore_discovery: 4\n---\n');
  assert.equal(log.scorecard.scores.discovery, 4);
});

test('FALLBACK_CRITERIA is the pinned MEDDPICC list', () => {
  assert.deepEqual(FALLBACK_CRITERIA, ['metrics', 'economic_buyer', 'decision_criteria', 'decision_process', 'paper_process', 'identified_pain', 'champion', 'competition']);
});

test('parseCriteria normalizes, dedupes and keeps order; empty is null', () => {
  assert.deepEqual(parseCriteria('Budget, authority, need, Timeline'), ['budget', 'authority', 'need', 'timeline']);
  assert.deepEqual(parseCriteria('economic-buyer, Economic Buyer, champion'), ['economic_buyer', 'champion']);
  assert.equal(parseCriteria(''), null);
  assert.equal(parseCriteria(undefined), null);
  assert.equal(parseCriteria(' , '), null);
});

test('resolveCriteria: matrix list overrides the fallback, no code change for a framework swap', () => {
  const bant = resolveCriteria(fm('criteria: budget, authority, need, timeline'));
  assert.deepEqual(bant.ids, ['budget', 'authority', 'need', 'timeline']);
  assert.equal(bant.source, 'matrix');
  const none = resolveCriteria(fm('criteria:'));
  assert.deepEqual(none.ids, FALLBACK_CRITERIA);
  assert.equal(none.source, 'fallback');
  assert.deepEqual(resolveCriteria(null).ids, FALLBACK_CRITERIA);
});

test('labels: declared label wins, else title-cased id, malformed label falls back', () => {
  const r = resolveCriteria(fm('criteria: economic_buyer, need, budget\nlabel_need: "The real problem"\nlabel_budget:\nlabel_other: "Ignored"'));
  assert.equal(criterionLabel('need', r.labels), 'The real problem');
  assert.equal(criterionLabel('economic_buyer', r.labels), 'Economic Buyer');
  assert.equal(criterionLabel('budget', r.labels), 'Budget');
  assert.equal(r.labels.other, undefined);
});

test('shipped matrix declares exactly the fallback criteria', () => {
  const r = resolveCriteria(parseFrontmatter(fs.readFileSync(MATRIX, 'utf8')));
  assert.equal(r.source, 'matrix');
  assert.deepEqual(r.ids, FALLBACK_CRITERIA);
  for (const id of r.ids) assert.ok(r.labels[id], `label for ${id}`);
});

test('readSalesRecords exposes criteria from the brain matrix, fallback when missing', () => withTmp((dir) => {
  assert.equal(readSalesRecords(dir).criteria.source, 'fallback');
  writeFiles(dir, { 'sales/qualification/qualification-matrix.md': '---\ncriteria: situation, problem\n---\n# M\n' });
  const { criteria } = readSalesRecords(dir);
  assert.deepEqual(criteria.ids, ['situation', 'problem']);
  assert.equal(criteria.source, 'matrix');
}));

test('readSalesRecords attaches scorecard to call records', () => withTmp((dir) => {
  writeFiles(dir, {
    'sales/calls/2026-09/a.md': '---\nrep: "Ana"\ndate: "2026-09-10"\nscorecard_status: scored\nscore_discovery: 4\n---\n',
    'sales/calls/2026-09/b.md': '---\nrep: "Ana"\ndate: "2026-09-11"\n---\n'
  });
  const { calls } = readSalesRecords(dir);
  assert.equal(calls[0].scorecard.scores.discovery, 4);
  assert.equal(calls[1].scorecard, null);
}));

test('scorecardProblems: parse problems plus qual_ ids outside the criteria', () => {
  const card = readScorecard(fm('scorecard_status: scored\nscore_discovery: 9\nqual_champion: evidenced\nqual_budget: missing'));
  const problems = scorecardProblems(card, FALLBACK_CRITERIA).join('\n');
  assert.match(problems, /score_discovery "9"/);
  assert.match(problems, /unknown qualification key qual_budget/);
  assert.doesNotMatch(problems, /qual_champion/);
  assert.deepEqual(scorecardProblems(null, FALLBACK_CRITERIA), []);
  assert.deepEqual(scorecardProblems(readScorecard(fm('scorecard_status: scored\nqual_champion: missing')), FALLBACK_CRITERIA), []);
});
