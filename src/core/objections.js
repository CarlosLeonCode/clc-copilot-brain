// Capture a schema-validated objection card into sales/objections/<id>.json + .md.
import fs from 'node:fs';
import path from 'node:path';
import { BrainError } from './errors.js';
import { validateAgainstSchema } from './schema-validator.js';

const OBJECTION_ID = /^[a-z0-9-]+$/;

function renderMarkdown(card) {
  const { id, title, category, severity, triggerPhrases, rootCause, pivotScript, counterArguments, proofPoints, suggestedNextStep } = card;
  return `# Sales Objection: ${title}

- **ID:** \`${id}\`
- **Category:** \`${category}\`
- **Severity:** \`${severity}\`

## Trigger Phrases
${triggerPhrases.map(tp => `- "${tp}"`).join('\n')}

## Root Cause
${rootCause}

## Pivot Script (Verbatim Response)
> "${pivotScript}"

## Counter-Arguments & Silver Bullets
${counterArguments.map(ca => `1. ${ca}`).join('\n')}

${proofPoints.length > 0 ? `## Proof Points\n${proofPoints.map(p => `- ${p}`).join('\n')}\n` : ''}
## Suggested Next Step
- ${suggestedNextStep}
`;
}

/**
 * @param {string} rootDir
 * @param {object} input - Objection fields (see schemas/sales-objection.schema.json)
 * @returns {{ card: object, files: string[] }}
 */
export function captureObjection(rootDir, input) {
  const { id, title, category, severity, rootCause, pivotScript, counterArguments, triggerPhrases, suggestedNextStep, proofPoints } = input;

  // id becomes a filename: enforce the safe pattern before anything else touches the disk.
  if (typeof id !== 'string' || !OBJECTION_ID.test(id)) {
    throw new BrainError('VALIDATION', 'Validation Error:\n- id is required and must be lowercase alphanumeric with hyphens (e.g. "pricing-too-high")');
  }

  const card = {
    $schema: '../../schemas/sales-objection.schema.json',
    id,
    title,
    category,
    severity,
    triggerPhrases: (Array.isArray(triggerPhrases) && triggerPhrases.length > 0) ? triggerPhrases : [title],
    rootCause,
    pivotScript,
    counterArguments,
    proofPoints: proofPoints || [],
    suggestedNextStep: suggestedNextStep ?? 'Review objection resolution in follow-up'
  };

  const { valid, errors } = validateAgainstSchema('sales-objection', card);
  if (!valid) {
    throw new BrainError('VALIDATION', `Validation Error (schemas/sales-objection.schema.json):\n${errors.map(e => `- ${e}`).join('\n')}`);
  }

  const targetDir = path.join(rootDir, 'sales', 'objections');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, `${id}.json`), JSON.stringify(card, null, 2), 'utf-8');
  fs.writeFileSync(path.join(targetDir, `${id}.md`), renderMarkdown(card), 'utf-8');
  return { card, files: [`sales/objections/${id}.json`, `sales/objections/${id}.md`] };
}
