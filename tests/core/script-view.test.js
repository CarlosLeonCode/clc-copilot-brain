import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAssistant, linkInline, renderScriptPage } from '../../src/core/script-view.js';
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
  assert.equal(sales('[Glosario](./glosario-sandler.md)'), '<a href="#glossary">Glosario</a>');
  assert.equal(sales('[Glosario](./glosario.md)'), '<a href="#glossary">Glosario</a>');
  assert.equal(sales('[Bad](./glosario/x.md)'), 'Bad');
  assert.equal(linkInline('[Other](../scripts/sample-co.html#a)'), '<a href="../scripts/sample-co.html#a">Other</a>');
  assert.equal(linkInline('[Words](./glossary.md)'), 'Words');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'http://x.io', 'https://x.io', '//x.io', '../secret.md', './scripts/a/b.html', './scripts/A.html', './other.html', '/etc/passwd']) {
    for (const page of [true, false]) {
      const out = linkInline(`[Label](${bad})`, { page });
      assert.equal(out, 'Label', bad);
    }
  }
});

test('renders card tones start|plain|action|yes|no|follow and a lane per buyer answer', () => {
  const tones = ['start', 'plain', 'action', 'yes', 'no', 'follow'];
  const body = '## C\n### S\n' + tones.map((tn) => `say: card ${tn}\ntone: ${tn}\n`).join('') + '#### A\nsay: a\ntag: b\nsay: b2\n';
  const html = renderScriptPage(parseScript(FM() + body), { lang: 'en' });
  for (const tn of tones) assert.match(html, new RegExp(`data-tone="${tn}"`));
  assert.match(html, /<section data-lane /);
  assert.match(html, /<meta name="generator" content="clc-brain">/);
  assert.match(html, /<div data-pill="plain" class="[^"]*">A<\/div>/);
});

test('renders the sample with title, goal, rules, details, tip, when, next and back links', () => {
  const html = renderScriptPage(parseScript(SAMPLE, { fileStem: 'sample-co' }), { lang: 'en', company: 'Sample Co' });
  for (const piece of ['Sample Co scripts', 'Book a short meeting', 'Smile before dialing', 'Pause and let them answer.', 'Slow down', 'They ask a question', 'id="cold-call-b1"', 'href="#cold-call-step-2"', 'href="#follow-up"', 'Goal', 'Rules']) {
    assert.ok(html.includes(piece), piece);
  }
  assert.match(html, /<html lang="en"[ >]/);
  assert.match(html, /<title>Sample Co · Sample Co scripts<\/title>/);
  assert.match(html, /data-pill="y"/);
  assert.match(html, /data-pill="n"/);
});

