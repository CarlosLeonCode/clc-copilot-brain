// Sales glossary parsing and lookup. Pure: no I/O, never throws on odd input.
// Format: `## group` sections holding one 3-column table (term | meaning | example), read by column position.
import { foldText } from './sales-normalize.js';
import { makeDiagnostic } from './diagnostics.js';

export const SEPARATOR_ROW = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** Cells of one markdown table row (outer pipes dropped, `\\|` kept as a literal pipe, cells trimmed). */
export function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim());
}

const stripBold = (value) => value.replace(/^\*\*(.+)\*\*$/, '$1').trim();
const isTableLine = (line) => line.trim().startsWith('|');

/**
 * Parse a glossary markdown file.
 * @returns {{title: string, groups: {name: string, headers: string[], terms: {term: string, meaning: string, example: string}[]}[], diagnostics: {level: string, line: number, code: string, vars: object, message: string}[]}}
 */
export function parseGlossary(markdown) {
  const result = { title: '', groups: [], diagnostics: [] };
  if (typeof markdown !== 'string') return result;
  const lines = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const warn = (line, code, vars) => result.diagnostics.push(makeDiagnostic('warning', line, code, vars));
  let group = null;

  lines.forEach((raw, index) => {
    const line = index + 1;
    const heading = /^(#{1,2})\s+(.+?)\s*#*\s*$/.exec(raw);
    if (heading) {
      if (heading[1] === '#') {
        if (!result.title) result.title = heading[2];
      } else {
        group = { name: heading[2], headers: [], terms: [] };
        result.groups.push(group);
      }
      return;
    }
    if (!isTableLine(raw) || SEPARATOR_ROW.test(raw.trim())) return;
    if (!group) {
      warn(line, 'glossary.rowBeforeGroup');
      return;
    }
    const cells = splitRow(raw);
    const nextLine = lines[index + 1] ?? '';
    if (group.headers.length === 0 && SEPARATOR_ROW.test(nextLine.trim())) {
      if (cells.length === 3) group.headers = cells;
      else warn(line, 'glossary.headerColumns', { columns: cells.length });
      return;
    }
    if (cells.length !== 3) {
      warn(line, 'glossary.rowColumns', { columns: cells.length });
      return;
    }
    group.terms.push({ term: stripBold(cells[0]), meaning: cells[1], example: cells[2] });
  });
  return result;
}

/** Find a term (case and accent insensitive). Returns {term, meaning, example, group} or null. */
export function lookupTerm(glossary, term) {
  const wanted = foldText(term).trim();
  if (!wanted || !Array.isArray(glossary?.groups)) return null;
  for (const group of glossary.groups) {
    const found = group.terms.find((entry) => foldText(entry.term).trim() === wanted);
    if (found) return { ...found, group: group.name };
  }
  return null;
}
