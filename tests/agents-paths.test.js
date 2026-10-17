import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Repo-relative paths mentioned in backticks or markdown links of the root AGENTS.md.
function referencedPaths(markdown) {
  const candidates = new Set();
  for (const m of markdown.matchAll(/`([^`\s]+)`/g)) candidates.add(m[1]);
  for (const m of markdown.matchAll(/\]\((\.\/[^)\s]+)\)/g)) candidates.add(m[1]);
  return [...candidates]
    .map((p) => p.replace(/^\.\//, '').replace(/\s*->.*$/, ''))
    .filter((p) => /^[\w.-]+(\/[\w.:*-]*)*$/.test(p) && (p.includes('/') || /\.(md|json)$/.test(p)))
    .filter((p) => !p.includes('*') && !p.includes('YYYY') && !p.startsWith('@') && !p.startsWith('http'));
}

test('every repository path referenced in root AGENTS.md exists', () => {
  const agents = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
  const paths = referencedPaths(agents);
  assert.ok(paths.length > 10, 'expected AGENTS.md to reference repository paths');
  const missing = paths.filter((p) => !fs.existsSync(path.join(REPO_ROOT, p)));
  assert.deepStrictEqual(missing, [], `AGENTS.md references missing paths: ${missing.join(', ')}`);
});