test('layout by answer count: 0 single column, 1 column, 2 pair, 3 close-row, 4+ lanes, multi-card lanes', () => {
  const none = withAnswers(0);
  assert.ok(!none.includes('data-layout=') && !none.includes('data-lane'));
  const one = withAnswers(1);
  assert.match(one, /data-layout="single"/);
  assert.ok(!one.includes('data-layout="pair"') && !one.includes('data-layout="lanes'));
  assert.match(withAnswers(2), /data-layout="pair"/);
  assert.match(withAnswers(3), /data-layout="close-row"/);
  assert.match(withAnswers(4), /data-layout="lanes"/);
  assert.match(withAnswers(5), /data-layout="lanes"/);
  assert.match(withAnswers(1, true), /data-layout="lanes-1"/);
  assert.match(withAnswers(2, true), /data-layout="lanes-2"/);
  assert.match(withAnswers(3, true), /data-layout="lanes-3"/);
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

const scriptBody = (html) => /<script>([\s\S]*?)<\/script>/.exec(html)[1];

test('output is offline: exactly one inline script with no src or network api, no link, img, http(s):// and no url( except url(#', () => {
  for (const html of [renderScriptPage(parseScript(SAMPLE), { lang: 'en' }), renderScriptPage(parseScript(HOSTILE), { lang: 'es' })]) {
    assert.equal((html.match(/<script/gi) ?? []).length, 1, 'one script');
    assert.equal((html.match(/<\/script/gi) ?? []).length, 1, 'one closing script');
    assert.match(html, /<script>/, 'inline, no attributes');
    assert.ok(!html.includes('<!--'), 'no html comment opener');
    const js = scriptBody(html).replace(/var data = .*;\n/, '');
    for (const banned of [/\bfetch\b/, /XMLHttpRequest/, /\beval\b/, /new Function/, /\bimport\s*\(/, /WebSocket/, /sendBeacon/, /\bsrc\b/, /\.write\(/]) {
      assert.doesNotMatch(js, banned, String(banned));
    }
    assert.ok(!/<link/i.test(html), 'link');
    assert.ok(!/<img/i.test(html), 'img');
    assert.ok(!/https?:\/\//i.test(html), 'http');
    assert.ok(!/url\((?!#)/i.test(html), 'url(');
  }
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
  assert.match(renderScriptPage(draft, { lang: 'en' }), /data-badge="draft"[^>]*>[^<]*validate/i);
  assert.match(renderScriptPage(draft, { lang: 'es' }), /data-badge="draft"[^>]*>[^<]*(valida|prueba)/i);
  assert.ok(!renderScriptPage(active, { lang: 'en' }).includes('data-badge="draft"'));
  assert.ok(!renderScriptPage(active, { lang: 'es' }).includes('data-badge="draft"'));
  assert.match(renderScriptPage(active, { lang: 'en', draft: true }), /not saved yet/);
});

test('linkInline links ./icps/<slug>.md only on the sales page', () => {
  assert.equal(linkInline('[ICP](./icps/pyme-retail.md)', { page: true }), '<a href="./icps/pyme-retail.md">ICP</a>');
  assert.equal(linkInline('[ICP](./icps/pyme-retail.md)'), 'ICP');
  for (const bad of ['./icps/../x.md', './icps/A.md', '../icps/x.md', './icps/x.html']) assert.equal(linkInline(`[ICP](${bad})`, { page: true }), 'ICP', bad);
});

test('an answer without say: (only next:) is a valid routing option and renders in every layout', () => {
  for (const n of [1, 2, 3, 4]) {
    let body = '## C\n### S\nsay: question\n';
    for (let i = 1; i <= n; i += 1) body += i === 1 ? '#### Just route\nnext: Other\n' : `#### A${i}\nsay: reply ${i}\n`;
    body += '### Other\nsay: other\n';
    const script = parseScript(FM() + body);
    assert.deepEqual(script.diagnostics.filter((d) => d.level === 'error'), [], `n=${n}`);
    const html = renderScriptPage(script, { lang: 'en' });
    assert.ok(html.includes('Just route'), `n=${n}`);
  }
});

test('no optional key can crash the renderer: answers with only when, tag, tip, detail, next or nothing', () => {
  const variants = ['', 'when: w\n', 'tag: t\n', 'tip: t\n', 'detail: d\n', 'next: end\n', 'tone: yes\n'];
  for (const v of variants) {
    for (const extra of ['', '#### Second\nsay: s\n', '#### Second\nsay: s\n#### Third\nsay: t\n#### Fourth\n']) {
      const html = renderScriptPage(parseScript(FM() + `## C\n### S\nsay: q\n#### First\n${v}${extra}`), { lang: 'es' });
      assert.ok(html.includes('First'), JSON.stringify(v + extra));
    }
  }
  const stepOnly = renderScriptPage(parseScript(FM() + '## C\n### S\ntip: only a tip\n'), { lang: 'en' });
  assert.ok(stepOnly.includes('only a tip'));
});

test('coach: renders a localized call-tip box in the diagram (en and es)', () => {
  const src = FM() + '## C\n### S\nsay: q\ncoach: Breathe <b>and</b> wait\n#### A\nsay: r\ncoach: Do not rush\n';
  const en = renderScriptPage(parseScript(src), { lang: 'en' });
  const es = renderScriptPage(parseScript(src), { lang: 'es' });
  assert.match(en, /data-coach class="[^"]*"><div class="[^"]*">💬 Call tip<\/div><p>Breathe &lt;b&gt;and&lt;\/b&gt; wait<\/p>/);
  assert.ok(en.includes('Do not rush'));
  assert.match(es, /💬 Recomendación para la llamada/);
});

const LIVE = FM() + `## First talk
goal: Book a meeting
### Open
say: Hello [NAME]
coach: Smile while you talk
#### Yes
when: They say yes
say: Great, Tuesday?
tone: yes
next: Book
#### Just route
next: Book
#### Later
say: When is better?
next: Second talk
#### Bye
say: Thanks anyway
next: end
### Book
say: Tuesday at ten?
### Wrap
tag: Last
say: Thanks
## Second talk
### Check in
say: Checking in
`;

test('buildAssistant maps conversations to flows, steps to nodes and answers to options with resolved targets', () => {
  const data = buildAssistant(parseScript(LIVE), 'en');
  assert.equal(data.flows.length, 2);
  const [first, second] = data.flows;
  assert.equal(first.title, 'First talk');
  assert.match(first.head, /Book a meeting/);
  const open = first.steps[0];
  assert.equal(open.ask, true);
  assert.match(open.html, /Hello \[NAME\]/);
  assert.match(open.html, /Smile while you talk/);
  assert.deepEqual(open.options.map((o) => o.label), ['Yes', 'Just route', 'Later', 'Bye']);
  assert.equal(open.options[0].when, 'They say yes');
  assert.match(open.options[0].reply, /data-tone="yes"/);
  assert.equal(open.options[1].reply, '', 'an answer without say: has no reply card');
  assert.deepEqual(open.options.map((o) => o.to), [[0, 1], [0, 1], [1, 0], null]);
  const book = first.steps[1];
  assert.equal(book.ask, false, 'a step without answers continues');
  assert.deepEqual(book.options.map((o) => [o.label, o.to]), [['Continue', [0, 2]]]);
  assert.deepEqual(first.steps[2].options, [], 'the last step ends the call');
  assert.deepEqual(second.steps[0].options, []);
  assert.deepEqual(data.anchors['second-talk'], [1, 0]);
  assert.equal(data.ui.ask, '👇 What did the client answer?');
  assert.equal(buildAssistant(parseScript(LIVE), 'es').ui.end, 'Fin de la llamada');
});

test('an answer without next: follows the step next:, then the step below, then ends', () => {
  const src = FM() + '## C\n### A\nsay: a\nnext: C2\n#### X\nsay: x\n### B\nsay: b\n#### Y\nsay: y\n### C2\nsay: c\n#### Z\nsay: z\n';
  const steps = buildAssistant(parseScript(src), 'en').flows[0].steps;
  assert.deepEqual(steps[0].options[0].to, [0, 2]);
  assert.deepEqual(steps[1].options[0].to, [0, 2]);
  assert.equal(steps[2].options[0].to, null);
});

test('the page holds the live assistant (hidden without js) and the full diagram, with localized controls', () => {
  const html = renderScriptPage(parseScript(LIVE), { lang: 'es' });
  assert.match(html, /<div id="assistant" class="[^"]*" hidden>/);
  assert.match(html, /<div id="diagram">/);
  assert.match(html, /<div id="modes" class="[^"]*" role="group" aria-label="[^"]+" hidden>/);
  assert.match(html, /<button type="button" class="[^"]*" data-mode="live"[^>]*>Asistente en vivo<\/button>/);
  assert.match(html, /<button type="button" class="[^"]*" data-mode="diagram"[^>]*>Diagrama completo<\/button>/);
  assert.match(html, /<button type="button" class="[^"]*" data-flow="1"[^>]*>2\. Second talk<\/button>/);
  assert.match(html, /<button type="button" id="live-undo"[^>]*>[^<]*Deshacer<\/button>/);
  assert.match(html, /<button type="button" id="live-restart"[^>]*>[^<]*Reiniciar<\/button>/);
  assert.match(html, /<div id="live-stream" class="[^"]*" aria-live="polite"><\/div>/);
  assert.ok(!/<button(?![^>]*type="button")/.test(html), 'every button is type=button');
});

test('the embedded data is pre-escaped and can never close the script or open a comment', () => {
  const evil = FM() + '## C\n### S\nsay: </script><script>alert(1)</script> <!-- x --> \u2028\n#### </SCRIPT>\nwhen: <!--\nsay: ok\n';
  const html = renderScriptPage(parseScript(evil), { lang: 'en' });
  assert.equal((html.match(/<\/script/gi) ?? []).length, 1);
  assert.ok(!html.includes('<!--'));
  const js = scriptBody(html);
  const json = /var data = (\{[\s\S]*?\});\n/.exec(js)[1];
  const data = JSON.parse(json);
  assert.match(data.flows[0].steps[0].html, /&lt;\/script&gt;&lt;script&gt;alert\(1\)/);
  assert.equal(data.flows[0].steps[0].options[0].label, '&lt;/SCRIPT&gt;');
  assert.ok(!/[<>\u2028\u2029]/.test(json));
});

test('a single-conversation script still gets one tab and the assistant', () => {
  const html = renderScriptPage(parseScript(FM() + '## C\n### S\nsay: hi\n'), { lang: 'en' });
  assert.match(html, /data-flow="0"/);
  assert.match(html, /id="live-stream"/);
});
