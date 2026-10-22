import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MOTIONS, dealKey, motionName, normalizeCompany, normalizeOutcome, parseBool, toSlug
} from '../../src/core/sales-normalize.js';

test('toSlug lowercases, collapses punctuation and trims', () => {
  assert.equal(toSlug('Trade Show!'), 'trade-show');
  assert.equal(toSlug('  Cold   Outbound__2 '), 'cold-outbound-2');
  assert.equal(toSlug('!!!'), '');
  assert.equal(toSlug(undefined), '');
});

test('normalizeCompany drops punctuation and legal suffixes (R1.5)', () => {
  assert.equal(normalizeCompany('Acme, Inc.'), 'acme');
  assert.equal(normalizeCompany('ACME inc'), 'acme');
  assert.equal(normalizeCompany('Globex S.A.'), 'globex');
  assert.equal(normalizeCompany('Initech GmbH'), 'initech');
  assert.equal(normalizeCompany('Hooli Corp Ltd'), 'hooli');
  assert.equal(normalizeCompany('Inc'), 'inc');
  assert.equal(normalizeCompany(null), '');
});

test('dealKey prefers deal_id and falls back to the normalized company (R1.5)', () => {
  assert.equal(dealKey({ company: 'Acme, Inc.' }), dealKey({ company: 'ACME inc' }));
  assert.notEqual(dealKey({ dealId: 'D-1', company: 'Acme' }), dealKey({ dealId: 'D-2', company: 'Acme' }));
  assert.equal(dealKey({ dealId: 'Deal 7', company: 'Acme' }), 'deal-7');
  assert.equal(dealKey({ company: 'Acme, Inc.' }), 'acme');
});

test('normalizeOutcome maps free text and never throws (R1.7)', () => {
  const cases = {
    'Closed Won': 'closed-won',
    'closed-lost': 'closed-lost',
    'Disqualified: no budget': 'disqualified',
    'Deal stalled after demo': 'stalled',
    'Advanced to validation': 'advanced',
    'Demo booked': 'unclassified'
  };
  for (const [text, expected] of Object.entries(cases)) assert.equal(normalizeOutcome(text), expected, text);
  assert.equal(normalizeOutcome(undefined), 'unclassified');
  assert.equal(normalizeOutcome(42), 'unclassified');
});

test('parseBool accepts booleans and true/false text only', () => {
  assert.equal(parseBool(true), true);
  assert.equal(parseBool('TRUE'), true);
  assert.equal(parseBool('false'), false);
  assert.equal(parseBool(false), false);
  assert.equal(parseBool('yes'), undefined);
  assert.equal(parseBool(undefined), undefined);
});

test('default motions and friendly names (R1.4)', () => {
  assert.deepEqual({ ...DEFAULT_MOTIONS }, {
    'cold-outbound': 'Cold outreach', inbound: 'Inbound', referral: 'Referral', expansion: 'Existing customers'
  });
  assert.equal(motionName('expansion'), 'Existing customers');
  assert.equal(motionName('partner'), 'Partner');
  assert.equal(motionName('trade-show'), 'Trade Show');
});

test('parseBranch maps per-industry branch values to the branch id and its industry', async () => {
  const { parseBranch } = await import('../../src/core/sales-normalize.js');
  assert.deepEqual(parseBranch('B1 · Retail'), { branch: 'B1', industry: 'Retail' });
  assert.deepEqual(parseBranch('B1·Retail'), { branch: 'B1', industry: 'Retail' });
  assert.deepEqual(parseBranch('b12 - turismo / hotelería'), { branch: 'B12', industry: 'turismo / hotelería' });
  assert.deepEqual(parseBranch(' b3 '), { branch: 'B3' });
  assert.deepEqual(parseBranch('B2'), { branch: 'B2' });
  assert.deepEqual(parseBranch('Objection'), { branch: 'Objection' });
  assert.deepEqual(parseBranch(''), { branch: '' });
  assert.deepEqual(parseBranch(undefined), { branch: '' });
});

test('normalizeOutcome understands Spanish outcomes, with or without accents', () => {
  const cases = {
    Ganado: 'closed-won',
    'cerrado-ganado': 'closed-won',
    'Cerrado ganado': 'closed-won',
    Perdido: 'closed-lost',
    'cerrado-perdido': 'closed-lost',
    Descalificado: 'disqualified',
    'Expediente cerrado': 'disqualified',
    Estancado: 'stalled',
    'Pendiente de respuesta': 'stalled',
    'Avanzó a diagnóstico': 'advanced',
    avanzo: 'advanced',
    'Avanza a demo': 'advanced',
    'Demo agendada': 'unclassified'
  };
  for (const [text, expected] of Object.entries(cases)) assert.equal(normalizeOutcome(text), expected, text);
});
