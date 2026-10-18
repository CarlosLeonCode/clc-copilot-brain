// Tolerant reader for call logs, win-loss notes and call guides under sales/. Read-only, stays inside sales/.
// Records are plain objects; anything unreadable is reported in `skipped` with a reason, never thrown.
import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './fs-utils.js';
import { demoAssetPaths } from './demo.js';
import { parseFrontmatter, readPlayMeta } from './plays.js';
import { readCallLog, isIsoDate } from './calls.js';
import { dealKey, normalizeOutcome, toSlug } from './sales-normalize.js';
import { stageNames } from './sales-view.js';

const WIN_LOSS_SKIP = new Set(['README.md', 'post-mortem-template.md']);
const WIN_LOSS_NAME = /^(\d{4}-\d{2}-\d{2})_(.+)_(won|lost)\.md$/i;

const clean = (s) => String(s ?? '').replace(/[*`]/g, '').trim();

/** Value of the first markdown table row whose first cell matches one of `labels` (lowercase). */
function tableField(text, labels) {
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(clean);
    if (cells.length >= 2 && labels.includes(cells[0].toLowerCase())) return cells[1];
  }
  return '';
}

function wonOrLost(value) {
  const outcome = normalizeOutcome(value);
  if (outcome === 'closed-won') return 'won';
  if (outcome === 'closed-lost') return 'lost';
  return undefined;
}

/** Directory entries sorted by name; symlinks are reported in `skipped` and never followed. */
function entriesOf(dir, relDir, skipped) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name)).filter((e) => {
    if (!e.isSymbolicLink()) return true;
    skipped.push({ relPath: `${relDir}/${e.name}`, reason: 'symlink not followed' });
    return false;
  });
}

function parseCall(relPath, _fileName, text) {
  if (!parseFrontmatter(text, { topLevelOnly: true })) return { reason: 'no frontmatter block' };
  const log = readCallLog(text);
  if (!isIsoDate(log.date)) return { reason: 'missing or invalid date' };
  return {
    record: {
      relPath,
      date: log.date,
      month: log.date.slice(0, 7),
      rep: log.rep ?? '',
      company: log.prospect ?? '',
      dealKey: dealKey({ dealId: log.dealId, company: log.prospect }),
      play: log.play,
      branch: log.branch,
      motion: log.motion,
      leadSource: log.leadSource,
      goalMet: log.goalMet,
      gateAdvanced: log.gateAdvanced,
      outcome: normalizeOutcome(log.outcome)
    }
  };
}

// Result order: frontmatter, then the YYYY-MM-DD_slug_won|lost file name, then the legacy table.
function parseWin(relPath, fileName, text) {
  const fm = parseFrontmatter(text, { topLevelOnly: true }) ?? {};
  const named = WIN_LOSS_NAME.exec(fileName);
  const result = wonOrLost(fm.result) ?? (named ? named[3].toLowerCase() : undefined) ?? wonOrLost(tableField(text, ['outcome']));
  if (!result) return { reason: 'no won or lost result in frontmatter, file name or table' };
  const date = [fm.date, named?.[1], tableField(text, ['close date', 'date closed'])].find((d) => isIsoDate(d));
  if (!date) return { reason: 'missing or invalid date' };
  const company = fm.prospect_company || fm.company || tableField(text, ['prospect / customer']) || (named ? named[2].replace(/[-_]+/g, ' ') : '');
  return {
    record: {
      relPath,
      date,
      company,
      dealKey: dealKey({ dealId: fm.deal_id, company }),
      rep: fm.rep || tableField(text, ['assigned rep (ae)']),
      result,
      motion: toSlug(fm.motion) || undefined,
      leadSource: toSlug(fm.lead_source) || undefined
    }
  };
}

/** Read each file once: demo files are counted, unreadable or incomplete ones are skipped with a reason. */
function collect(files, parse, demo, state) {
  const records = [];
  for (const { relPath, abs, fileName } of files) {
    if (demo.has(relPath)) {
      state.demoExcluded += 1;
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      state.skipped.push({ relPath, reason: 'could not be read' });
      continue;
    }
    const { record, reason } = parse(relPath, fileName, text);
    if (record) records.push(record);
    else state.skipped.push({ relPath, reason });
  }
  return records;
}

/**
 * Read every sales record of a brain. Never throws on odd content.
 * @returns {{ calls: object[], wins: object[], plays: object[], stageNames: Map<string,string>,
 *   skipped: {relPath: string, reason: string}[], demoExcluded: number }}
 */
export function readSalesRecords(rootDir, { templatesAreasDir } = {}) {
  const salesDir = path.resolve(rootDir, 'sales');
  const state = { skipped: [], demoExcluded: 0 };
  const demo = new Set(demoAssetPaths(templatesAreasDir).map((p) => p.split(path.sep).join('/')));
  const mdFile = (f) => f.isFile() && f.name.endsWith('.md') && f.name !== 'README.md';

  const callFiles = [];
  const callsDir = path.join(salesDir, 'calls');
  for (const month of entriesOf(callsDir, 'sales/calls', state.skipped)) {
    if (!month.isDirectory()) continue;
    const relDir = `sales/calls/${month.name}`;
    for (const f of entriesOf(path.join(callsDir, month.name), relDir, state.skipped)) {
      const abs = path.join(callsDir, month.name, f.name);
      if (mdFile(f) && isInside(salesDir, abs)) callFiles.push({ relPath: `${relDir}/${f.name}`, abs, fileName: f.name });
    }
  }

  const winDir = path.join(salesDir, 'win-loss');
  const winFiles = entriesOf(winDir, 'sales/win-loss', state.skipped)
    .filter((f) => mdFile(f) && !WIN_LOSS_SKIP.has(f.name))
    .map((f) => ({ relPath: `sales/win-loss/${f.name}`, abs: path.join(winDir, f.name), fileName: f.name }));

  const calls = collect(callFiles, parseCall, demo, state);
  const wins = collect(winFiles, parseWin, demo, state);

  const playsDir = path.join(salesDir, 'plays');
  const plays = entriesOf(playsDir, 'sales/plays', state.skipped).filter(mdFile).flatMap((f) => {
    try {
      return [readPlayMeta(f.name, fs.readFileSync(path.join(playsDir, f.name), 'utf8'))];
    } catch {
      state.skipped.push({ relPath: `sales/plays/${f.name}`, reason: 'could not be read' });
      return [];
    }
  });

  let systemMd = '';
  try {
    systemMd = fs.readFileSync(path.join(salesDir, 'system.md'), 'utf8');
  } catch {
    // no system.md: no stage names
  }
  return { calls, wins, plays, stageNames: stageNames(systemMd), skipped: state.skipped, demoExcluded: state.demoExcluded };
}
