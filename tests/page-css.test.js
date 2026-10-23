// Guards for the precompiled Tailwind CSS of generated pages (ADR 0010):
// every class a page uses has a rule in the shipped CSS, the CSS is rebuilt from the current renderers,
// it stays offline, and Tailwind never becomes a runtime dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { initBrain } from '../src/core/scaffold.js';
import { writeSalesPreview, writeSalesView } from '../src/core/sales-view.js';
import { LIVE_CLASSES } from '../src/core/script-view.js';
import * as SALES_CLASSES from '../src/core/page-classes.js';
import { PAGE_CSS, PAGE_CSS_SOURCE_HASH } from '../src/core/styles/compiled.js';
import { ALL_TONES } from './fixtures/all-tones-script.js';
import { withTmp, writeFiles } from './core/helpers.js';

const require = createRequire(import.meta.url);
const build = require('../tools/build-css.js');
const ROOT = path.resolve(import.meta.dirname, '..');

const GLOSSARY = '# Glossary\n\n## Basics\n\n| Word | What it means | Example |\n|---|---|---|\n| **Lead** | A possible buyer | A caller |\n';
const PACKS = '\n## Industry packs\n\n| Industry | Profile |\n|---|---|\n| Retail | [Profile](./icps/retail.md) |\n';
const BROKEN_SCRIPT = '---\nscript: broken\ntitle: Broken script\nversion: 1\nstatus: active\n---\nno conversations here\n';
const BROKEN_PLAY = ['---', 'play: broken', 'stages: 1', 'goal: Test', 'version: 1', 'status: active', '---', '# Play: Broken guide', '',
  '## Decision Tree', '', '```mermaid', 'flowchart TD', '    A["Say hello"] --> C[[unclosed', '```', ''].join('\n');
const DRAFT_PLAY = ['---', 'play: cold-call', 'stages: 1', 'goal: Book a meeting', 'version: 2', 'status: draft', '---', '# Play: Cold call (draft)', '',
  '## Decision Tree', '', '```mermaid', 'flowchart TD', '    A["Hello"] -->|"Yes"| B{"Book?"}', '    B --> C(["Done"])', '```', ''].join('\n');
const DRAFT_PIPELINE = '```mermaid\nflowchart LR\n    A["Lead"] --> B["Meeting"] --> C["Won"]\n```\n';

/** CSS.escape for a class name, as Tailwind writes selectors (`md:flex` -> `md\:flex`). */
function cssEscape(name) {
  let out = '';
  for (let i = 0; i < name.length; i += 1) {
    const ch = name[i];
    const leadingDigit = /\d/.test(ch) && (i === 0 || (i === 1 && name[0] === '-'));
    if (leadingDigit) out += `\\${ch.charCodeAt(0).toString(16)} `;
    else out += /[A-Za-z0-9_-]/.test(ch) || ch.charCodeAt(0) >= 0x80 ? ch : `\\${ch}`;
  }
  return out;
}

