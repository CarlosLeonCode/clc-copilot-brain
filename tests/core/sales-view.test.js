import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSalesView, escapeHtml, markdownToHtml, writeSalesView } from '../../src/core/sales-view.js';
import { initBrain } from '../../src/core/scaffold.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

const STARTER_PLAYS = Object.freeze([
  ['Cold Call', 'Book a discovery meeting'],
  ['Discovery Call', null],
  ['Demo Call', null],
  ['Follow-up', 'Keep momentum between meetings and move the deal to the next gate']
]);

const countOf = (text, needle) => text.split(needle).length - 1;

test('buildSalesView renders every starter play, the pipeline and pinned mermaid diagrams', () =>
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
    assert.match(html, /cdn\.jsdelivr\.net\/npm\/mermaid@11\.4\.1\/dist\/mermaid\.esm\.min\.mjs/);
    assert.match(html, /securityLevel: 'strict'/);
    assert.equal(countOf(html, '<pre class="mermaid">'), plays.length + 1);
    assert.match(html, /What to say/);
    assert.match(html, /Diagrams need an internet connection/);
  }));

test('buildSalesView maps play stage numbers to pipeline step names', () =>
  withTmp((dir) => {
    initBrain(dir, { areas: ['sales'] });
    const { plays } = buildSalesView(dir);
    const followUp = plays.find((p) => p.id === 'follow-up');
    assert.deepEqual(followUp.steps, ['Validation', 'Business Case', 'Negotiation']);
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
