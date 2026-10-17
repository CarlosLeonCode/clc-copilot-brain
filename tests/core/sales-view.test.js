import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSalesView, detectDraftKind, escapeHtml, loadDraft, markdownToHtml, writeSalesPreview, writeSalesView } from '../../src/core/sales-view.js';
import { initBrain } from '../../src/core/scaffold.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

const STARTER_PLAYS = Object.freeze([
  ['Cold Call', 'Book a discovery meeting'],
  ['Discovery Call', null],
  ['Demo Call', null],
  ['Follow-up', 'Keep the deal moving between meetings until the next step is agreed']
]);

const countOf = (text, needle) => text.split(needle).length - 1;

test('buildSalesView renders every starter play and the pipeline as inline SVG diagrams', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const { html, plays, outputPath } = buildSalesView(dir);
    assert.equal(outputPath, path.join(dir, 'sales', 'sales-system.html'));
    assert.equal(plays.length, 4);
    for (const [title, goal] of STARTER_PLAYS) {
      assert.ok(html.includes(title), `missing play title ${title}`);
      if (goal) assert.ok(html.includes(goal), `missing goal ${goal}`);
    }
    assert.match(html, /<title>Acme/);
    assert.match(html, /How your sales system works/);
    assert.match(html, /Your pipeline/);
    assert.equal(countOf(html, '<svg'), plays.length + 1);
    assert.equal(countOf(html, 'role="img"'), plays.length + 1);
    assert.match(html, /What to say/);
    assert.doesNotMatch(html, /internet/i);
    assert.doesNotMatch(html, /<pre class="mermaid">|flowchart (TD|LR)/, 'raw Mermaid code never reaches the page');
  }));

test('the page works offline: no scripts, imports, CDNs or external URLs', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const { html } = buildSalesView(dir);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /\bimport\b[^\n]*from/);
    assert.doesNotMatch(html, /cdn\./i);
    assert.doesNotMatch(html, /<link\b/i);
    assert.doesNotMatch(html, /<img\b/i);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /url\((?!#)/, 'only local url(#marker) references');
  }));

test('every diagram gets unique marker ids on the page', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const ids = [...buildSalesView(dir).html.matchAll(/<marker id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, 5);
    assert.equal(new Set(ids).size, ids.length);
  }));

test('a diagram that cannot be drawn becomes a readable list of steps, never raw code', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, {
      'sales/plays/broken.md': [
        '---', 'play: broken', 'stages: 1', 'goal: Test', 'version: 1', 'status: active', '---',
        '# Play: Broken guide', '',
        '## Decision Tree', '', '```mermaid', 'flowchart TD', '    A["Say hello"] -->|"Interested"| B["Book a meeting"]', '    A --> C[[unclosed', '```', ''
      ].join('\n')
    });
    const { html, plays } = buildSalesView(dir);
    assert.equal(countOf(html, '<svg'), plays.length, 'the broken diagram is not drawn');
    const card = /<section class="card" id="play-broken">[\s\S]*?<\/section>/.exec(html)[0];
    assert.match(card, /class="diagram-text"/);
    assert.match(card, /Say hello/);
    assert.match(card, /If Interested[^<]*→[^<]*Book a meeting/);
    assert.doesNotMatch(card, /flowchart|-->|\[\[/);
  }));

test('buildSalesView maps play stage numbers to pipeline step names', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { plays } = buildSalesView(dir);
    const followUp = plays.find((p) => p.id === 'follow-up');
    assert.deepEqual(followUp.steps, ['Validation', 'Proposal', 'Negotiation']);
    assert.equal(followUp.title, 'Follow-up');
  }));

test('buildSalesView hides frontmatter keys, file paths and table jargon', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { html } = buildSalesView(dir);
    for (const leak of ['gate_unlocked:', 'play: cold-call', 'plays/cold-call.md', 'For your AI assistant', '| Branch |', '/retro']) {
      assert.ok(!html.includes(leak), `page leaks "${leak}"`);
    }
  }));

test('buildSalesView escapes HTML from play titles and talk tracks', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeFiles(dir, {
      'sales/plays/evil.md': [
        '---', 'play: evil', 'stages: 1', 'goal: <img src=x onerror=alert(2)>', 'gate_unlocked: x', 'version: 1', 'status: active', '---',
        '# Play: <script>alert(1)</script>', '',
        '## Decision Tree', '', '```mermaid', 'flowchart TD', '    B1{"Open</pre><script>alert(3)</script>"} --> B2["End"]', '```', '',
        '## Branches', '', '| Branch | Trigger | Talk track | Script link |', '| :--- | :--- | :--- | :--- |',
        '| B1 | Picks up | "<script>alert(1)</script>" | none |', ''
      ].join('\n')
    });
    const { html } = buildSalesView(dir);
    assert.ok(!html.includes('<script>alert('), 'raw script tags must never reach the page');
    assert.ok(!html.includes('<img src=x'), 'raw img tags must never reach the page');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('&lt;/pre&gt;'));
  }));

