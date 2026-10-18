// Every starter sales file shipped in English has a Spanish overlay with the same structure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, readPlayMeta, validatePlay } from '../src/core/plays.js';
import { parseFlowchart } from '../src/core/flowchart.js';
import { plainSystemSection, stageNames } from '../src/core/sales-stages.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EN = path.join(ROOT, 'templates', 'areas', 'sales');
const ES = path.join(ROOT, 'templates', 'locales', 'es', 'areas', 'sales');
const STARTER = ['system.md', 'stages/pipeline-stages.md'];
const PLAYS = fs.readdirSync(path.join(EN, 'plays')).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
const MERMAID = /```mermaid\r?\n([\s\S]*?)```/;
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const branchIds = (text) => readPlayMeta('x.md', text).branches.map((b) => b.id);
const ENGLISH_WORDS = /\b(the|and|with|your|when|what|call|deal|meeting|step|before|after|ask|guide)\b/i;

test('every English starter sales file has a Spanish overlay with the same name', () => {
  for (const rel of [...STARTER, ...PLAYS.map((p) => `plays/${p}`)]) {
    assert.ok(fs.existsSync(path.join(ES, rel)), `missing templates/locales/es/areas/sales/${rel}`);
  }
  const esPlays = fs.readdirSync(path.join(ES, 'plays')).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(esPlays, PLAYS, 'no extra Spanish plays');
});

test('Spanish plays keep ids, stages, motions, version, status and branch IDs, and are valid', () => {
  for (const file of PLAYS) {
    const en = read(EN, `plays/${file}`);
    const es = read(ES, `plays/${file}`);
    const fmEn = parseFrontmatter(en);
    const fmEs = parseFrontmatter(es);
    assert.deepEqual(Object.keys(fmEs), Object.keys(fmEn), `${file}: same frontmatter keys`);
    for (const key of ['play', 'stages', 'motions', 'version', 'status']) assert.equal(fmEs[key], fmEn[key], `${file}: ${key}`);
    for (const key of ['goal', 'success', 'gate_unlocked']) assert.notEqual(fmEs[key], fmEn[key], `${file}: ${key} is translated`);
    assert.deepEqual(validatePlay(file, es), [], file);
    assert.ok(readPlayMeta(file, es).successDefined, `${file}: success defined`);
    assert.deepEqual(branchIds(es), branchIds(en), `${file}: same branch IDs`);
    const graphEn = parseFlowchart(MERMAID.exec(en)[1]);
    const graphEs = parseFlowchart(MERMAID.exec(es)[1]);
    assert.deepEqual(graphEs.nodes.map((n) => n.id), graphEn.nodes.map((n) => n.id), `${file}: same diagram nodes`);
    assert.deepEqual(graphEs.edges.map((e) => `${e.from}>${e.to}`), graphEn.edges.map((e) => `${e.from}>${e.to}`), `${file}: same diagram edges`);
    for (const link of en.match(/\]\(\.\.?\/[^)]+\)/g)) assert.ok(es.includes(link), `${file}: keeps link ${link}`);
    assert.match(es, /^# Guía: /m, `${file}: Spanish title`);
    assert.doesNotMatch(readPlayMeta(file, es).title, ENGLISH_WORDS, `${file}: title is Spanish`);
  }
});

test('the Spanish pipeline draws, and the Spanish map links every play and names stages 1 to 5', () => {
  const pipeline = read(ES, 'stages/pipeline-stages.md');
  const graph = parseFlowchart(MERMAID.exec(pipeline)[1]);
  assert.deepEqual(graph.nodes.map((n) => n.id), ['S1', 'S2', 'S3', 'S4', 'S5']);
  const system = read(ES, 'system.md');
  for (const file of PLAYS) assert.ok(system.includes(`(./plays/${file})`), `system.md links ${file}`);
  const names = stageNames(system);
  assert.deepEqual([...names.keys()], ['1', '2', '3', '4', '5']);
  assert.deepEqual([...names.values()], ['Descubrimiento', 'Validación', 'Propuesta', 'Negociación', 'Cierre']);
  for (const [n, name] of names) {
    assert.ok(pipeline.includes(`"${n}. ${name}<br>`), `pipeline diagram uses the stage name ${name}`);
    assert.match(system, new RegExp(`^${n}\\. \\*\\*${name}\\*\\*`, 'm'), `plain list uses the stage name ${name}`);
  }
  assert.ok(system.includes('(./stages/pipeline-stages.md)'), 'map links the pipeline');
});

test('the Spanish plain section is in plain Spanish, without English leftovers or jargon', () => {
  const plain = plainSystemSection(read(ES, 'system.md'));
  assert.ok(plain.trim().length > 200, 'plain section found');
  assert.match(plain, /antes de cada llamada/i);
  assert.match(plain, /después de cada llamada/i);
  assert.match(plain, /una vez al mes/i);
  assert.doesNotMatch(plain, ENGLISH_WORDS);
  assert.doesNotMatch(plain, /\bgates?\b|\bplays?\b|stages:|`|\|/i);
  assert.doesNotMatch(plain, /\b(vos|tenés|querés|podés|pedile|contale)\b/i, 'neutral Spanish, no voseo');
});