/** True when the compiled CSS has a rule whose selector names this class. */
function hasRule(css, name) {
  const selector = `.${cssEscape(name)}`;
  let at = css.indexOf(selector);
  while (at !== -1) {
    const next = css[at + selector.length];
    if (next === undefined || /[\s{:,.[>~+)]/.test(next)) return true;
    at = css.indexOf(selector, at + 1);
  }
  return false;
}

/** Every class token of a page, including the markup the live assistant gets as JSON data. */
function classTokens(html) {
  const tokens = new Set();
  for (const m of html.replace(/\\"/g, '"').matchAll(/\bclass="([^"]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) tokens.add(token);
  }
  return tokens;
}

/** A demo brain with sales, every kind of script card, a glossary, industry packs, a broken guide and a broken script. */
function richBrain(dir, language) {
  initBrain(dir, { companyName: 'Acme', areas: ['sales'], demo: true, language });
  const system = path.join(dir, 'sales', 'system.md');
  fs.appendFileSync(system, PACKS);
  writeFiles(dir, {
    'sales/scripts/demo.md': ALL_TONES,
    'sales/scripts/broken.md': BROKEN_SCRIPT,
    'sales/glossary.md': GLOSSARY,
    'sales/plays/broken.md': BROKEN_PLAY
  });
}

/** Saved pages and a draft preview (draft guide, pipeline and script), for one brain language. */
function renderPages(dir, language) {
  richBrain(dir, language);
  const saved = writeSalesView(dir);
  const drafts = [
    { kind: 'script', path: path.join(dir, 'draft-demo.md'), content: ALL_TONES.replace('status: active', 'status: draft') },
    { kind: 'play', path: path.join(dir, 'draft-play.md'), content: DRAFT_PLAY },
    { kind: 'pipeline', path: path.join(dir, 'draft-pipeline.md'), content: DRAFT_PIPELINE }
  ];
  const preview = writeSalesPreview(dir, { drafts, tmpRoot: dir });
  return {
    sales: saved.html,
    script: fs.readFileSync(path.join(dir, 'sales', 'scripts', 'demo.html'), 'utf8'),
    preview: preview.html,
    draftScript: fs.readFileSync(preview.draftPages.demo, 'utf8')
  };
}

for (const language of ['en', 'es']) {
  test(`every class on the generated pages has a rule in the compiled CSS (${language})`, () => withTmp((dir) => {
    const pages = renderPages(dir, language);
    // Class lists that only show with enough data (dashboard bars) or only in the browser (live assistant) count too.
    const all = new Set([...Object.values(LIVE_CLASSES), ...Object.values(SALES_CLASSES)].flatMap((value) => value.split(/\s+/)));
    for (const html of Object.values(pages)) for (const token of classTokens(html)) all.add(token);
    const missing = [...all].filter((token) => !hasRule(PAGE_CSS, token));
    assert.deepEqual(missing, [], 'classes without a compiled rule (use only Tailwind classes, then run npm run build:css)');

    // The sample really reaches every styled piece, so the check above covers them.
    const { sales, script, preview, draftScript } = pages;
    for (const tone of ['start', 'plain', 'action', 'yes', 'no', 'follow']) assert.ok(script.includes(`data-tone="${tone}"`), tone);
    for (const layout of ['single', 'pair', 'close-row', 'lanes', 'lanes-1', 'lanes-2', 'lanes-3']) assert.ok(script.includes(`data-layout="${layout}"`), layout);
    for (const piece of ['data-coach', 'data-pill="y"', 'data-pill="n"', 'data-pill="plain"', 'data-lane']) assert.ok(script.includes(piece), piece);
    assert.ok(draftScript.includes('data-badge="draft"'), 'draft badge on the draft script page');
    for (const piece of ['data-diagram="wide"', 'data-diagram="tree"', 'data-diagram="text"', 'data-note="needs-fix"', 'data-card="dash"', '<table>', '<details>']) {
      assert.ok(sales.includes(piece), piece);
    }
    assert.ok(preview.includes('data-badge="draft"'), 'draft badge on the preview');
  }));
}

test('the compiled CSS is built from the current renderers (run npm run build:css after changing them)', () => {
  assert.equal(PAGE_CSS_SOURCE_HASH, build.sourceHash(), 'src/core/styles/compiled.js is stale: run npm run build:css');
  const shipped = fs.readFileSync(build.OUTPUT, 'utf8');
  assert.equal(shipped, build.moduleText(PAGE_CSS, PAGE_CSS_SOURCE_HASH), 'compiled.js is generated: never edit it by hand');
  for (const rel of build.inputFiles()) assert.ok(fs.existsSync(path.join(ROOT, rel)), `@source ${rel} exists`);
});

test('rebuilding the CSS with the installed Tailwind CLI gives exactly the shipped CSS', (t) => {
  if (!build.cliAvailable()) {
    t.skip('Tailwind CLI not installed (devDependencies)');
    return;
  }
  assert.equal(build.compileCss(), PAGE_CSS);
});

test('the compiled CSS keeps pages offline and self-contained', () => {
  assert.ok(PAGE_CSS.length > 0);
  assert.doesNotMatch(PAGE_CSS, /https?:\/\//i);
  assert.doesNotMatch(PAGE_CSS, /url\(/i);
  assert.doesNotMatch(PAGE_CSS, /@import/i);
  assert.doesNotMatch(PAGE_CSS, /<\/?style|<!--|<script/i);
  assert.match(PAGE_CSS, /prefers-color-scheme:dark/, 'dark mode');
});

test('generated pages inline the CSS: no stylesheet links, the sales page has no script, script pages exactly one inline script', () => withTmp((dir) => {
  const { sales, script, preview, draftScript } = renderPages(dir, 'en');
  for (const html of [sales, script, preview, draftScript]) {
    assert.equal((html.match(/<style>/g) ?? []).length, 1);
    assert.ok(html.includes(`<style>${PAGE_CSS}</style>`));
    assert.doesNotMatch(html, /<link\b|https?:\/\/|cdn\./i);
  }
  for (const html of [sales, preview]) assert.doesNotMatch(html, /<script/i);
  for (const html of [script, draftScript]) {
    assert.equal((html.match(/<script/gi) ?? []).length, 1);
    assert.match(html, /<script>/);
  }
}));

test('Tailwind is a build-time devDependency only; the core never imports it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const name of ['tailwindcss', '@tailwindcss/cli']) {
    assert.ok(!(name in (pkg.dependencies ?? {})), `${name} is not a runtime dependency`);
    assert.match(pkg.devDependencies[name], /^\d+\.\d+\.\d+$/, `${name} is pinned to an exact version`);
  }
  assert.equal(pkg.scripts['build:css'], 'node tools/build-css.js');
  const core = path.join(ROOT, 'src', 'core');
  for (const file of fs.readdirSync(core, { recursive: true }).filter((f) => f.endsWith('.js'))) {
    assert.doesNotMatch(fs.readFileSync(path.join(core, file), 'utf8'), /from ['"](?:tailwindcss|@tailwindcss\/)/, file);
  }
});