test('markdownToHtml converts a safe subset and escapes everything else', () => {
  const out = markdownToHtml('## Steps\n\nHello **bold** and `code` <b>x</b>.\n\n1. **One**: first\n2. Two\n\n- a\n- b\n');
  assert.match(out, /<h3>Steps<\/h3>/);
  assert.match(out, /<p>Hello <strong>bold<\/strong> and code &lt;b&gt;x&lt;\/b&gt;\.<\/p>/);
  assert.match(out, /<ol><li><strong>One<\/strong>: first<\/li><li>Two<\/li><\/ol>/);
  assert.match(out, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
});

test('buildSalesView throws NOT_A_BRAIN outside a brain', () =>
  withTmp((dir) => {
    assert.throws(() => buildSalesView(dir), (err) => err instanceof BrainError && err.code === 'NOT_A_BRAIN');
  }));

test('buildSalesView throws NO_SALES_SYSTEM for a brain without sales', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['operations'] });
    assert.throws(() => buildSalesView(dir), (err) => err instanceof BrainError && err.code === 'NO_SALES_SYSTEM' && /sales/i.test(err.message));
  }));

test('writeSalesView writes the page into sales/sales-system.html', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { outputPath } = writeSalesView(dir);
    assert.ok(fs.readFileSync(outputPath, 'utf8').startsWith('<!doctype html>'));
  }));

test('the pipeline diagram keeps a readable size and scrolls sideways; decision trees still scale', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { html } = buildSalesView(dir);
    assert.equal(countOf(html, '<div class="diagram diagram-wide"><svg'), 1);
    assert.match(html, /\.diagram-wide\{[^}]*overflow-x:auto/);
    assert.match(html, /\.diagram svg\{[^}]*max-width:100%/);
    assert.match(html, /\.diagram-wide svg\{[^}]*max-width:none/);
    const trees = [...html.matchAll(/<div class="diagram"><svg[^>]*>/g)].map((m) => m[0]);
    assert.equal(trees.length, 4);
    for (const tag of trees) {
      const width = Number(/ width="([\d.]+)"/.exec(tag)[1]);
      const min = Number(/min-width:([\d.]+)px/.exec(tag)[1]);
      assert.ok(min <= width && min >= Math.min(width, 300), 'decision trees shrink but stay readable');
    }
  }));

test('the page omits the "Want to see it?" hint copied from the sales map', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    assert.ok(fs.readFileSync(path.join(dir, 'sales', 'system.md'), 'utf8').includes('Want to see it?'));
    const { html } = buildSalesView(dir);
    assert.ok(!html.includes('Want to see it?'));
    assert.ok(!html.includes('Show me my sales process'));
  }));

test('starter plays read in plain words on the page (no gate jargon or field names outside diagrams)', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const text = buildSalesView(dir).html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<style>[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '');
    for (const jargon of [/\bgates?\b/i, /gate_advanced/, /\bchampion\b/i, /mutual action plan/i, /\bnurture\b/i]) {
      assert.doesNotMatch(text, jargon);
    }
  }));

const draftPlay = (id, title, tree) => [
  '---', `play: ${id}`, 'stages: 1', 'goal: Draft goal', 'gate_unlocked: Gate 1', 'version: 2', 'status: active', '---',
  `# Play: ${title}`, '', '## Decision Tree', '', '```mermaid', tree, '```', ''
].join('\n');

test('detectDraftKind: play frontmatter means a call guide, a bare flowchart means the pipeline', () => {
  assert.equal(detectDraftKind(draftPlay('cold-call', 'Cold Call', 'flowchart TD\nA --> B')), 'play');
  assert.equal(detectDraftKind('# Pipeline\n\n```mermaid\nflowchart LR\nA --> B\n```\n'), 'pipeline');
  assert.equal(detectDraftKind('flowchart LR\nA --> B'), 'pipeline');
  assert.equal(detectDraftKind('just some notes'), null);
});

