import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatMonth, formatPercent, t } from '../../src/core/i18n.js';
import { DEFAULT_LANGUAGE, detectLanguage, getBrainLanguage, parseLanguage } from '../../src/core/brain-language.js';
import { initBrain } from '../../src/core/scaffold.js';
import { BrainError } from '../../src/core/errors.js';
import { withTmp, writeFiles } from './helpers.js';

test('t returns the text in the asked language and fills in values', () => {
  assert.equal(t('en', 'view.pipeline.title'), 'Your pipeline');
  assert.equal(t('es', 'view.pipeline.title'), 'Tu proceso de venta');
  assert.equal(t('en', 'view.updated', { date: '2026-10-18' }), 'Updated 2026-10-18');
  assert.equal(t('es', 'view.updated', { date: '2026-10-18' }), 'Actualizado el 2026-10-18');
});

test('t picks singular or plural from the count', () => {
  assert.equal(t('en', 'count.calls', { count: 1 }), '1 call');
  assert.equal(t('en', 'count.calls', { count: 3 }), '3 calls');
  assert.equal(t('es', 'count.calls', { count: 1 }), '1 llamada');
  assert.equal(t('es', 'count.calls', { count: 3 }), '3 llamadas');
});

test('a key missing in Spanish falls back to English, and an unknown language uses English', () => {
  const dict = { en: { only: 'English only' }, es: {} };
  assert.equal(t('es', 'only', {}, dict), 'English only');
  assert.equal(t('fr', 'view.pipeline.title'), 'Your pipeline');
  assert.equal(t('es', 'no.such.key'), 'no.such.key');
});

test('formatMonth writes the month name in the brain language, first letter in capitals', () => {
  assert.equal(formatMonth('en', '2026-10'), 'October 2026');
  assert.equal(formatMonth('es', '2026-10'), 'Octubre de 2026');
  assert.equal(formatMonth('es', '2027-01'), 'Enero de 2027');
});

test('formatPercent rounds to a whole number', () => {
  assert.equal(formatPercent('en', 0.834), '83%');
  assert.match(formatPercent('es', 0.5), /^50\s?%$/u);
});

test('parseLanguage accepts en and es only', () => {
  assert.equal(parseLanguage('es'), 'es');
  assert.equal(parseLanguage(' EN '), 'en');
  for (const bad of ['fr', '', true, undefined, null, 'spanish']) assert.equal(parseLanguage(bad), null);
});

test('detectLanguage reads LC_ALL then LANG: Spanish locales give es, anything else en', () => {
  assert.equal(detectLanguage({ LANG: 'es_AR.UTF-8' }), 'es');
  assert.equal(detectLanguage({ LC_ALL: 'es_ES.UTF-8', LANG: 'en_US.UTF-8' }), 'es');
  assert.equal(detectLanguage({ LC_ALL: 'en_US.UTF-8', LANG: 'es_ES.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LANG: 'C' }), 'en');
  assert.equal(detectLanguage({}), 'en');
  assert.equal(DEFAULT_LANGUAGE, 'en');
});

test('getBrainLanguage reads org-kernel.json and defaults to English when missing or invalid', () =>
  withTmp((dir) => {
    assert.equal(getBrainLanguage(dir), 'en', 'no org-kernel.json');
    writeFiles(dir, { 'org-kernel.json': '{ not json' });
    assert.equal(getBrainLanguage(dir), 'en', 'broken json');
    writeFiles(dir, { 'org-kernel.json': JSON.stringify({ organization: { name: 'A' } }) });
    assert.equal(getBrainLanguage(dir), 'en', 'old brain without language');
    writeFiles(dir, { 'org-kernel.json': JSON.stringify({ language: 'klingon' }) });
    assert.equal(getBrainLanguage(dir), 'en', 'unknown language');
    writeFiles(dir, { 'org-kernel.json': JSON.stringify({ language: 'es' }) });
    assert.equal(getBrainLanguage(dir), 'es');
  }));

test('initBrain writes the chosen language to org-kernel.json (English by default)', () =>
  withTmp((dir) => {
    initBrain(path.join(dir, 'es'), { areas: ['sales'], language: 'es' });
    initBrain(path.join(dir, 'en'), { areas: ['sales'] });
    const kernel = (b) => JSON.parse(fs.readFileSync(path.join(dir, b, 'org-kernel.json'), 'utf8'));
    assert.equal(kernel('es').language, 'es');
    assert.equal(kernel('en').language, 'en');
    assert.equal(getBrainLanguage(path.join(dir, 'es')), 'es');
  }));

test('initBrain rejects an unknown language with a plain error', () =>
  withTmp((dir) => {
    assert.throws(() => initBrain(dir, { areas: ['sales'], language: 'fr' }), (err) => err instanceof BrainError && /English|Spanish/.test(err.message));
  }));
