// The sales page and the stats text follow the brain language (org-kernel.json `language`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSalesView } from '../../src/core/sales-view.js';
import { buildSalesReport } from '../../src/core/sales-metrics.js';
import { renderDashboard } from '../../src/core/sales-dashboard.js';
import { formatSalesReport } from '../../src/core/sales-report-text.js';
import { motionName } from '../../src/core/sales-normalize.js';
import { initBrain } from '../../src/core/scaffold.js';
import { withTmp, writeFiles } from './helpers.js';

const NOW = new Date('2026-10-18T12:00:00Z');
const call = (i, extra = {}) => ({ relPath: `sales/calls/2026-10/c${i}.md`, date: '2026-10-05', month: '2026-10', rep: 'Ana', company: `Co${i}`, dealKey: `co${i}`, play: 'cold-call', branch: 'B1', motion: 'cold-outbound', outcome: 'advanced', goalMet: true, ...extra });
const play = (extra = {}) => ({ id: 'cold-call', title: 'Cold call', success: 'Books a meeting', successDefined: true, motions: ['cold-outbound'], firstStage: 1, branches: [{ id: 'B1', when: 'They say no budget' }], ...extra });
const report = (calls, extra = {}, lang = 'es') => buildSalesReport({ calls, wins: [], plays: [play()], stageNames: new Map([['1', 'Prospecting']]), skipped: [], demoExcluded: 0, ...extra }, { now: NOW, lang });
const visibleText = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

const callLog = (i, extra = '') => `---\nrep: "${i % 2 ? 'Ana' : 'Luis'}"\nprospect_company: "Co${i}"\ndate: "2026-10-0${i + 1}"\noutcome: "Advanced"\nplay: "cold-call"\nmotion: ${i % 2 ? 'referral' : 'cold-outbound'}\ngoal_met: ${i % 2 === 0}\n${extra}---\n\nNotes\n`;

function spanishBrain(dir) {
  initBrain(dir, { companyName: 'Acme', areas: ['sales'], language: 'es' });
  writeFiles(dir, Object.fromEntries([0, 1, 2].map((i) => [`sales/calls/2026-10/2026-10-0${i + 1}_c${i}.md`, callLog(i)])));
  writeFiles(dir, { 'sales/calls/2026-10/2026-10-09_old.md': '---\nrep: "Ana"\nprospect_company: "Old"\ndate: "2026-10-09"\noutcome: "Advanced"\n---\n' });
}

// English page chrome that must not show on a Spanish page (file content is the user's and may stay English).
const ENGLISH_CHROME = [
  'How it&#39;s going', 'How your sales system works', 'Your pipeline', 'Your call guides', 'What to say', 'Used in:',
  'Updated ', 'Sales system', 'By type of sale', 'By call guide', 'By person', 'Goal reached', 'Calls logged',
  'Success means', 'Success not defined yet', 'Not classified yet', 'too early to tell', '(so far)', 'How deals start',
  'Call guides:', 'Want a change?', 'Cold outreach', 'Referral', 'Comparison with the month before', 'Where calls miss their goal'
];

test('a Spanish brain gets a Spanish page: lang="es", Spanish labels and no English labels', () =>
  withTmp((dir) => {
    spanishBrain(dir);
    const { html } = buildSalesView(dir, { now: NOW });
    assert.match(html, /<html lang="es">/);
    for (const label of ['Cómo vamos', 'Cómo funciona tu sistema de ventas', 'Tus guías de llamada', 'Qué decir', 'Se usa en:',
      'Actualizado el 2026-10-18', 'Sistema de ventas', 'Por tipo de venta', 'Por guía de llamada', 'Por persona', 'Objetivo cumplido',
      'Octubre de 2026 (en lo que va del mes)', 'Septiembre de 2026', 'Venta en frío', 'Referidos', 'Sin clasificar todavía',
      'Pide a tu asistente que clasifique', 'todavía es pronto para sacar conclusiones', 'Cómo empiezan los negocios']) {
      assert.ok(html.includes(label), `missing Spanish label: ${label}`);
    }
    for (const label of ENGLISH_CHROME) assert.ok(!html.includes(label), `English label on a Spanish page: ${label}`);
  }));

