import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScript } from '../../src/core/sales-scripts.js';

export const SAMPLE = `---
script: sample-co
title: Sample Co scripts
industry: generic
version: 2
status: active
---
Short intro for the set.

## Cold call
play: cold-call
goal: Book a short meeting
note: Keep it under two minutes
- Smile before dialing
- Never read word for word

### Opening
branch: B1
tag: Opening
say: Hi [NAME], this is [REP] from Sample Co.
detail: Pause and let them answer.
tip: Slow down
tone: start
next: Closing

#### Interested
when: They ask a question
tag: Good sign
say: Great, let me explain in one sentence.
tone: yes
next: end

#### Not now
say: No problem, when is better?
tone: no
next: Follow up

### Closing
say: Can we book ten minutes on Tuesday?
tone: action

## Follow up
goal: Keep the door open

### Check in
say: Just checking in.
tag: Second card
say: Anything changed?
`;

test('parses the neutral sample into conversations, steps and answers with no diagnostics', () => {
  const s = parseScript(SAMPLE, { fileStem: 'sample-co' });
  assert.deepEqual(s.diagnostics, []);
  assert.equal(s.id, 'sample-co');
  assert.equal(s.title, 'Sample Co scripts');
  assert.equal(s.industry, 'generic');
  assert.equal(s.version, 2);
  assert.equal(s.status, 'active');
  assert.equal(s.intro, 'Short intro for the set.');
  assert.equal(s.conversations.length, 2);
  const c = s.conversations[0];
  assert.equal(c.title, 'Cold call');
  assert.equal(c.anchor, 'cold-call');
  assert.equal(c.play, 'cold-call');
  assert.equal(c.goal, 'Book a short meeting');
  assert.equal(c.note, 'Keep it under two minutes');
  assert.deepEqual(c.rules, ['Smile before dialing', 'Never read word for word']);
  assert.equal(c.steps.length, 2);
  const open = c.steps[0];
  assert.equal(open.anchor, 'cold-call-b1');
  assert.equal(open.branch, 'B1');
  assert.equal(open.next, 'Closing');
  assert.equal(open.nextAnchor, 'cold-call-step-2');
  assert.deepEqual(open.cards, [{ tag: 'Opening', say: 'Hi [NAME], this is [REP] from Sample Co.', details: ['Pause and let them answer.'], tip: 'Slow down', tone: 'start' }]);
  assert.equal(open.answers.length, 2);
  assert.deepEqual(open.answers[0], {
    label: 'Interested', when: 'They ask a question', next: 'end', nextAnchor: '',
    cards: [{ tag: 'Good sign', say: 'Great, let me explain in one sentence.', details: [], tip: '', tone: 'yes' }]
  });
  assert.equal(open.answers[1].nextAnchor, 'follow-up');
  assert.equal(c.steps[1].cards[0].tone, 'action');
  assert.equal(s.conversations[1].steps[0].cards.length, 2);
  assert.equal(s.conversations[1].steps[0].cards[1].tag, 'Second card');
});

test('text without ## headings becomes the intro and does not throw', () => {
  const s = parseScript('---\nscript: x\ntitle: T\nversion: 1\nstatus: draft\n---\nJust some words.\n');
  assert.equal(s.intro, 'Just some words.');
  assert.deepEqual(s.conversations, []);
  assert.ok(s.diagnostics.some((d) => d.level === 'error' && /conversation/i.test(d.message)));
});

const wrap = (body, fm = 'script: x\ntitle: T\nversion: 1\nstatus: draft') => `---\n${fm}\n---\n${body}`;
const errors = (s) => s.diagnostics.filter((d) => d.level === 'error');
const warnings = (s) => s.diagnostics.filter((d) => d.level === 'warning');

test('unknown line `foo: x` in a step yields one warning with its line number', () => {
  const s = parseScript(wrap('## C\n### S\nsay: hi\nfoo: x\n'));
  assert.equal(errors(s).length, 0);
  assert.equal(warnings(s).length, 1);
  assert.equal(warnings(s)[0].line, 10);
  assert.match(warnings(s)[0].message, /foo: x/);
});

