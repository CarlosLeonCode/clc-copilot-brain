// The docs describe scripts and the glossary: plain mention in both READMEs, grammar and doctor checks in TECHNICAL, ADR 0008.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const ADR = 'docs/Journal/0008-sales-scripts-and-glossary.md';

test('README.md says in plain words that the assistant writes scripts for any industry and keeps a glossary', () => {
  const text = read('README.md');
  assert.match(text, /Write me a script for restaurants/);
  assert.match(text, /What does .+ mean\?/);
  assert.match(text, /\| `\/script` \|/);
  assert.match(text, /any industry/i);
});

test('README.es.md says it in Spanish', () => {
  const text = read('README.es.md');
  assert.match(text, /Hazme un guion para restaurantes/);
  assert.match(text, /¿Qué significa .+\?/);
  assert.match(text, /\| `\/script` \|/);
  assert.match(text, /cualquier industria/i);
});

test('TECHNICAL.md documents modules, the grammar contract, the glossary format, view behavior and doctor checks', () => {
  const text = read('TECHNICAL.md');
  for (const needle of ['sales-scripts.js', 'sales-glossary.js', 'script-view.js', 'sales-library.js', '`when:`', '`detail:`', 'generator',
    'view --draft', 'checkSalesLibrary', 'LEGACY_STARTER_SCRIPT_HASHES', '0008-sales-scripts-and-glossary.md', '#### ']) {
    assert.ok(text.includes(needle), `TECHNICAL.md mentions ${needle}`);
  }
  assert.match(text, /glossary/i);
});

test('ADR 0008 has the standard sections and records the key decisions', () => {
  const text = read(ADR);
  for (const heading of ['## Context', '## Decision', '## Consequences']) assert.ok(text.includes(heading), heading);
  for (const needle of ['method', 'generator', 'glossary', 'legacy', 'English']) assert.match(text, new RegExp(needle, 'i'), needle);
});
