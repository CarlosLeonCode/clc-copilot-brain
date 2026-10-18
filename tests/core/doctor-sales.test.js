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
