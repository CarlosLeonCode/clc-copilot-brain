import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupTerm, parseGlossary } from '../../src/core/sales-glossary.js';

const SAMPLE = `# Sample glossary

## Prospecting

| Term | Meaning | Example |
|---|---|---|
| **Lead** | A person who may buy | "A new lead came in" |
| **Cold call** | A call to someone who did not ask | Calling a list |

## Closing

| Término | Significado | Ejemplo |
|---|---|---|
| **Próximo paso** | What happens after the call | Book a demo |
`;

test('parses groups with 3-column tables by column position into term/meaning/example; term bold stripped', () => {
  const g = parseGlossary(SAMPLE);
  assert.deepEqual(g.diagnostics, []);
  assert.equal(g.title, 'Sample glossary');
  assert.deepEqual(g.groups.map((x) => x.name), ['Prospecting', 'Closing']);
  assert.deepEqual(g.groups[0].headers, ['Term', 'Meaning', 'Example']);
  assert.deepEqual(g.groups[1].headers, ['Término', 'Significado', 'Ejemplo']);
  assert.deepEqual(g.groups[0].terms[0], { term: 'Lead', meaning: 'A person who may buy', example: '"A new lead came in"' });
  assert.equal(g.groups[0].terms.length, 2);
});

test('missing or empty text gives an empty result without throwing', () => {
  for (const input of [undefined, null, '', '  \n']) {
    assert.deepEqual(parseGlossary(input), { title: '', groups: [], diagnostics: [] });
  }
});

test('an empty group is fine', () => {
  const g = parseGlossary('# G\n\n## Empty\n\n## Other\n\n| A | B | C |\n|---|---|---|\n| **x** | y | z |\n');
  assert.deepEqual(g.diagnostics, []);
  assert.equal(g.groups[0].terms.length, 0);
  assert.equal(g.groups[1].terms.length, 1);
});

test('a row with the wrong column count adds a diagnostic with its line and is skipped', () => {
  const g = parseGlossary('# G\n## A\n| T | M | E |\n|---|---|---|\n| **x** | only two |\n| **y** | m | e |\n');
  assert.equal(g.diagnostics.length, 1);
  assert.equal(g.diagnostics[0].line, 5);
  assert.equal(g.diagnostics[0].level, 'warning');
  assert.deepEqual(g.groups[0].terms.map((t) => t.term), ['y']);
});

test('CRLF input parses the same as LF', () => {
  assert.deepEqual(parseGlossary(SAMPLE.replace(/\n/g, '\r\n')), parseGlossary(SAMPLE));
});

test('lookupTerm is case and accent insensitive; a missing term gives null', () => {
  const g = parseGlossary(SAMPLE);
  assert.equal(lookupTerm(g, 'LEAD').meaning, 'A person who may buy');
  assert.equal(lookupTerm(g, 'proximo paso').term, 'Próximo paso');
  assert.equal(lookupTerm(g, 'nothing'), null);
  assert.equal(lookupTerm(null, 'lead'), null);
});
