import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { runDoctor } from '../../src/core/doctor.js';
import { initBrain } from '../../src/core/scaffold.js';
import { loadLibrary, writeScriptPages } from '../../src/core/sales-library.js';
import { LEGACY_STARTER_SCRIPT_HASHES } from '../../src/core/legacy-assets.js';
import { SAMPLE } from '../fixtures/sample-script.js';
import { withTmp, writeFiles } from './helpers.js';

const warnings = (dir) => runDoctor(dir).issues.filter((i) => i.level === 'warning').map((i) => i.message);
const GLOSSARY = '# Glossary\n\n## Basics\n\n| Term | Meaning | Example |\n|---|---|---|\n| **Lead** | A possible buyer | A caller |\n';
const read = (dir, rel) => fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8');
const write = (dir, rel, text) => writeFiles(dir, { [rel]: text });

/** A brain with one well-formed script (page generated, linked from system.md); `edit` changes the source. */
function brainWithScript(dir, { edit = (s) => s, link = true, page = true, language = 'en' } = {}) {
  initBrain(dir, { areas: ['sales'], language });
  write(dir, 'sales/scripts/sample-co.md', edit(SAMPLE));
  if (page) writeScriptPages(loadLibrary(dir), { rootDir: dir, lang: language });
  if (link) write(dir, 'sales/system.md', `${read(dir, 'sales/system.md')}\n| [Sample Co](./scripts/sample-co.md) | Generic | Cold call |\n`);
}

test('fresh en and es brains: the scripts and glossary checks add no warnings', () =>
  Promise.all(['en', 'es'].map((language) => withTmp((dir) => {
    initBrain(dir, { areas: ['sales'], language });
    assert.deepEqual(warnings(dir), []);
  }))));

test('a well-formed linked script with a fresh page and a linked glossary is silent', () => withTmp((dir) => {
  brainWithScript(dir);
  write(dir, 'sales/glossary.md', GLOSSARY);
  write(dir, 'sales/system.md', `${read(dir, 'sales/system.md')}\nSee [glossary](./glossary.md).\n`);
  assert.deepEqual(warnings(dir), []);
}));

test('script problems are grouped in one plain warning that names the file', () => withTmp((dir) => {
  brainWithScript(dir, { edit: (s) => s.replace('status: active', 'status: maybe'), page: false });
  const found = warnings(dir).filter((m) => /sample-co/.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /sales\/scripts\/sample-co\.md/);
  assert.match(found[0], /ask your assistant/i);
  assert.equal(runDoctor(dir).errors, 0, 'warnings, never errors');
}));

test('a conversation tied to a play that does not exist is reported', () => withTmp((dir) => {
  brainWithScript(dir, { edit: (s) => s.replace('play: cold-call', 'play: ghost-call') });
  const found = warnings(dir).filter((m) => /ghost-call/.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /sample-co/);
}));

test('a branch that is not in that play is reported', () => withTmp((dir) => {
  brainWithScript(dir, { edit: (s) => s.replace('branch: B1', 'branch: B9') });
  const found = warnings(dir).filter((m) => /B9/.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /cold-call/);
}));

test('an unresolved next: is reported', () => withTmp((dir) => {
  brainWithScript(dir, { edit: (s) => s.replace('next: Closing', 'next: Nowhere') });
  assert.equal(warnings(dir).filter((m) => /Nowhere/.test(m)).length, 1);
}));

test('a script or glossary that system.md does not mention is reported', () => withTmp((dir) => {
  brainWithScript(dir, { link: false });
  write(dir, 'sales/glossary.md', GLOSSARY);
  const found = warnings(dir);
  assert.equal(found.filter((m) => /sample-co/.test(m) && /system\.md/.test(m)).length, 1);
  assert.equal(found.filter((m) => /glossary/i.test(m) && /system\.md/.test(m)).length, 1);
}));

