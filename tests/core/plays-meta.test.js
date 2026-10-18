import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseMotions, readPlayMeta } from '../../src/core/plays.js';

const SALES = path.join(import.meta.dirname, '..', '..', 'templates', 'areas', 'sales');
const PLAYS = path.join(SALES, 'plays');
const metas = () => fs.readdirSync(PLAYS).filter((f) => f.endsWith('.md')).sort()
  .map((f) => readPlayMeta(f, fs.readFileSync(path.join(PLAYS, f), 'utf8')));

test('parseMotions: missing, all and lists', () => {
  assert.equal(parseMotions(undefined), 'all');
  assert.equal(parseMotions(''), 'all');
  assert.equal(parseMotions('all'), 'all');
  assert.deepEqual(parseMotions('inbound, Cold Outbound'), ['inbound', 'cold-outbound']);
});

test('starter plays: exactly 4, each with success; only cold-call is cold-outbound', () => {
  const all = metas();
  assert.deepEqual(all.map((m) => m.id), ['cold-call', 'demo-call', 'discovery-call', 'follow-up']);
  for (const m of all) {
    assert.ok(m.success.length > 0, `${m.id} needs success`);
    assert.equal(m.successDefined, true);
  }
  const byId = Object.fromEntries(all.map((m) => [m.id, m]));
  assert.deepEqual(byId['cold-call'].motions, ['cold-outbound']);
  for (const id of ['demo-call', 'discovery-call', 'follow-up']) assert.equal(byId[id].motions, 'all');
  assert.equal(byId['cold-call'].success, 'Meeting booked');
});

test('readPlayMeta: missing motions means all; legacy play falls back to goal text', () => {
  const legacy = '---\nplay: old\nstages: 2, 3\ngoal: Win the room\ngate_unlocked: g\nversion: 1\nstatus: active\n---\n# Play: Old Play\n';
  const m = readPlayMeta('old.md', legacy);
  assert.equal(m.motions, 'all');
  assert.equal(m.successDefined, false);
  assert.equal(m.success, 'Win the room');
  assert.equal(m.firstStage, 2);
  assert.equal(m.title, 'Old Play');
});

test('readPlayMeta reads branch ids with their trigger text', () => {
  const cold = readPlayMeta('cold-call.md', fs.readFileSync(path.join(PLAYS, 'cold-call.md'), 'utf8'));
  assert.equal(cold.branches.length, 7);
  assert.deepEqual(cold.branches[0], { id: 'B1', when: 'Prospect picks up' });
  assert.equal(cold.branches[2].when, '"Not now" or stall');
  assert.equal(cold.firstStage, 1);
});

test('win-loss template offers optional motion, lead_source, deal_id and result frontmatter (R1.3)', async () => {
  const { parseFrontmatter } = await import('../../src/core/plays.js');
  const fm = parseFrontmatter(fs.readFileSync(path.join(SALES, 'win-loss', 'post-mortem-template.md'), 'utf8'));
  assert.deepEqual(Object.keys(fm), ['motion', 'lead_source', 'deal_id', 'result']);
});
