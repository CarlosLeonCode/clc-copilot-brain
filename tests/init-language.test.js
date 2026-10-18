// CLI tests for the brain language chosen at `init` (subprocess, locale controlled through env).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'bin', 'cli.js');

function initWith(env, ...flags) {
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-lang-'));
  const brain = path.join(outer, 'brain');
  const res = spawnSync(process.execPath, [CLI, 'init', brain, '--yes', '--clean', '--areas', 'sales', ...flags], {
    encoding: 'utf8',
    input: '',
    env: { ...process.env, LC_ALL: '', LANG: '', ...env }
  });
  const kernelPath = path.join(brain, 'org-kernel.json');
  const kernel = fs.existsSync(kernelPath) ? JSON.parse(fs.readFileSync(kernelPath, 'utf8')) : null;
  fs.rmSync(outer, { recursive: true, force: true });
  return { res, kernel };
}

test('init --language es stores Spanish in org-kernel.json', () => {
  const { res, kernel } = initWith({ LANG: 'en_US.UTF-8' }, '--language', 'es');
  assert.equal(res.status, 0, res.stderr);
  assert.equal(kernel.language, 'es');
});

test('init --yes uses the language of the computer: Spanish locale gives es, others en', () => {
  assert.equal(initWith({ LANG: 'es_MX.UTF-8' }).kernel.language, 'es');
  assert.equal(initWith({ LANG: 'en_GB.UTF-8' }).kernel.language, 'en');
  assert.equal(initWith({}).kernel.language, 'en');
});

test('init with an unknown --language exits 1 with a plain message and writes nothing', () => {
  for (const bad of [['--language', 'fr'], ['--language']]) {
    const { res, kernel } = initWith({}, ...bad);
    assert.equal(res.status, 1, bad.join(' '));
    assert.match(res.stdout + res.stderr, /"en" \(English\) or "es" \(Spanish\)/);
    assert.equal(kernel, null);
  }
});

test('init --language es writes Spanish starter guides and a Spanish sales page; English stays English', () => {
  const pages = {};
  for (const lang of ['es', 'en']) {
    const outer = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-lang-'));
    const brain = path.join(outer, 'brain');
    try {
      const res = spawnSync(process.execPath, [CLI, 'init', brain, '--yes', '--areas', 'sales', '--language', lang], { encoding: 'utf8', input: '' });
      assert.equal(res.status, 0, res.stderr);
      pages[lang] = {
        system: fs.readFileSync(path.join(brain, 'sales', 'system.md'), 'utf8'),
        play: fs.readFileSync(path.join(brain, 'sales', 'plays', 'cold-call.md'), 'utf8'),
        html: fs.readFileSync(path.join(brain, 'sales', 'sales-system.html'), 'utf8')
      };
    } finally {
      fs.rmSync(outer, { recursive: true, force: true });
    }
  }
  assert.match(pages.es.system, /## Cómo funciona tu sistema de ventas/);
  assert.match(pages.es.play, /^# Guía: Llamada en frío$/m);
  assert.match(pages.es.html, /<h3>Llamada en frío<\/h3>/);
  assert.match(pages.es.html, /Conseguir una reunión de descubrimiento/);
  assert.match(pages.en.system, /## How your sales system works/);
  assert.match(pages.en.html, /<h3>Cold Call<\/h3>/);
});
