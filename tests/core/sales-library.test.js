import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLibrary, writeScriptPages } from '../../src/core/sales-library.js';
import { SAMPLE } from '../fixtures/sample-script.js';
import { withTmp, writeFiles } from './helpers.js';

const GLOSSARY = '# Glossary\n\n## Basics\n\n| Term | Meaning | Example |\n|---|---|---|\n| **Lead** | A possible buyer | A caller |\n';
const BROKEN = '---\nscript: broken\ntitle: Broken\nversion: 1\nstatus: active\n---\nno conversations here\n';
const sampleAs = (slug) => SAMPLE.replace('script: sample-co', `script: ${slug}`);

test('loadLibrary reads scripts with `script:` frontmatter, ignores README and other files, glossary null when missing', () => withTmp((root) => {
  writeFiles(root, {
    'sales/scripts/sample-co.md': SAMPLE,
    'sales/scripts/README.md': '# About scripts\n',
    'sales/scripts/notes.md': '---\ntitle: Notes\n---\nplain notes\n'
  });
  const lib = loadLibrary(root);
  assert.deepEqual(lib.scripts.map((s) => s.slug), ['sample-co']);
  assert.equal(lib.scripts[0].parsed.title, 'Sample Co scripts');
  assert.equal(lib.scripts[0].htmlPath, path.join(root, 'sales', 'scripts', 'sample-co.html'));
  assert.equal(lib.glossary, null);
}));

test('loadLibrary tolerates a missing scripts folder and parses the glossary', () => withTmp((root) => {
  assert.deepEqual(loadLibrary(root), { scripts: [], glossary: null });
  writeFiles(root, { 'sales/glossary.md': GLOSSARY });
  assert.equal(loadLibrary(root).glossary.groups[0].terms[0].term, 'Lead');
}));

test('writeScriptPages writes <slug>.html beside each valid .md with the generator meta, idempotently', () => withTmp((root) => {
  writeFiles(root, { 'sales/scripts/sample-co.md': SAMPLE });
  const lib = loadLibrary(root);
  const first = writeScriptPages(lib, { rootDir: root, lang: 'en', company: 'Sample Co' });
  assert.deepEqual(first.written, ['sample-co']);
  const html = fs.readFileSync(path.join(root, 'sales/scripts/sample-co.html'), 'utf8');
  assert.match(html, /<meta name="generator" content="clc-brain">/);
  assert.deepEqual(writeScriptPages(lib, { rootDir: root, lang: 'en' }).written, ['sample-co']);
}));

test('writeScriptPages skips scripts with error diagnostics and reports {slug, reason}', () => withTmp((root) => {
  writeFiles(root, { 'sales/scripts/broken.md': BROKEN, 'sales/scripts/sample-co.md': SAMPLE });
  const res = writeScriptPages(loadLibrary(root), { rootDir: root, lang: 'en' });
  assert.deepEqual(res.written, ['sample-co']);
  assert.equal(res.skipped[0].slug, 'broken');
  assert.match(res.skipped[0].reason, /fix/i);
  assert.equal(fs.existsSync(path.join(root, 'sales/scripts/broken.html')), false);
}));

test('writeScriptPages never overwrites an html without the generator meta', () => withTmp((root) => {
  writeFiles(root, { 'sales/scripts/sample-co.md': SAMPLE, 'sales/scripts/sample-co.html': '<html>hand made</html>' });
  const res = writeScriptPages(loadLibrary(root), { rootDir: root, lang: 'en' });
  assert.deepEqual(res.written, []);
  assert.equal(res.skipped[0].slug, 'sample-co');
  assert.match(res.skipped[0].reason, /hand-made/);
  assert.equal(fs.readFileSync(path.join(root, 'sales/scripts/sample-co.html'), 'utf8'), '<html>hand made</html>');
}));

test('writeScriptPages skips symlinked targets and slugs outside the name pattern', () => withTmp((root) => {
  writeFiles(root, { 'sales/scripts/sample-co.md': SAMPLE, 'sales/scripts/Bad_Name.md': sampleAs('Bad_Name'), 'outside.html': 'keep' });
  fs.symlinkSync(path.join(root, 'outside.html'), path.join(root, 'sales/scripts/sample-co.html'));
  const res = writeScriptPages(loadLibrary(root), { rootDir: root, lang: 'en' });
  assert.deepEqual(res.written, []);
  assert.deepEqual(res.skipped.map((s) => s.slug).sort(), ['Bad_Name', 'sample-co']);
  assert.equal(fs.readFileSync(path.join(root, 'outside.html'), 'utf8'), 'keep');
}));

test('writeScriptPages with outDir writes the preview pages there and nothing in the brain', () => withTmp((root) => withTmp((out) => {
  writeFiles(root, { 'sales/scripts/sample-co.md': SAMPLE });
  const res = writeScriptPages(loadLibrary(root), { rootDir: root, outDir: out, lang: 'en' });
  assert.deepEqual(res.written, ['sample-co']);
  assert.ok(fs.existsSync(path.join(out, 'scripts/sample-co.html')));
  assert.equal(fs.existsSync(path.join(root, 'sales/scripts/sample-co.html')), false);
})));

test('the sales page scripts and glossary texts exist in en and es', async () => {
  const { t } = await import('../../src/core/i18n.js');
  for (const lang of ['en', 'es']) {
    for (const key of ['view.scripts.title', 'view.scripts.empty', 'view.scripts.open', 'view.scripts.needsFix', 'view.glossary.title']) {
      assert.notEqual(t(lang, key), key, `${lang} ${key}`);
    }
    assert.match(t(lang, 'view.scripts.conversations', { count: 2 }), /2/);
  }
});
