// Capture an analyzed sales call into sales/calls/YYYY-MM/ (never overwrites an existing log).
import fs from 'node:fs';
import path from 'node:path';
import { BrainError } from './errors.js';
import { isInside } from './fs-utils.js';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const REQUIRED = Object.freeze(['rep', 'prospect', 'date', 'summary', 'stage', 'outcome']);

/** Strict YYYY-MM-DD that is also a real calendar date. */
export function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Double-quoted YAML scalar. JSON string escaping is valid YAML and neutralizes newlines and colons.
function yamlString(value) {
  return JSON.stringify(String(value));
}

function nextFreeFileName(dir, base, ext) {
  let candidate = `${base}${ext}`;
  for (let n = 2; fs.existsSync(path.join(dir, candidate)); n++) {
    candidate = `${base}-${n}${ext}`;
  }
  return candidate;
}

function renderCallLog({ rep, prospect, date, summary, stage, outcome, notes, objections, actionItems, rawTranscript }) {
  return `---
rep: ${yamlString(rep)}
prospect: ${yamlString(prospect)}
date: ${yamlString(date)}
stage: ${yamlString(stage)}
outcome: ${yamlString(outcome)}
created_at: ${yamlString(new Date().toISOString())}
---

# Call Intelligence: ${rep} x ${prospect} (${date})

## 1. Executive Summary
${summary}

## 2. Deal Details
- **Assigned Rep:** ${rep}
- **Prospect Company:** ${prospect}
- **Pipeline Stage:** ${stage}
- **Call Outcome:** ${outcome}

${objections && objections.length > 0 ? `## 3. Detected Objections\n${objections.map(o => `- ${o}`).join('\n')}\n` : ''}
${notes ? `## 4. Discussion & Coaching Notes\n${notes}\n` : ''}
${actionItems && actionItems.length > 0 ? `## 5. Next Steps & Action Items\n${actionItems.map(a => `- [ ] ${a}`).join('\n')}\n` : ''}
${rawTranscript ? `## 6. Raw Call Transcript\n\`\`\`text\n${rawTranscript}\n\`\`\`\n` : ''}
`;
}

/**
 * @param {string} rootDir
 * @param {{ rep: string, prospect: string, date: string, summary: string, stage: string, outcome: string,
 *   notes?: string, objections?: string[], actionItems?: string[], rawTranscript?: string }} call
 * @returns {{ relPath: string }} path relative to rootDir (posix separators)
 */
export function captureCall(rootDir, call) {
  if (REQUIRED.some((field) => !call[field])) {
    throw new BrainError('VALIDATION', `Error: Missing required fields (${REQUIRED.join(', ')}).`);
  }
  if (!isIsoDate(call.date)) {
    throw new BrainError('VALIDATION', 'Error: date must be a real calendar date in YYYY-MM-DD format.');
  }

  const callsRoot = path.resolve(rootDir, 'sales', 'calls');
  const month = call.date.slice(0, 7);
  const targetDir = path.resolve(callsRoot, month);
  if (!isInside(callsRoot, targetDir)) {
    throw new BrainError('PATH_ESCAPE', 'Error: resolved call log path escapes sales/calls/.');
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const fileName = nextFreeFileName(targetDir, `${call.date}_${slugify(call.rep)}_${slugify(call.prospect)}`, '.md');
  const filePath = path.join(targetDir, fileName);
  if (!isInside(callsRoot, filePath)) {
    throw new BrainError('PATH_ESCAPE', 'Error: resolved call log path escapes sales/calls/.');
  }

  // 'wx' fails instead of clobbering if a file appeared after nextFreeFileName checked.
  fs.writeFileSync(filePath, renderCallLog(call), { encoding: 'utf-8', flag: 'wx' });
  return { relPath: `sales/calls/${month}/${fileName}` };
}
