// Spanish starter content uses Spanish headings: the parsers must read them like the English ones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPlayMeta } from '../../src/core/plays.js';
import { plainSystemSection, section, stageNames } from '../../src/core/sales-stages.js';
import { buildSalesView } from '../../src/core/sales-view.js';
import { runDoctor } from '../../src/core/doctor.js';
import { withTmp, writeFiles } from './helpers.js';

const ES_PLAY = `---
play: cold-call
stages: 1
goal: Conseguir una reunión de descubrimiento
gate_unlocked: Entrada a la etapa 1
version: 1
status: active
motions: cold-outbound
success: Reunión agendada
---
# Guía: Llamada en frío

## Árbol de decisiones

\`\`\`mermaid
flowchart TD
    B1{"¿Le interesa?"} -->|"Sí"| B2["Pedir la reunión"]
\`\`\`

## Situaciones

| Situación | Cuándo pasa | Qué decir | Guion |
| :--- | :--- | :--- | :--- |
| B1 | El cliente contesta | "¿Te pillo en mal momento?" | [Guion](../scripts/x.md) |
| B2 | Hay interés | "¿Te va bien la próxima semana?" | [Guion](../scripts/x.md) |

## Registro de aprendizajes

<!-- Formato: - AAAA-MM-DD vN->vN+1: cambio (evidencia: CALL-...) -->
- Todavía no hay entradas. \`/retro\` propone cambios aquí.
- 2026-10-01 v1->v2: pregunta de apertura más corta
`;

const ES_SYSTEM = `# Mapa del sistema de ventas

## Cómo funciona tu sistema de ventas

Cada negocio pasa por los mismos cinco pasos:

1. **Descubrimiento**: entender qué le duele.

¿Quieres verlo? Pide a tu asistente: "Muéstrame mi proceso de ventas".

---

## Para tu asistente de IA

| Etapa | Criterio de salida | Guías |
| :--- | :--- | :--- |
| 1. Descubrimiento | Puerta 1 | [cold-call](./plays/cold-call.md) |
`;

test('readPlayMeta reads the Spanish title prefix and the "Situaciones" branch table', () => {
  const meta = readPlayMeta('cold-call.md', ES_PLAY);
  assert.equal(meta.title, 'Llamada en frío');
  assert.deepEqual(meta.branches, [{ id: 'B1', when: 'El cliente contesta' }, { id: 'B2', when: 'Hay interés' }]);
  assert.equal(meta.success, 'Reunión agendada');
});

test('section() accepts a list of headings and the Spanish plain section is found', () => {
  assert.match(section(ES_PLAY, ['Branches', 'Situaciones']), /\| B1 \|/);
  const plain = plainSystemSection(ES_SYSTEM);
  assert.match(plain, /Descubrimiento/);
  assert.doesNotMatch(plain, /Quieres verlo/, 'the hint pointing at the page itself is dropped');
  assert.doesNotMatch(plain, /Para tu asistente/);
  assert.equal(stageNames(ES_SYSTEM).get('1'), 'Descubrimiento');
});

test('the sales page shows Spanish talk tracks and learnings, without the empty-log placeholder', () =>
  withTmp((dir) => {
    writeFiles(dir, {
      'org-kernel.json': JSON.stringify({ organization: { name: 'Acme' }, language: 'es' }),
      'sales/system.md': ES_SYSTEM,
      'sales/plays/cold-call.md': ES_PLAY
    });
    const { html, plays } = buildSalesView(dir);
    assert.equal(plays[0].title, 'Llamada en frío');
    assert.match(html, /<h3>Llamada en frío<\/h3>/);
    assert.ok(html.includes('El cliente contesta') && html.includes('¿Te pillo en mal momento?'), 'talk tracks shown');
    assert.ok(html.includes('pregunta de apertura más corta'), 'learnings shown');
    assert.doesNotMatch(html, /Todavía no hay entradas/);
    assert.match(html, /Cada negocio pasa por los mismos cinco pasos/);
  }));

test('doctor names a Spanish guide by its heading without the "Guía:" prefix', () =>
  withTmp((dir) => {
    writeFiles(dir, {
      'org-kernel.json': JSON.stringify({ organization: { name: 'Acme' }, activeAreas: ['sales'], language: 'es' }),
      'sales/system.md': ES_SYSTEM,
      'sales/plays/cold-call.md': ES_PLAY.replace(/```mermaid[\s\S]*?```/, '')
    });
    const messages = runDoctor(dir).issues.map((i) => i.message);
    assert.ok(messages.includes('The llamada en frío guide has no diagram; ask your assistant to draw one.'), messages.join('\n'));
  }));
