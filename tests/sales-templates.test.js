// The sales templates ship the METHOD, not content: no starter scripts or glossary, optional Guion links,
// a plain-language system map with an empty "Scripts, glossary and industry packs" section (English and Spanish).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from '../src/core/sales-scripts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALES = { en: 'templates/areas/sales', es: 'templates/locales/es/areas/sales' };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const PLAYS = ['cold-call', 'discovery-call', 'demo-call', 'follow-up'];

test('the off-topic starter scripts do not ship and nothing else references them', () => {
  for (const name of ['cold-outreach-email.md', 'discovery-call-framework.md']) {
    assert.equal(exists(`${SALES.en}/scripts/${name}`), false, name);
    assert.equal(exists(`${SALES.es}/scripts/${name}`), false, `es ${name}`);
  }
  for (const lang of ['en', 'es']) {
    const files = [`${SALES[lang]}/system.md`, `${SALES[lang]}/stages/pipeline-stages.md`, ...PLAYS.map((p) => `${SALES[lang]}/plays/${p}.md`)];
    for (const rel of files) assert.doesNotMatch(read(rel), /cold-outreach-email|discovery-call-framework/, rel);
  }
  assert.doesNotMatch(read(`${SALES.en}/README.md`), /outreach, discovery call questions/i);
});

test('scripts/README.md explains the folder briefly in English and Spanish and is not a script', () => {
  for (const lang of ['en', 'es']) {
    const text = read(`${SALES[lang]}/scripts/README.md`);
    assert.ok(text.split('\n').length <= 30, `${lang} README stays short`);
    assert.match(text, lang === 'en' ? /Make me a script for/ : /Hazme un guion para/);
    assert.match(text, /clc-brain view/);
    assert.doesNotMatch(text, /^script:/m, 'a README is not a script (the loader ignores it)');
    assert.equal(parseScript(text).diagnostics.some((d) => d.level === 'error'), true);
  }
});

test('plays keep the Guion column but ship it empty, and drop script links in the Related line', () => {
  for (const lang of ['en', 'es']) {
    for (const play of PLAYS) {
      const text = read(`${SALES[lang]}/plays/${play}.md`);
      assert.doesNotMatch(text, /\.\.\/scripts\//, `${lang}/${play}`);
      const rows = text.split('\n').filter((l) => /^\| B\d+ \|/.test(l));
      assert.ok(rows.length >= 6);
      for (const row of rows) assert.match(row, /\| — \|$/, `${lang}/${play}: ${row.slice(0, 30)}`);
    }
  }
});

test('system.md: the part people read is plain, and the AI part has an empty scripts section (en, es)', () => {
  const marks = { en: ['## For your AI assistant', 'Scripts, glossary and industry packs'], es: ['## Para tu asistente de IA', 'Guiones, glosario y paquetes por industria'] };
  for (const lang of ['en', 'es']) {
    const text = read(`${SALES[lang]}/system.md`);
    const [plain, ai] = text.split(marks[lang][0]);
    assert.ok(ai, `${lang}: AI section exists`);
    assert.doesNotMatch(plain, /`|\||\bgates?\b|\bplays?\b|\bpuertas?\b|\bHITL\b|\.md\b/i, `${lang}: plain part has no code, tables or jargon`);
    assert.match(plain, lang === 'en' ? /Make me a script for/ : /Hazme un guion para/);
    assert.match(plain, lang === 'en' ? /What does .* mean\?/ : /¿Qué significa .*\?/);
    assert.ok(ai.includes(`### ${marks[lang][1]}`), `${lang}: section heading`);
    const section = ai.slice(ai.indexOf(`### ${marks[lang][1]}`));
    assert.match(section, /\.agents\/skills\/script\/SKILL\.md/);
    assert.match(section, /sales\/scripts\/<slug>\.md/);
    assert.match(section, /sales\/glossary\.md/);
    assert.doesNotMatch(section, /\]\(\.\/scripts\/|\]\(\.\/glossary/, `${lang}: nothing to link yet`);
    const tableRows = section.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*:?-/.test(l));
    assert.equal(tableRows.length, 2, `${lang}: two empty tables, one header row each`);
  }
});

test('the sales README describes the scripts folder as the home of generated script sets', () => {
  assert.match(read(`${SALES.en}/README.md`), /\[scripts\/\]\(\.\/scripts\/\)[^\n]*\.agents\/skills\/script|\[scripts\/\]\(\.\/scripts\/\)[^\n]*script sets/i);
});
