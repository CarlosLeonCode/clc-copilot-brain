import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkInline, renderScriptPage, SCRIPT_CSS } from '../../src/core/script-view.js';
import { parseScript } from '../../src/core/sales-scripts.js';
import { SAMPLE } from '../fixtures/sample-script.js';

const FM = (status = 'active') => `---\nscript: x\ntitle: Sample\nversion: 1\nstatus: ${status}\n---\n`;
const withAnswers = (n, extraCard = false) => {
  let body = '## C\n### S\nsay: question\n';
  for (let i = 1; i <= n; i += 1) {
    body += `#### Answer ${i}\nwhen: case ${i}\nsay: reply ${i}\ntone: ${i % 2 ? 'yes' : 'no'}\n`;
    if (extraCard && i === 1) body += 'tag: more\nsay: extra reply\n';
  }
  return renderScriptPage(parseScript(FM() + body), { lang: 'en' });
};

test('linkInline escapes <b> in text, keeps [PLACEHOLDER] and renders **bold**', () => {
  const out = linkInline('Say <b>hi</b> to [NAME] and **listen** & wait');
  assert.equal(out, 'Say &lt;b&gt;hi&lt;/b&gt; to [NAME] and <strong>listen</strong> &amp; wait');
});

test('linkInline only links the allowlisted relative targets', () => {
  const sales = (s) => linkInline(s, { page: true });
  assert.equal(sales('[Cold](./scripts/sample-co.html#cold-call)'), '<a href="./scripts/sample-co.html#cold-call">Cold</a>');
  assert.equal(sales('[Cold](../scripts/sample-co.html#a-1)'), '<a href="./scripts/sample-co.html#a-1">Cold</a>');
  assert.equal(sales('[Words](./glossary.md)'), '<a href="#glossary">Words</a>');
  assert.equal(linkInline('[Other](../scripts/sample-co.html#a)'), '<a href="../scripts/sample-co.html#a">Other</a>');
  assert.equal(linkInline('[Words](./glossary.md)'), 'Words');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.io', 'https://x.io', '//x.io', '../secret.md', './scripts/a/b.html', './scripts/A.html', './other.html', '/etc/passwd']) {
    for (const page of [true, false]) {
      const out = linkInline(`[Label](${bad})`, { page });
      assert.equal(out, 'Label', bad);
    }
  }
});

test('renders card tone classes start|plain|action|yes|no|follow and a lane per buyer answer', () => {
  const tones = ['start', 'plain', 'action', 'yes', 'no', 'follow'];
  const body = '## C\n### S\n' + tones.map((tn) => `say: card ${tn}\ntone: ${tn}\n`).join('') + '#### A\nsay: a\ntag: b\nsay: b2\n';
  const html = renderScriptPage(parseScript(FM() + body), { lang: 'en' });
  for (const tn of tones) assert.match(html, new RegExp(`class="card ${tn}"`));
  assert.match(html, /class="lane"/);
  assert.match(html, /<meta name="generator" content="clc-brain">/);
  assert.match(html, /<div class="pill [yn]?"?>A<\/div>|<div class="pill[^"]*">A<\/div>/);
});

test('renders the sample with title, goal, rules, details, tip, when, next and back links', () => {
  const html = renderScriptPage(parseScript(SAMPLE, { fileStem: 'sample-co' }), { lang: 'en', company: 'Sample Co' });
  for (const piece of ['Sample Co scripts', 'Book a short meeting', 'Smile before dialing', 'Pause and let them answer.', 'Slow down', 'They ask a question', 'id="cold-call-b1"', 'href="#cold-call-step-2"', 'href="#follow-up"', 'Goal', 'Rules']) {
    assert.ok(html.includes(piece), piece);
  }
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Sample Co · Sample Co scripts<\/title>/);
  assert.match(html, /class="pill y"/);
  assert.match(html, /class="pill n"/);
});

test('layout by answer count: 0 single column, 1 column, 2 pair, 3 close-row, 4+ lanes, multi-card lanes', () => {
  const none = withAnswers(0);
  for (const cls of ['pair', 'close-row', 'lanes', 'lane']) assert.ok(!none.includes(`class="${cls}`), cls);
  const one = withAnswers(1);
  assert.match(one, /class="col answers"/);
  assert.ok(!one.includes('class="pair"') && !one.includes('class="lanes'));
  assert.match(withAnswers(2), /class="pair"/);
  assert.match(withAnswers(3), /class="close-row"/);
  assert.match(withAnswers(4), /class="lanes"/);
  assert.match(withAnswers(5), /class="lanes"/);
  assert.match(withAnswers(1, true), /class="lanes one"/);
  assert.match(withAnswers(2, true), /class="lanes two"/);
  assert.match(withAnswers(3, true), /class="lanes three"/);
});

const HOSTILE = FM() + `intro <script>alert(1)</script>

## <script>x</script>
goal: [click](javascript:alert(1)) and url(http://x) and <img src=x>
- [bad](http://evil.io)
### S
tag: <link rel=stylesheet href=http://x>
say: <script>alert(1)</script> [d](data:text/html,x) background:url(http://x/y.png)
detail: see https://example.com now
tip: <img src=x onerror=alert(1)>
#### <b>pill</b>
say: ok
`;

test('output is offline: no script, link, img, http(s):// and no url( except url(#', () => {
  for (const html of [renderScriptPage(parseScript(SAMPLE), { lang: 'en' }), renderScriptPage(parseScript(HOSTILE), { lang: 'es' })]) {
    assert.ok(!/<script/i.test(html), 'script');
    assert.ok(!/<link/i.test(html), 'link');
    assert.ok(!/<img/i.test(html), 'img');
    assert.ok(!/https?:\/\//i.test(html), 'http');
    assert.ok(!/url\((?!#)/i.test(html), 'url(');
  }
  assert.ok(!/url\(/.test(SCRIPT_CSS));
});

test('urls typed in text stay readable (entity-encoded colon) but are never literal', () => {
  const html = renderScriptPage(parseScript(HOSTILE), { lang: 'en' });
  assert.ok(html.includes('https&#58;//example.com'));
});

test('hostile text is escaped, never active markup', () => {
  const html = renderScriptPage(parseScript(HOSTILE), { lang: 'en' });
  assert.ok(!html.includes('<b>pill'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('href="javascript'));
  assert.ok(!html.includes('href="http'));
  assert.ok(!/on(error|click)=/i.test(html.replace(/&lt;[^&]*&gt;/g, '')));
});

test('draft shows the localized validate-before-judging badge in en and es; active shows none', () => {
  const draft = parseScript(FM('draft') + '## C\n### S\nsay: hi\n');
  const active = parseScript(FM('active') + '## C\n### S\nsay: hi\n');
  assert.match(renderScriptPage(draft, { lang: 'en' }), /class="draft"[^>]*>[^<]*validate/i);
  assert.match(renderScriptPage(draft, { lang: 'es' }), /class="draft"[^>]*>[^<]*(valida|prueba)/i);
  assert.ok(!renderScriptPage(active, { lang: 'en' }).includes('class="draft"'));
  assert.ok(!renderScriptPage(active, { lang: 'es' }).includes('class="draft"'));
  assert.match(renderScriptPage(active, { lang: 'en', draft: true }), /not saved yet/);
});
