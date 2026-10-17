import { test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function packedFiles() {
  // --dry-run --json lists the tarball contents without writing it; --ignore-scripts and
  // --offline keep the check fast and network-free.
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-pack-cache-'));
  try {
    const out = execFileSync(
      'npm',
      ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline', '--cache', cache],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const [manifest] = JSON.parse(out);
    return new Set(manifest.files.map((f) => f.path));
  } finally {
    fs.rmSync(cache, { recursive: true, force: true });
  }
}

test('published package contains every runtime module reachable from bin', () => {
  const files = packedFiles();
  const required = [
    'bin/cli.js',
    'src/mcp/server.js',
    'src/mcp/tools.js',
    'src/mcp/prompts.js',
    'src/core/schema-validator.js',
    'schemas/sales-objection.schema.json',
  ];
  const missing = required.filter((f) => !files.has(f));
  assert.deepStrictEqual(missing, [], `Missing from npm pack: ${missing.join(', ')}`);
});

test('package.json requires a supported Node.js runtime (>=22)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.engines.node, '>=22');
});
