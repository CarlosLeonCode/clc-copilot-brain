// `clc-brain` with no command shows where you are and the one next step, in plain words (subprocess, locale controlled).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initBrain } from '../src/core/scaffold.js';
import { DICTIONARIES } from '../src/core/i18n.js';

const CLI = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'bin', 'cli.js');

function run(cwd, lang, ...args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', input: '', env: { ...process.env, LC_ALL: '', LANG: lang, NO_COLOR: '1' } });
}

function withDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-start-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function markDone(brain) {
  const file = path.join(brain, 'org-kernel.json');
  const kernel = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify({ ...kernel, setup: { completed: true, completedAt: '2026-10-19T10:00:00.000Z' } }, null, 2));
}

test('outside a brain, in English: how to create one, then open it in the assistant', () => withDir((dir) => {
  const { stdout, status } = run(dir, 'en_US.UTF-8');
  assert.equal(status, 0);
  assert.match(stdout, /not a Second Brain yet/i);
  assert.match(stdout, /clc-brain init <folder>/);
  assert.match(stdout, /--language es/);
  assert.match(stdout, /"Let's set up my brain"/);
  assert.match(stdout, /All commands: clc-brain --help/);
  assert.doesNotMatch(stdout, /INIT OPTIONS/, 'the full help is not shown');
}));

test('outside a brain, with a Spanish computer: the same guidance in Spanish', () => withDir((dir) => {
  const { stdout, status } = run(dir, 'es_ES.UTF-8');
  assert.equal(status, 0);
  assert.match(stdout, /clc-brain init <carpeta>/);
  assert.match(stdout, /--language es/);
  assert.match(stdout, /"Configuremos mi cerebro"/);
  assert.match(stdout, /Todos los comandos: clc-brain --help/);
}));

test('inside a brain that is not set up: name, language, state and the one next step', () => withDir((dir) => {
  const brain = path.join(dir, 'acme');
  initBrain(brain, { companyName: 'Acme', areas: ['sales'] });
  const { stdout, status } = run(brain, 'es_ES.UTF-8');
  assert.equal(status, 0, 'the brain language wins over the computer language');
  assert.match(stdout, /Acme/);
  assert.match(stdout, /English/);
  assert.match(stdout, /not set up yet/i);
  assert.match(stdout, /Open this folder in your AI assistant \(Claude Code, Codex, Antigravity, Cursor/);
  assert.match(stdout, /"Let's set up my brain"/);
  assert.match(stdout, /All commands: clc-brain --help/);
}));

test('inside a Spanish brain that is set up: three things to say and how to see the sales page', () => withDir((dir) => {
  const brain = path.join(dir, 'acme');
  initBrain(brain, { companyName: 'Acme', areas: ['sales'], language: 'es' });
  markDone(brain);
  const { stdout, status } = run(brain, 'en_US.UTF-8');
  assert.equal(status, 0);
  assert.match(stdout, /Español/);
  assert.match(stdout, /"Registra esta llamada"/);
  assert.match(stdout, /"¿Cómo vamos\?"/);
  assert.match(stdout, /"Muéstrame mi proceso de ventas"/);
  assert.match(stdout, /clc-brain view --open/);
  assert.doesNotMatch(stdout, /Configuremos mi cerebro/);
  assert.match(stdout, /Todos los comandos: clc-brain --help/);
}));

test('a folder passed instead of a command shows the start screen for that folder', () => withDir((dir) => {
  const brain = path.join(dir, 'acme');
  initBrain(brain, { companyName: 'Acme', areas: ['sales'] });
  markDone(brain);
  const { stdout, status } = run(dir, 'en_US.UTF-8', brain);
  assert.equal(status, 0);
  assert.match(stdout, /"How are we doing\?"/);
  assert.match(stdout, /"Log this call"/);
  assert.match(stdout, /"Show me my sales process"/);
}));

test('help, -h and --help still show the full help', () => withDir((dir) => {
  for (const flag of ['help', '-h', '--help']) {
    const { stdout, status } = run(dir, 'en_US.UTF-8', flag);
    assert.equal(status, 0);
    assert.match(stdout, /INIT OPTIONS/, flag);
  }
}));

test('every start screen and init text has a Spanish version', () => {
  const keys = Object.keys(DICTIONARIES.en).filter((k) => k.startsWith('start.') || k.startsWith('init.'));
  assert.ok(keys.length > 10);
  for (const key of keys) assert.ok(Object.hasOwn(DICTIONARIES.es, key), `missing Spanish text for ${key}`);
});