test('the Spanish page stays offline and free of jargon in both languages', () =>
  withTmp((dir) => {
    spanishBrain(dir);
    const { html } = buildSalesView(dir, { now: NOW });
    assert.doesNotMatch(html, /<script|<link\b|<img\b|https?:\/\//i);
    const text = visibleText(renderDashboard(report([call(1), call(2, { goalMet: false })])));
    for (const jargon of [/\bgates?\b/i, /\bmotions?\b/i, /\bplays?\b/i, /\bpipeline\b/i, /goal_met|gate_advanced|cold-outbound/]) {
      assert.doesNotMatch(text, jargon);
    }
  }));

test('an English brain (or an old brain without a language) keeps the English page', () =>
  withTmp((dir) => {
    initBrain(dir, { companyName: 'Acme', areas: ['sales'] });
    const { html } = buildSalesView(dir, { now: NOW });
    assert.match(html, /<html lang="en">/);
    assert.match(html, /How it&#39;s going/);
    assert.ok(!html.includes('Cómo vamos'));
  }));

test('drafts, the preview title and the fallback step list are in Spanish too', () =>
  withTmp((dir) => {
    spanishBrain(dir);
    writeFiles(dir, {
      'sales/plays/broken.md': [
        '---', 'play: broken', 'stages: 1', 'goal: Test', 'version: 1', 'status: active', '---', '# Play: Guía rota', '',
        '## Decision Tree', '', '```mermaid', 'flowchart TD', '    A["Saludar"] -->|"Interesado"| B["Agendar"]', '    A --> C[[unclosed', '```', ''
      ].join('\n')
    });
    const draft = ['---', 'play: cold-call', 'stages: 1', 'goal: Meta', 'version: 2', '---', '# Play: Llamada en frío', '', '```mermaid', 'flowchart TD\nA["Hola"] --> B["Chau"]', '```', ''].join('\n');
    const { html } = buildSalesView(dir, { now: NOW, drafts: [{ kind: 'play', path: 'd.md', content: draft }] });
    assert.match(html, /<h1>[^<]*\(Vista previa\)/);
    assert.ok(html.includes('Borrador: todavía no se guardó'));
    assert.ok(html.includes('Esta es una vista previa'));
    assert.match(html, /Si Interesado[^<]*→[^<]*Agendar/);
    assert.ok(html.includes('Versión 2'));
    assert.ok(html.includes('Objetivo:'));
    assert.ok(!html.includes('Draft — not saved yet') && !html.includes('(Preview)'));
  }));

test('Spanish dashboard: counts, percentages, success lines and comparison wording', () => {
  const out = renderDashboard(report([call(1), call(2, { goalMet: false }), call(3, { rep: 'Ben' }), call(4), call(5), call(6)]));
  assert.match(out, /5 de 6 llamadas \(83\s?%, todavía es pronto para sacar conclusiones\)/u);
  assert.match(out, /Éxito significa: Books a meeting/);
  assert.match(out, /Dónde no se cumple el objetivo/);
  assert.match(out, /They say no budget: 1 vez/);
  assert.match(out, /Comparación con el mes anterior: todavía es pronto para sacar conclusiones/);
  const undefinedSuccess = renderDashboard(report([call(1)], { plays: [play({ successDefined: false, success: 'Book' })] }));
  assert.match(undefinedSuccess, /Éxito sin definir todavía \(el objetivo es: Book\)/);
  const many = Array.from({ length: 10 }, (_, i) => call(i, { date: '2026-09-05', month: '2026-09', relPath: `s${i}` }));
  const compared = renderDashboard(report([...many, ...Array.from({ length: 12 }, (_, i) => call(i + 20))]));
  assert.match(compared, /Comparado con septiembre de 2026: 2 llamadas más/);
});

test('Spanish stats text and the report says which language it uses', () => {
  const r = report([call(1), call(2, { rep: 'Ben', goalMet: false }), call(3, { motion: undefined, play: '' })]);
  assert.equal(r.language, 'es');
  assert.equal(buildSalesReport({ calls: [], wins: [], plays: [] }, { now: NOW }).language, 'en', 'English by default');
  const out = formatSalesReport(r);
  for (const label of ['Octubre de 2026 (en lo que va del mes)', 'Llamadas registradas: 3', 'Por tipo de venta', 'Venta en frío', 'Por persona',
    'objetivo cumplido 1 de 2 llamadas', 'Sin clasificar todavía', 'Sin guía de llamada', 'Todavía no hay llamadas registradas.']) {
    assert.ok(out.includes(label), `missing: ${label}\n${out}`);
  }
  for (const label of ['so far', 'By type of sale', 'By person', 'goal reached', 'Calls logged', 'Not tied to a call guide']) {
    assert.ok(!out.includes(label), `English in Spanish stats: ${label}`);
  }
});

test('default type-of-sale names have Spanish versions; unknown ones are title-cased', () => {
  assert.deepEqual(['cold-outbound', 'inbound', 'referral', 'expansion', 'partner'].map((m) => motionName(m, 'es')),
    ['Venta en frío', 'Inbound', 'Referidos', 'Clientes actuales', 'Socios']);
  assert.equal(motionName('referral'), 'Referral');
  assert.equal(motionName('trade-show', 'es'), 'Trade Show');
  assert.equal(motionName('constructor', 'es'), 'Constructor');
});