test('structural and value errors are classified as errors', () => {
  const noFm = parseScript('## C\n### S\nsay: hi\n');
  assert.ok(errors(noFm).some((d) => /frontmatter/i.test(d.message)));
  const noTitle = parseScript(wrap('## C\n### S\nsay: hi\n', 'script: x\nversion: 1\nstatus: draft'));
  assert.ok(errors(noTitle).some((d) => /title/i.test(d.message)));
  const badStatus = parseScript(wrap('## C\n### S\nsay: hi\n', 'script: x\ntitle: T\nversion: 1\nstatus: live'));
  assert.ok(errors(badStatus).some((d) => /status/i.test(d.message)));
  const badVersion = parseScript(wrap('## C\n### S\nsay: hi\n', 'script: x\ntitle: T\nversion: one\nstatus: draft'));
  assert.ok(errors(badVersion).some((d) => /version/i.test(d.message)));
  const noStepConv = parseScript(wrap('## C\ngoal: g\n'));
  assert.ok(errors(noStepConv).some((d) => /no steps/i.test(d.message)));
  const noSay = parseScript(wrap('## C\n### S\ntip: only a tip\n'));
  assert.ok(errors(noSay).some((d) => /say/i.test(d.message)));
  const badTone = parseScript(wrap('## C\n### S\nsay: hi\ntone: loud\n'));
  assert.ok(errors(badTone).some((d) => /tone/i.test(d.message)));
  assert.equal(badTone.conversations[0].steps[0].cards[0].tone, 'plain');
});

test('an empty file yields errors and does not throw', () => {
  for (const input of ['', '   \n', undefined, null]) {
    const s = parseScript(input);
    assert.ok(errors(s).length > 0);
    assert.deepEqual(s.conversations, []);
  }
});

test('CRLF and BOM input parses identically to LF', () => {
  const crlf = '﻿' + SAMPLE.replace(/\n/g, '\r\n');
  assert.deepEqual(parseScript(crlf, { fileStem: 'sample-co' }), parseScript(SAMPLE, { fileStem: 'sample-co' }));
});

test('script differing from the file stem warns; no stem means no check', () => {
  const body = '## C\n### S\nsay: hi\n';
  assert.ok(warnings(parseScript(wrap(body), { fileStem: 'other' })).some((d) => /file name/i.test(d.message)));
  assert.equal(parseScript(wrap(body)).diagnostics.length, 0);
  assert.equal(parseScript(wrap(body), { fileStem: 'x' }).diagnostics.length, 0);
});

test('anchor is <play>-<branch lowercase> when both set, else <conv-slug>-step-N (1-based)', () => {
  const s = parseScript(wrap('## C\nplay: p1\n### A\nbranch: B2\nsay: a\n### B\nsay: b\n### C2\nsay: c\n'));
  assert.deepEqual(s.conversations[0].steps.map((x) => x.anchor), ['p1-b2', 'c-step-2', 'c-step-3']);
});

test('conversation anchor is an ascii-folded slug of the title', () => {
  const s = parseScript(wrap('## Llamada Crítica Año\n### S\nsay: hi\n'));
  assert.equal(s.conversations[0].anchor, 'llamada-critica-ano');
});

test('duplicate anchors get a -2 suffix plus a warning', () => {
  const s = parseScript(wrap('## C\nplay: p\n### A\nbranch: B1\nsay: a\n### B\nbranch: b1\nsay: b\n'));
  assert.deepEqual(s.conversations[0].steps.map((x) => x.anchor), ['p-b1', 'p-b1-2']);
  assert.ok(warnings(s).some((d) => /duplicate/i.test(d.message)));
});

test('next resolves to a step or conversation title case-insensitively or end; unresolved warns', () => {
  const s = parseScript(wrap('## One\n### A\nsay: a\nnext: b step\n### B Step\nsay: b\nnext: TWO\n### C\nsay: c\nnext: end\n## Two\n### D\nsay: d\nnext: nowhere\n'));
  const [one, two] = s.conversations;
  assert.equal(one.steps[0].nextAnchor, 'one-step-2');
  assert.equal(one.steps[1].nextAnchor, 'two');
  assert.equal(one.steps[2].nextAnchor, '');
  assert.equal(two.steps[0].nextAnchor, '');
  const w = warnings(s);
  assert.equal(w.length, 1);
  assert.match(w[0].message, /nowhere/);
});

test('parsing is deterministic across runs', () => {
  assert.deepEqual(parseScript(SAMPLE), parseScript(SAMPLE));
});
