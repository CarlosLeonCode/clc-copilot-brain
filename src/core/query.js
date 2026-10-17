// Keyword search across a brain's knowledge areas.
import fs from 'node:fs';
import path from 'node:path';
import { resolveAllowedAreas } from './areas.js';
import { BrainError } from './errors.js';

const SEARCHABLE = /\.(md|json)$/;

function snippetFor(content, query) {
  const lines = content.split('\n');
  const i = lines.findIndex((line) => line.toLowerCase().includes(query));
  return i === -1 ? lines.slice(0, 4).join('\n') : lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).join('\n');
}

function scan(dir, rootDir, query, matches) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(fullPath, rootDir, query, matches);
    } else if (entry.isFile() && SEARCHABLE.test(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relPath = path.relative(rootDir, fullPath);
        if (relPath.toLowerCase().includes(query) || content.toLowerCase().includes(query)) {
          matches.push({ file: relPath, snippet: snippetFor(content, query) });
        }
      } catch {
        // Unreadable file: skip.
      }
    }
  }
}

/**
 * Search assets. `area` must be a preset id or an activeAreas entry (see resolveAllowedAreas);
 * without it, every allowed area plus playbooks/ is searched.
 * @returns {{ query: string, matches: Array<{ file: string, snippet: string }> }}
 */
export function queryBrain(rootDir, { query, area } = {}) {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) throw new BrainError('VALIDATION', 'Error: Query parameter is required.');

  const allowed = resolveAllowedAreas(rootDir);
  if (area !== undefined && !allowed.includes(area)) {
    throw new BrainError('INVALID_AREA', `Error: area must be one of: ${allowed.join(', ')}.`);
  }

  const matches = [];
  for (const dir of area ? [area] : [...allowed, 'playbooks']) {
    const abs = path.join(rootDir, dir);
    if (fs.existsSync(abs)) scan(abs, rootDir, needle, matches);
  }
  return { query: needle, matches };
}
