import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSalesView, detectDraftKind, writeSalesPreview, writeSalesView } from '../../src/core/sales-view.js';
import { initBrain } from '../../src/core/scaffold.js';
import { SAMPLE } from '../fixtures/sample-script.js';
import { withTmp, writeFiles } from './helpers.js';

const GLOSSARY = '# Glossary\n\n## Basics\n\n| Word | What it means | Example |\n|---|---|---|\n| **Lead** | A possible buyer | A caller |\n';
const BROKEN = '---\nscript: broken\ntitle: Broken script\nversion: 1\nstatus: active\n---\nno conversations here\n';
const brain = (dir, files = {}, language = 'en') => {
  initBrain(dir, { companyName: 'Acme', areas: ['sales'], language });
  writeFiles(dir, files);
};
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

test('1 script + glossary: both sections with title, goal, conversations, Open link and a glossary table', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/sample-co.md': SAMPLE, 'sales/glossary.md': GLOSSARY });
  const { html } = buildSalesView(dir);
  assert.match(html, /<h2 id="scripts">Your scripts<\/h2>/);
  assert.match(html, /Sample Co scripts/);
  assert.match(html, /Book a short meeting/);
  assert.match(html, /2 conversations/);
  assert.match(html, /<a href="\.\/scripts\/sample-co\.html">Open the script<\/a>/);
  assert.match(html, /<h2 id="glossary">Glossary<\/h2>/);
  assert.match(html, /<details[^>]*><summary>Basics<\/summary>[\s\S]*<th>Word<\/th><th>What it means<\/th><th>Example<\/th>[\s\S]*<td><strong>Lead<\/strong><\/td><td>A possible buyer<\/td>/);
  assert.match(html, /href="#scripts"/);
  assert.match(html, /href="#glossary"/);
}));

test('no scripts and no glossary: localized empty state, no error, no glossary section', () => withTmp((dir) => {
  brain(dir);
  const en = buildSalesView(dir).html;
  assert.match(en, /Your scripts/);
  assert.match(en, /No scripts yet/);
  assert.doesNotMatch(en, /id="glossary"/);
  const es = withTmp((d2) => { brain(d2, {}, 'es'); return buildSalesView(d2).html; });
  return es.then((html) => {
    assert.match(html, /Tus guiones/);
    assert.match(html, /Todavía no hay guiones/);
  });
}));

test('an invalid script shows a needs-fixing card and no Open link', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/broken.md': BROKEN, 'sales/scripts/sample-co.md': SAMPLE });
  const { html } = buildSalesView(dir);
  assert.match(html, /Broken script/);
  assert.match(html, /needs fixing/i);
  assert.doesNotMatch(html, /scripts\/broken\.html/);
  assert.match(html, /scripts\/sample-co\.html/);
}));