test('a Guion link to a missing file or anchor is reported', () => withTmp((dir) => {
  brainWithScript(dir);
  const play = 'sales/plays/cold-call.md';
  const original = read(dir, play);
  const row = (link) => original.replace(/^(\| B1 \|.*\|) — \|$/m, `$1 ${link} |`);
  write(dir, play, row('[x](../scripts/missing.html#a)'));
  assert.equal(warnings(dir).filter((m) => /missing\.html/.test(m)).length, 1);
  write(dir, play, row('[x](../scripts/sample-co.html#no-such-anchor)'));
  assert.equal(warnings(dir).filter((m) => /no-such-anchor/.test(m)).length, 1);
  write(dir, play, row('[x](../scripts/sample-co.html#cold-call-b1)'));
  assert.deepEqual(warnings(dir).filter((m) => /Guion|play link|no-such|missing\.html/i.test(m)), []);
}));

test('a missing page and a page older than its script both suggest refreshing the page', () => withTmp((dir) => {
  brainWithScript(dir, { page: false });
  let found = warnings(dir).filter((m) => /sample-co/.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /clc-brain view/);
  writeScriptPages(loadLibrary(dir), { rootDir: dir });
  assert.deepEqual(warnings(dir), []);
  const md = path.join(dir, 'sales/scripts/sample-co.md');
  const later = new Date(Date.now() + 60000);
  fs.utimesSync(md, later, later);
  found = warnings(dir).filter((m) => /sample-co/.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /older|out of date|stale/i);
  assert.match(found[0], /clc-brain view/);
}));

test('a malformed glossary is reported', () => withTmp((dir) => {
  brainWithScript(dir);
  write(dir, 'sales/glossary.md', `${GLOSSARY}| only | two |\n`);
  write(dir, 'sales/system.md', `${read(dir, 'sales/system.md')}\n[glossary](./glossary.md)\n`);
  const found = warnings(dir).filter((m) => /glossary/i.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /ask your assistant/i);
}));

test('old starter scripts are flagged by hash only, never edited copies, and never deleted', (t) => withTmp((dir) => {
  initBrain(dir, { areas: ['sales'] });
  const names = Object.keys(LEGACY_STARTER_SCRIPT_HASHES);
  const original = (name) => {
    try {
      return execFileSync('git', ['show', `f79648adb1d232846bdf2e3d0b9cca6ab5894b42:templates/areas/sales/scripts/${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null;
    }
  };
  const texts = names.map(original);
  if (texts.includes(null)) return t.skip('git history unavailable');
  names.forEach((name, i) => write(dir, `sales/scripts/${name}`, texts[i]));
  const found = warnings(dir).filter((m) => /old example scripts/i.test(m));
  assert.equal(found.length, 1);
  assert.match(found[0], /cold-outreach-email\.md/);
  assert.match(found[0], /discovery-call-framework\.md/);
  assert.match(found[0], /ask your assistant to remove/i);
  names.forEach((name) => assert.ok(fs.existsSync(path.join(dir, 'sales/scripts', name)), 'never deleted'));
  write(dir, `sales/scripts/${names[0]}`, `${texts[0]}\nMy own notes.\n`);
  const after = warnings(dir).filter((m) => /old example scripts/i.test(m));
  assert.equal(after.length, 1);
  assert.doesNotMatch(after[0], /cold-outreach-email/);
  assert.match(after[0], /discovery-call-framework/);
}));

test('a glosario file linked from system.md counts as linked; an unlinked one is named by its real file', () => withTmp((dir) => {
  initBrain(dir, { areas: ['sales'], language: 'es' });
  write(dir, 'sales/glosario-sandler.md', '# Glosario\n\n## Base\n\n| Término | Qué significa | Ejemplo |\n|---|---|---|\n| **Dolor** | Un problema | Pierden ventas |\n');
  const unlinked = warnings(dir).filter((m) => /glosario/i.test(m));
  assert.equal(unlinked.length, 1);
  assert.match(unlinked[0], /sales\/glosario-sandler\.md/);
  write(dir, 'sales/system.md', `${read(dir, 'sales/system.md')}\nBúscalo en el [Glosario Sandler](./glosario-sandler.md).\n`);
  assert.deepEqual(warnings(dir).filter((m) => /glos/i.test(m)), []);
}));
