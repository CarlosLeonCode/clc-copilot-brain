// Every template-owned file the upgrade manages must have its current version in the shipped-hash list,
// so a release that changes a template without running tools/update-shipped-hashes.js fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SHIPPED_HASHES } from '../src/core/shipped-hashes.js';
import { contentHash, isShippedVersion } from '../src/core/legacy-assets.js';
import { listSkillNames } from '../src/core/harness-adapters.js';
import { listMarkdownFiles } from '../src/core/fs-utils.js';
import { TEMPLATES_AREAS_DIR, TEMPLATES_BASE_DIR, TEMPLATES_LOCALES_DIR } from '../src/core/package-paths.js';

const MATRIX = 'sales/qualification/qualification-matrix.md';
const REGEN = 'run "node tools/update-shipped-hashes.js" and commit src/core/shipped-hashes.js';

function currentTemplates() {
  const out = [];
  const skills = path.join(TEMPLATES_BASE_DIR, '.agents', 'skills');
  for (const name of listSkillNames(skills)) out.push([`.agents/skills/${name}/SKILL.md`, path.join(skills, name, 'SKILL.md')]);
  const root = path.join(TEMPLATES_BASE_DIR, 'skills');
  for (const name of listMarkdownFiles(root)) out.push([`skills/${name}`, path.join(root, name)]);
  out.push([MATRIX, path.join(TEMPLATES_AREAS_DIR, ...MATRIX.split('/'))]);
  for (const lang of fs.existsSync(TEMPLATES_LOCALES_DIR) ? fs.readdirSync(TEMPLATES_LOCALES_DIR) : []) {
    const overlay = path.join(TEMPLATES_LOCALES_DIR, lang, 'areas', ...MATRIX.split('/'));
    if (fs.existsSync(overlay)) out.push([MATRIX, overlay]);
  }
  return out;
}

test('the current version of every template-owned file is a shipped version', () => {
  const files = currentTemplates();
  assert.ok(files.length > 10, 'templates are found');
  for (const [rel, src] of files) {
    const text = fs.readFileSync(src, 'utf8');
    assert.ok(SHIPPED_HASHES[rel]?.includes(contentHash(text)), `${rel} (${path.relative(TEMPLATES_BASE_DIR, src)}) is not listed: ${REGEN}`);
  }
});

test('isShippedVersion ignores CRLF and rejects an edited copy or an unknown path', () => {
  const [rel, src] = currentTemplates()[0];
  const text = fs.readFileSync(src, 'utf8');
  assert.equal(isShippedVersion(rel, text), true);
  assert.equal(isShippedVersion(rel, text.replace(/\n/g, '\r\n')), true);
  assert.equal(isShippedVersion(rel, `${text}\nMy own line.\n`), false);
  assert.equal(isShippedVersion('skills/not-ours.md', text), false);
  assert.equal(isShippedVersion(rel, 'x', { [rel]: [contentHash('x')] }), true, 'a custom list can be passed');
});

test('older shipped versions are listed too (history, not only the current file)', () => {
  assert.ok(SHIPPED_HASHES['skills/skill_monthly_retrospective.md'].length > 1);
  assert.ok(SHIPPED_HASHES[MATRIX].length >= 3);
});
