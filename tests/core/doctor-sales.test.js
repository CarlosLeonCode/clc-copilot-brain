import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runDoctor } from '../../src/core/doctor.js';
import { initBrain } from '../../src/core/scaffold.js';
import { withTmp, writeFiles } from './helpers.js';

const warnings = (dir) => runDoctor(dir).issues.filter((i) => i.level === 'warning').map((i) => i.message);
const callLog = (extra) => ['---', 'rep: Ana', 'prospect: Globex', 'date: 2026-10-04', 'stage: 1', 'outcome: advanced', ...extra, '---', ''].join('\n');

test('a fresh scaffold has no errors and no warnings, with or without sample data', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], demo: true });
    const result = runDoctor(dir);
    assert.equal(result.errors, 0);
    assert.equal(result.warnings, 0);
  }));

test('one grouped warning lists the call guides with no success definition', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    for (const f of ['cold-call', 'demo-call']) {
      const file = path.join(dir, 'sales', 'plays', `${f}.md`);
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^success:.*\n/m, ''));
    }
    const found = warnings(dir).filter((m) => /success/i.test(m));
    assert.equal(found.length, 1, 'grouped in one message');
    assert.match(found[0], /Cold Call/);
    assert.match(found[0], /Demo Call/);
    assert.match(found[0], /ask your assistant/i);
    assert.equal(runDoctor(dir).errors, 0, 'warnings, never errors');
  }));

test('records with a type of sale nobody lists are grouped in one warning; custom types declared in a guide are fine', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const file = path.join(dir, 'sales', 'plays', 'demo-call.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^motions:.*$/m, 'motions: partner').replace(/^---\n([\s\S]*?)\n---/, (m, b) => (/^motions:/m.test(b) ? m : `---\n${b}\nmotions: partner\n---`)));
    writeFiles(dir, {
      'sales/calls/2026-10/a.md': callLog(['motion: partner']),
      'sales/calls/2026-10/b.md': callLog(['motion: inbound']),
      'sales/calls/2026-10/c.md': callLog(['motion: webinar']),
      'sales/win-loss/2026-10-02_acme_won.md': ['---', 'motion: street-team', '---', ''].join('\n')
    });
    const found = warnings(dir).filter((m) => /type of sale/i.test(m));
    assert.equal(found.length, 1);
    assert.match(found[0], /webinar/);
    assert.match(found[0], /street-team/);
    assert.doesNotMatch(found[0], /partner|inbound/);
  }));

test('unreadable records are reported in one plain warning', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, { 'sales/calls/2026-10/broken.md': 'no frontmatter here', 'sales/calls/2026-10/ok.md': callLog([]) });
    const found = warnings(dir).filter((m) => /could not be read/i.test(m));
    assert.equal(found.length, 1);
    assert.match(found[0], /sales\/calls\/2026-10\/broken\.md/);
    assert.doesNotMatch(found[0], /ok\.md/);
    assert.equal(runDoctor(dir).errors, 0);
  }));

test('doctor skips the sales metric checks when sales is not active', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['operations'] });
    assert.deepEqual(runDoctor(dir).issues, []);
  }));

test('call logs with unusable scores or qualification notes get one warning naming each log', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, {
      'sales/calls/2026-10/bad-score.md': callLog(['scorecard_status: scored', 'score_discovery: 9', 'score_charm: 4']),
      'sales/calls/2026-10/bad-qual.md': callLog(['scorecard_status: too-thin', 'qual_champion: partial', 'qual_budget: evidenced']),
      'sales/calls/2026-10/no-status.md': callLog(['score_listening: 3']),
      'sales/calls/2026-10/good.md': callLog(['scorecard_status: scored', 'score_discovery: not-enough-evidence', 'qual_champion: evidenced'])
    });
    const found = warnings(dir).filter((m) => /scores or qualification notes/i.test(m));
    assert.equal(found.length, 1, 'grouped in one message');
    for (const fragment of ['bad-score.md', 'score_discovery "9"', 'score_charm', 'bad-qual.md', 'qual_champion "partial"', 'qual_budget', 'no-status.md', 'missing scorecard_status']) {
      assert.ok(found[0].includes(fragment), `mentions ${fragment}`);
    }
    assert.doesNotMatch(found[0], /good\.md/);
    assert.equal(runDoctor(dir).errors, 0, 'warnings, never errors');
  }));

test('qualification notes are checked against the criteria the matrix declares', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const matrix = path.join(dir, 'sales', 'qualification', 'qualification-matrix.md');
    fs.writeFileSync(matrix, fs.readFileSync(matrix, 'utf8').replace(/^criteria:.*$/m, 'criteria: budget, need'));
    writeFiles(dir, { 'sales/calls/2026-10/a.md': callLog(['scorecard_status: scored', 'qual_budget: evidenced', 'qual_champion: missing']) });
    const found = warnings(dir).filter((m) => /scores or qualification notes/i.test(m));
    assert.equal(found.length, 1);
    assert.match(found[0], /qual_champion/);
    assert.doesNotMatch(found[0], /qual_budget/);
  }));
