// Sales script parsing: a markdown file with a fixed heading grammar becomes structured data.
// Pure: no I/O, never throws. Problems are returned as diagnostics {level, line, code, vars, message} (see diagnostics.js).
//
//   frontmatter: script, title, industry?, version (int), status (draft|active)
//   ## conversation   play: goal: note:   and "- " rules before the first ###
//   ### step          branch: tag: say: detail: tip: coach: tone: next:
//   #### buyer answer (the label is the pill)   when: plus the same card keys
import { parseFrontmatter } from './plays.js';
import { foldText, toSlug } from './sales-normalize.js';
import { makeDiagnostic } from './diagnostics.js';

export const SCRIPT_TONES = Object.freeze(['start', 'plain', 'action', 'yes', 'no', 'follow']);
export const SCRIPT_STATUSES = Object.freeze(['draft', 'active']);

const KEY_LINE = /^([a-z_]+):\s*(.*)$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const CARD_KEYS = ['say', 'tag', 'detail', 'tip', 'coach', 'tone'];
const KEYS = {
  conv: new Set(['play', 'goal', 'note']),
  step: new Set([...CARD_KEYS, 'branch', 'next']),
  answer: new Set([...CARD_KEYS, 'when', 'next'])
};

const slugOf = (value) => toSlug(foldText(value));

function emptyCard(line) {
  return { card: { tag: '', say: '', details: [], tip: '', coach: '', tone: '' }, line };
}

/** Parse a script file. `fileStem` (file name without .md) enables the script-name check; omit it for drafts. */
export function parseScript(markdown, { fileStem } = {}) {
  const text = typeof markdown === 'string' ? markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n') : '';
  const lines = text.split('\n');
  const diagnostics = [];
  const add = (level, line, code, vars) => diagnostics.push(makeDiagnostic(level, line, code, vars));

  const fm = parseFrontmatter(text);
  let bodyStart = 0;
  if (fm) {
    const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
    bodyStart = close === -1 ? lines.length : close + 1;
  }
  const keyLine = (key) => Math.max(1, lines.slice(0, bodyStart).findIndex((l) => l.startsWith(`${key}:`)) + 1);

  const script = { id: '', title: '', industry: '', version: null, status: '', intro: '', conversations: [], diagnostics };
  if (!fm) add('error', 1, 'script.noFrontmatter');
  else {
    script.id = fm.script || fileStem || '';
    script.title = fm.title || '';
    script.industry = fm.industry || '';
    script.status = fm.status || '';
    if (!fm.script) add('error', 1, 'script.noScript');
    else if (fileStem && fm.script !== fileStem) add('warning', keyLine('script'), 'script.nameMismatch', { script: fm.script, file: fileStem });
    if (!fm.title) add('error', 1, 'script.noTitle');
    if (!SCRIPT_STATUSES.includes(fm.status)) add('error', keyLine('status'), 'script.badStatus', { value: fm.status ?? '' });
    if (/^\d+$/.test(fm.version ?? '')) script.version = Number(fm.version);
    else add('error', keyLine('version'), 'script.badVersion', { value: fm.version ?? '' });
  }

  const intro = [];
  const cardLines = new Map();
  const nextRefs = [];
  const stepLines = new Map();
  let conv = null;
  let step = null;
  let answer = null;
  let holder = null;
  let current = null;
  let skipping = false;

  const startCard = (line) => {
    current = emptyCard(line);
    holder.cards.push(current.card);
    cardLines.set(current.card, line);
  };

  const startConv = (title, line) => {
    conv = { title, anchor: '', play: '', goal: '', note: '', rules: [], steps: [] };
    script.conversations.push(conv);
    stepLines.set(conv, line);
    step = answer = holder = current = null;
    skipping = false;
  };

  for (let i = bodyStart; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = i + 1;
    const trimmed = raw.trim();
    if (!conv) {
      const h = HEADING.exec(trimmed);
      if (h && h[1].length === 2) startConv(h[2], line);
      else intro.push(raw);
      continue;
    }
    if (!trimmed) continue;
    const h = HEADING.exec(trimmed);
    if (h && h[1].length === 2) {
      startConv(h[2], line);
      continue;
    }
    if (h && h[1].length === 3) {
      step = { title: h[2], anchor: '', branch: '', cards: [], next: '', nextAnchor: '', answers: [] };
      conv.steps.push(step);
      stepLines.set(step, line);
      holder = step;
      answer = current = null;
      skipping = false;
      continue;
    }
    if (h && h[1].length === 4) {
      if (!step) {
        add('warning', line, 'script.answerOutside', { label: h[2] });
        skipping = true;
        continue;
      }
      answer = { label: h[2], when: '', cards: [], next: '', nextAnchor: '' };
      step.answers.push(answer);
      holder = answer;
      current = null;
      skipping = false;
      continue;
    }
    if (skipping) continue;

    if (!step && trimmed.startsWith('- ')) {
      conv.rules.push(trimmed.slice(2).trim());
      continue;
    }
    const kv = KEY_LINE.exec(trimmed);
    const scope = answer ? 'answer' : step ? 'step' : 'conv';
    if (!kv || !KEYS[scope].has(kv[1])) {
      add('warning', line, 'script.unknownLine', { text: trimmed });
      continue;
    }
    const [, key, value] = kv;
    if (scope === 'conv') {
      conv[key] = value;
    } else if (key === 'branch') step.branch = value;
    else if (key === 'when') answer.when = value;
    else if (key === 'next') {
      holder.next = value;
      nextRefs.push({ owner: holder, line });
    } else {
      const startsNew = !current || (key === 'say' && current.card.say) || (key === 'tag' && (current.card.tag || current.card.say));
      if (startsNew) startCard(line);
      const card = current.card;
      if (key === 'say') card.say = value;
      else if (key === 'tag') card.tag = value;
      else if (key === 'detail') card.details.push(value);
      else if (key === 'tip') card.tip = value;
      else if (key === 'coach') card.coach = value;
      else if (SCRIPT_TONES.includes(value)) card.tone = value;
      else add('error', line, 'script.unknownTone', { tone: value, tones: SCRIPT_TONES.join(', ') });
    }
  }
  script.intro = intro.join('\n').trim();

  finalize(script, { cardLines, nextRefs, stepLines, add });
  diagnostics.sort((a, b) => a.line - b.line);
  return script;
}