test('the page with scripts and glossary stays offline and in Spanish too', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/sample-co.md': SAMPLE, 'sales/glossary.md': GLOSSARY.replace('A possible buyer', 'Mira <script>x</script> http://x.io') }, 'es');
  const { html } = buildSalesView(dir);
  assert.match(html, /Abrir el guion/);
  assert.match(html, /\d+ conversaciones/);
  assert.match(html, /<h2 id="glossary">Glosario<\/h2>/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<link\b|<img\b|https?:\/\//i);
  assert.doesNotMatch(html, /url\((?!#)/);
  assert.match(html, /&lt;script&gt;/);
}));

test('a Guion link in a play row works from the page; unsafe links and ./glossary.md', () => withTmp((dir) => {
  brain(dir);
  const file = path.join(dir, 'sales/plays/cold-call.md');
  let md = fs.readFileSync(file, 'utf8');
  md = md
    .replace('| — |', '| [Cold script](../scripts/sample-co.html#cold-call-b1) |')
    .replace('| — |', '| [Bad](javascript:alert(1)) see [words](./glossary.md) |');
  fs.writeFileSync(file, md);
  const { html } = buildSalesView(dir);
  assert.match(html, /<a href="\.\/scripts\/sample-co\.html#cold-call-b1">Cold script<\/a>/);
  assert.doesNotMatch(html, /href="javascript/);
  assert.match(html, /<a href="#glossary">words<\/a>/);
  assert.doesNotMatch(text(html), /\]\(/);
}));

test('detectDraftKind returns script for a `script:` draft, before play', () => {
  assert.equal(detectDraftKind(SAMPLE), 'script');
  assert.equal(detectDraftKind('---\nscript: a\nplay: b\n---\n'), 'script');
});

test('a draft script is previewed on the page, replaces the saved one and reports its errors', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/sample-co.md': SAMPLE });
  const draft = SAMPLE.replace('Sample Co scripts', 'Edited title').replace('status: active', 'status: draft');
  const view = buildSalesView(dir, { drafts: [{ kind: 'script', path: '/x/draft.md', content: draft }] });
  assert.match(view.html, /Edited title/);
  assert.doesNotMatch(view.html, /Sample Co scripts/);
  assert.deepEqual(view.drafts.map((d) => [d.kind, d.id, d.ok]), [['script', 'sample-co', true]]);
  const bad = buildSalesView(dir, { drafts: [{ kind: 'script', path: '/x/bad.md', content: BROKEN }] });
  assert.equal(bad.drafts[0].ok, false);
  assert.ok(bad.drafts[0].errors.length > 0);
  assert.ok(bad.drafts[0].errors[0].line >= 0);
}));

test('writeSalesView writes script pages beside the sources and reports skipped ones', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/sample-co.md': SAMPLE, 'sales/scripts/broken.md': BROKEN });
  const view = writeSalesView(dir);
  assert.deepEqual(view.pages.written, ['sample-co']);
  assert.equal(view.pages.skipped[0].slug, 'broken');
  assert.ok(fs.existsSync(path.join(dir, 'sales/scripts/sample-co.html')));
  assert.ok(fs.existsSync(path.join(dir, 'sales/sales-system.html')));
}));

test('writeSalesPreview writes the page and every script page to the temp folder, nothing into sales/', () => withTmp((dir) => {
  brain(dir, { 'sales/scripts/sample-co.md': SAMPLE });
  const draft = SAMPLE.replace('script: sample-co', 'script: new-set').replace('status: active', 'status: draft');
  const res = writeSalesPreview(dir, { drafts: [{ kind: 'script', path: '/x/new-set.md', content: draft }] });
  try {
    const out = path.dirname(res.outputPath);
    assert.ok(fs.existsSync(path.join(out, 'scripts/new-set.html')));
    assert.ok(fs.existsSync(path.join(out, 'scripts/sample-co.html')));
    assert.match(fs.readFileSync(path.join(out, 'scripts/new-set.html'), 'utf8'), /Draft/);
    assert.equal(res.draftPages['new-set'], path.join(out, 'scripts/new-set.html'));
    assert.equal(fs.existsSync(path.join(dir, 'sales/scripts/new-set.html')), false);
  } finally {
    fs.rmSync(path.dirname(res.outputPath), { recursive: true, force: true });
  }
}));

test('a Spanish glosario file is the Glossary section of the page', () => withTmp((dir) => {
  brain(dir, { 'sales/glosario-sandler.md': '# Glosario\n\n## Base\n\n| Término | Qué significa | Ejemplo |\n|---|---|---|\n| **Dolor** | Un problema | Pierden ventas |\n' }, 'es');
  const { html } = buildSalesView(dir);
  assert.match(html, /<h2 id="glossary">Glosario<\/h2>/);
  assert.match(html, /<th>Término<\/th><th>Qué significa<\/th><th>Ejemplo<\/th>[\s\S]*<td><strong>Dolor<\/strong><\/td>/);
  assert.match(html, /href="#glossary"/);
}));
