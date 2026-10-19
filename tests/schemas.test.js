import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { validateAgainstSchema } from '../src/core/schema-validator.js';

const PKG_DIR = path.resolve('.');

// Helper to load JSON
function loadJson(relPath) {
  const fullPath = path.join(PKG_DIR, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

test('Schemas Suite: Copilot Brain Data Validation', async (t) => {
  await t.test('Positive validation: repo root and template JSON files conform to schemas', async (sub) => {
    await sub.test('repo root org-kernel.json conforms to org-kernel.schema.json', () => {
      const orgKernel = loadJson('org-kernel.json');
      const errors = validateAgainstSchema('org-kernel', orgKernel).errors;
      assert.deepStrictEqual(errors, [], `org-kernel.json validation errors: ${errors.join(', ')}`);
    });

    await sub.test('templates/base/org-kernel.json (post-interpolation) conforms to org-kernel.schema.json', () => {
      const templateRaw = fs.readFileSync(path.join(PKG_DIR, 'templates', 'base', 'org-kernel.json'), 'utf8');
      const nowIso = new Date().toISOString();
      const interpolated = templateRaw
        .replaceAll('{{COMPANY_NAME}}', 'Acme Corp')
        .replaceAll('{{INDUSTRY}}', 'Enterprise Software')
        .replaceAll('{{TAGLINE}}', 'Institutional Knowledge Engine')
        .replaceAll('{{ACTIVE_AREAS_JSON}}', JSON.stringify(['sales', 'marketing', 'product', 'operations']))
        .replaceAll('{{CREATED_AT}}', nowIso)
        .replaceAll('{{UPDATED_AT}}', nowIso)
        .replaceAll('{{LANGUAGE}}', 'es');

      const parsed = JSON.parse(interpolated);
      const errors = validateAgainstSchema('org-kernel', parsed).errors;
      assert.deepStrictEqual(errors, [], `templates/base/org-kernel.json errors: ${errors.join(', ')}`);
    });

    await sub.test('org-kernel language is optional and must be en or es', () => {
      const kernel = loadJson('org-kernel.json');
      const { language: _unused, ...withoutLanguage } = kernel;
      assert.deepStrictEqual(validateAgainstSchema('org-kernel', withoutLanguage).errors, [], 'old brains without language stay valid');
      assert.deepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, language: 'es' }).errors, []);
      assert.notDeepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, language: 'fr' }).errors, [], 'unknown languages are rejected');
    });

    await sub.test('org-kernel setup is optional: completed boolean plus an optional completedAt date-time', () => {
      const { setup: _unused, ...kernel } = loadJson('org-kernel.json');
      assert.deepStrictEqual(validateAgainstSchema('org-kernel', kernel).errors, [], 'old brains without setup stay valid');
      assert.deepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, setup: { completed: false } }).errors, []);
      assert.deepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, setup: { completed: true, completedAt: '2026-10-19T10:00:00.000Z' } }).errors, []);
      assert.notDeepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, setup: { completed: 'yes' } }).errors, [], 'completed must be a boolean');
      assert.notDeepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, setup: {} }).errors, [], 'completed is required inside setup');
      assert.notDeepStrictEqual(validateAgainstSchema('org-kernel', { ...kernel, setup: { completed: true, completedAt: 'yesterday' } }).errors, [], 'completedAt must be a date-time');
    });

    await sub.test('all sales/battlecards/*.json conform to sales-battlecard.schema.json', () => {
      const battlecardsDir = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'battlecards');
      const files = fs.readdirSync(battlecardsDir).filter((f) => f.endsWith('.json'));
      assert.ok(files.length > 0, 'Must have at least one battlecard in templates');

      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(battlecardsDir, file), 'utf8'));
        const errors = validateAgainstSchema('sales-battlecard', data).errors;
        assert.deepStrictEqual(errors, [], `Battlecard ${file} has errors: ${errors.join(', ')}`);
      }
    });

    await sub.test('all sales/objections/*.json conform to sales-objection.schema.json', () => {
      const objectionsDir = path.join(PKG_DIR, 'templates', 'areas', 'sales', 'objections');
      const files = fs.readdirSync(objectionsDir).filter((f) => f.endsWith('.json'));
      assert.ok(files.length > 0, 'Must have at least one objection in templates');

      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(objectionsDir, file), 'utf8'));
        const errors = validateAgainstSchema('sales-objection', data).errors;
        assert.deepStrictEqual(errors, [], `Objection ${file} has errors: ${errors.join(', ')}`);
      }
    });

    await sub.test('all operations/sops/*.json conform to sop.schema.json', () => {
      const sopsDir = path.join(PKG_DIR, 'templates', 'areas', 'operations', 'sops');
      const files = fs.readdirSync(sopsDir).filter((f) => f.endsWith('.json'));
      assert.ok(files.length > 0, 'Must have at least one SOP in templates');

      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(sopsDir, file), 'utf8'));
        const errors = validateAgainstSchema('sop', data).errors;
        assert.deepStrictEqual(errors, [], `SOP ${file} has errors: ${errors.join(', ')}`);
      }
    });
  });

  await t.test('Negative assertions: schema validation correctly catches invalid structures', async (sub) => {
    await sub.test('org-kernel rejects missing required fields and bad types', () => {
      // Missing organization.name and governance
      const invalidKernel1 = {
        version: '1.0.0',
        organization: { industry: 'Tech', tagline: 'Fast' },
        activeAreas: ['sales']
      };
      const errors1 = validateAgainstSchema('org-kernel', invalidKernel1).errors;
      assert.ok(errors1.some((e) => e.includes('governance is required')));
      assert.ok(errors1.some((e) => e.includes('organization.name is required')));

      // Invalid version pattern and invalid activeAreas item
      const invalidKernel2 = {
        version: 'v1.0-alpha',
        organization: { name: 'Acme', industry: 'Tech', tagline: 'Fast' },
        activeAreas: ['Invalid Domain!'],
        governance: { owner: 'CEO' }
      };
      const errors2 = validateAgainstSchema('org-kernel', invalidKernel2).errors;
      assert.ok(errors2.some((e) => e.includes('does not match pattern')));
      assert.ok(errors2.some((e) => e.includes('activeAreas[0]') && e.includes('does not match pattern')));
    });

    await sub.test('sales-battlecard rejects missing required fields and invalid enums', () => {
      const invalidBattlecard = {
        id: 'Invalid_ID_Uppercase',
        competitorName: 'LegacyDocs',
        competitorTier: 'monopoly_tier', // invalid enum
        overview: 'Too short', // < minLength 10
        lastUpdated: 'invalid-date',
        keyStrengths: [], // < minItems 1
        keyWeaknesses: ['Weak search'],
        ourSilverBullets: ['Git-backed']
      };
      const errors = validateAgainstSchema('sales-battlecard', invalidBattlecard).errors;
      assert.ok(errors.some((e) => e.includes('does not match pattern')));
      assert.ok(errors.some((e) => e.includes('not in enum [direct, indirect, emerging]')));
      assert.ok(errors.some((e) => e.includes('minLength 10')));
      assert.ok(errors.some((e) => e.includes('minItems 1')));
      assert.ok(errors.some((e) => e.includes('not a valid date format')));
    });

    await sub.test('sales-objection rejects invalid category and severity', () => {
      const invalidObjection = {
        id: 'budget-issue',
        title: 'No', // < minLength 3
        category: 'political_barrier', // not in enum
        severity: 'apocalyptic', // not in enum
        triggerPhrases: [],
        rootCause: 'Short',
        pivotScript: 'Short script',
        counterArguments: [],
        suggestedNextStep: 'Do demo'
      };
      const errors = validateAgainstSchema('sales-objection', invalidObjection).errors;
      assert.ok(errors.some((e) => e.includes('not in enum [pricing, timing, authority, competitor, trust, technical_fit]')));
      assert.ok(errors.some((e) => e.includes('not in enum [low, medium, high, blocker]')));
      assert.ok(errors.some((e) => e.includes('title: string length 2 < minLength 3')));
      assert.ok(errors.some((e) => e.includes('triggerPhrases: array items count 0 < minItems 1')));
    });

    await sub.test('sop rejects missing steps and invalid step properties', () => {
      const invalidSop = {
        id: 'incident-response',
        title: 'Incident Procedure',
        area: 'operations',
        owner: 'SRE Lead',
        version: '1.0.0',
        effectiveDate: '2026-09-30',
        purpose: 'Comprehensive procedure to handle critical incidents.',
        scope: 'Production services.',
        steps: [
          {
            stepNumber: 1
            // missing title, description, responsibleRole
          }
        ]
      };
      const errors = validateAgainstSchema('sop', invalidSop).errors;
      assert.ok(errors.some((e) => e.includes('steps[0].title is required')));
      assert.ok(errors.some((e) => e.includes('steps[0].description is required')));
      assert.ok(errors.some((e) => e.includes('steps[0].responsibleRole is required')));
    });
  });
});