test('loadDraft reads a draft file and rejects one that is neither a guide nor a pipeline', () =>
  withTmp((dir) => {
    writeFiles(dir, { 'a.md': draftPlay('x', 'X', 'flowchart TD\nA --> B'), 'b.txt': 'hello' });
    assert.deepEqual(loadDraft(path.join(dir, 'a.md')).kind, 'play');
    assert.throws(() => loadDraft(path.join(dir, 'b.txt')), (err) => err instanceof BrainError && err.code === 'DRAFT_INVALID');
    assert.throws(() => loadDraft(path.join(dir, 'missing.md')), (err) => err instanceof BrainError && err.code === 'DRAFT_INVALID');
  }));

test('a draft play replaces the saved play with the same id and is marked as a draft preview', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const content = draftPlay('cold-call', 'Cold Call', 'flowchart TD\n    A{"Opener"} -->|"Asks for email"| B["Send a two-line email"]');
    const { html, plays, diagrams } = buildSalesView(dir, { drafts: [{ kind: 'play', path: '/tmp/cold-call.md', content }] });
    assert.equal(plays.length, 4, 'replaced, not added');
    assert.match(html, /<title>[^<]*Preview/);
    assert.match(html, /<h1>[^<]*Preview/);
    const card = /<section class="card" id="play-cold-call">[\s\S]*?<\/section>/.exec(html)[0];
    assert.match(card, /Draft — not saved yet/);
    assert.match(card, /Send a two-line email/);
    assert.equal(countOf(html, 'Draft — not saved yet'), 1, 'only the draft card carries the badge');
    const status = diagrams.find((d) => d.id === 'cold-call');
    assert.deepEqual({ kind: status.kind, draft: status.draft, ok: status.ok }, { kind: 'play', draft: true, ok: true });
    assert.equal(diagrams.length, 5);
  }));

test('a new draft play is added and a draft pipeline replaces the pipeline', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { html, plays, diagrams } = buildSalesView(dir, {
      drafts: [
        { kind: 'play', path: 'renewal.md', content: draftPlay('renewal-call', 'Renewal Call', 'flowchart TD\nA[Check usage] --> B[Offer renewal]') },
        { kind: 'pipeline', path: 'pipe.md', content: 'flowchart LR\nS1["1. Meet"] --> S2["2. Win"]' }
      ]
    });
    assert.equal(plays.length, 5);
    assert.match(html, /Renewal Call/);
    assert.match(html, /1\. Meet/);
    assert.doesNotMatch(html, /Agree on value and price/, 'the saved pipeline diagram is replaced');
    assert.equal(countOf(html, 'Draft — not saved yet'), 2);
    assert.ok(diagrams.find((d) => d.kind === 'pipeline').draft);
  }));

test('diagram status reports drafts that cannot be drawn', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { diagrams } = buildSalesView(dir, { drafts: [{ kind: 'play', path: 'x.md', content: draftPlay('cold-call', 'Cold Call', 'flowchart TD\nA[open --> B') }] });
    const status = diagrams.find((d) => d.id === 'cold-call');
    assert.equal(status.ok, false);
    assert.ok(status.error);
    assert.ok(diagrams.filter((d) => d.id !== 'cold-call').every((d) => d.ok), 'saved diagrams all draw');
  }));

test('writeSalesPreview writes outside the brain and leaves the saved page untouched', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    writeSalesView(dir);
    const saved = path.join(dir, 'sales', 'sales-system.html');
    const before = fs.readFileSync(saved, 'utf8');
    const content = draftPlay('cold-call', 'Cold Call', 'flowchart TD\nA --> B');
    const { outputPath } = writeSalesPreview(dir, { drafts: [{ kind: 'play', path: 'x.md', content }] });
    try {
      assert.ok(path.relative(dir, outputPath).startsWith('..'), 'preview lives outside the brain');
      assert.match(fs.readFileSync(outputPath, 'utf8'), /Draft — not saved yet/);
      assert.equal(fs.readFileSync(saved, 'utf8'), before);
    } finally {
      fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
    }
  }));

test('buildSalesView reports the status of each draft', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { drafts } = buildSalesView(dir, {
      drafts: [
        { kind: 'play', path: 'good.md', content: draftPlay('renewal', 'Renewal', 'flowchart TD\nA --> B') },
        { kind: 'play', path: 'bad.md', content: draftPlay('cold-call', 'Cold Call', 'flowchart TD\nA[x --> B') }
      ]
    });
    assert.deepEqual(drafts.map((d) => [d.path, d.id, d.ok]), [['good.md', 'renewal', true], ['bad.md', 'cold-call', false]]);
  }));
