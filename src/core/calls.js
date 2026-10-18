// Capture an analyzed sales call into sales/calls/YYYY-MM/ (never overwrites an existing log).
import fs from 'node:fs';
import path from 'node:path';
import { BrainError } from './errors.js';
import { isInside } from './fs-utils.js';
import { parseFrontmatter } from './plays.js';
import { parseBool, toSlug } from './sales-normalize.js';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const REQUIRED = Object.freeze(['rep', 'prospect', 'date', 'summary', 'stage', 'outcome']);

/**
 * Single source of truth: call input name -> canonical frontmatter key.
 * MCP inputs keep their short names (`prospect`, `stage`); logs are written with canonical keys.
 */
export const CALL_FIELDS = Object.freeze({
  rep: 'rep',
  prospect: 'prospect_company',
  date: 'date',
  stage: 'deal_stage',
  outcome: 'outcome',
  motion: 'motion',
  leadSource: 'lead_source',
  dealId: 'deal_id',
  play: 'play',
  branch: 'branch',
  goalMet: 'goal_met',
  gateAdvanced: 'gate_advanced'
});

// Frontmatter key order. Optional fields are omitted when absent.
const FRONTMATTER_ORDER = Object.freeze(['rep', 'prospect', 'date', 'stage', 'outcome', 'motion', 'leadSource', 'dealId', 'play', 'branch', 'goalMet', 'gateAdvanced']);
const OPTIONAL = new Set(['motion', 'leadSource', 'dealId', 'play', 'branch', 'goalMet', 'gateAdvanced']);
// Free-text tags stored as slugs so the same motion or source always reads the same.
const SLUGGED = Object.freeze(['motion', 'leadSource', 'dealId']);

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

function renderFrontmatter(call) {
  const lines = [];
  for (const input of FRONTMATTER_ORDER) {
    const value = call[input];
    if (OPTIONAL.has(input) && (value === undefined || value === null || value === '')) continue;
    // Booleans are bare YAML scalars; everything else is a JSON-escaped string.
    lines.push(`${CALL_FIELDS[input]}: ${typeof value === 'boolean' ? String(value) : yamlString(value)}`);
  }
  lines.push(`created_at: ${yamlString(new Date().toISOString())}`);
  return lines.join('\n');
}

function renderCallLog(call) {
  const { rep, prospect, date, summary, stage, outcome, notes, objections, actionItems, rawTranscript } = call;
  return `---
${renderFrontmatter(call)}
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
 *   motion?: string, leadSource?: string, dealId?: string, play?: string, branch?: string, goalMet?: boolean, gateAdvanced?: boolean, notes?: string, objections?: string[], actionItems?: string[], rawTranscript?: string }} call
 * @returns {{ relPath: string }} path relative to rootDir (posix separators)
 */
export function captureCall(rootDir, call) {
  if (REQUIRED.some((field) => !call[field])) {
    throw new BrainError('VALIDATION', `Error: Missing required fields (${REQUIRED.join(', ')}).`);
  }
  if (!isIsoDate(call.date)) {
    throw new BrainError('VALIDATION', 'Error: date must be a real calendar date in YYYY-MM-DD format.');
  }
  if (call.gateAdvanced !== undefined && typeof call.gateAdvanced !== 'boolean') {
    throw new BrainError('VALIDATION', 'Error: gateAdvanced must be a boolean.');
  }
  if (call.goalMet !== undefined && typeof call.goalMet !== 'boolean') {
    throw new BrainError('VALIDATION', 'Error: goalMet must be a boolean.');
  }
  call = { ...call };
  for (const field of SLUGGED) if (call[field] !== undefined) call[field] = toSlug(call[field]);

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

/**
 * Read a call log's frontmatter into input-style names. Legacy logs (`prospect`, `stage`, no play fields)
 * and canonical logs (`prospect_company`, `deal_stage`) both load; absent play fields stay undefined.
 */
export function readCallLog(text) {
  const fm = parseFrontmatter(text, { topLevelOnly: true }) ?? {};
  const record = {
    rep: fm.rep,
    prospect: fm.prospect_company ?? fm.prospect,
    date: fm.date,
    stage: fm.deal_stage ?? fm.stage,
    outcome: fm.outcome
  };
  if (fm.play !== undefined) record.play = fm.play;
  if (fm.branch !== undefined) record.branch = fm.branch;
  if (fm.motion) record.motion = toSlug(fm.motion) || undefined;
  if (fm.lead_source) record.leadSource = toSlug(fm.lead_source) || undefined;
  if (fm.deal_id) record.dealId = toSlug(fm.deal_id) || undefined;
  if (parseBool(fm.goal_met) !== undefined) record.goalMet = parseBool(fm.goal_met);
  if (fm.gate_advanced !== undefined) record.gateAdvanced = fm.gate_advanced === 'true';
  return record;
}