function finalize(script, { cardLines, nextRefs, stepLines, add }) {
  if (script.conversations.length === 0) add('error', 1, 'script.noConversations');
  const used = new Set();
  const unique = (base, line) => {
    let anchor = base;
    for (let n = 2; used.has(anchor); n += 1) anchor = `${base}-${n}`;
    if (anchor !== base) add('warning', line, 'script.duplicateAnchor', { base, anchor });
    used.add(anchor);
    return anchor;
  };
  const targets = new Map();
  const remember = (title, anchor) => {
    const key = foldText(title).trim();
    if (key && !targets.has(key)) targets.set(key, anchor);
  };

  script.conversations.forEach((conv, ci) => {
    conv.anchor = unique(slugOf(conv.title) || `conversation-${ci + 1}`, stepLines.get(conv));
    remember(conv.title, conv.anchor);
    if (conv.steps.length === 0) add('error', stepLines.get(conv), 'script.noSteps', { title: conv.title });
    conv.steps.forEach((step, si) => {
      const base = conv.play && step.branch ? `${slugOf(conv.play)}-${slugOf(step.branch)}` : `${conv.anchor}-step-${si + 1}`;
      step.anchor = unique(base, stepLines.get(step));
      remember(step.title, step.anchor);
    });
  });

  const owners = script.conversations.flatMap((c) => c.steps.flatMap((s) => [s, ...s.answers]));
  for (const owner of owners) {
    for (const card of owner.cards) {
      if (!card.say) add('error', cardLines.get(card), 'script.noSay');
      if (!card.tone) card.tone = 'plain';
    }
  }
  for (const { owner, line } of nextRefs) {
    const key = foldText(owner.next).trim();
    if (key === 'end') continue;
    if (targets.has(key)) owner.nextAnchor = targets.get(key);
    else add('warning', line, 'script.badNext', { next: owner.next });
  }
}
