#!/usr/bin/env node
/**
 * Package Files Coverage Guard
 * Walks relative imports transitively from every package.json `bin` entry and
 * verifies that each reached file is covered by package.json `files`.
 * A file not covered by `files` is missing from the published npm tarball,
 * which breaks the installed CLI at runtime.
 * Self-contained: uses only Node.js built-ins.
 *
 * @param {string} targetDir - Directory to scan (defaults to cwd)
 * @returns {{ exitCode: number, skipped: boolean, name: string, data: object }}
 */
const fs = require('fs');
const path = require('path');

const NAME = 'check_package_files';

const IMPORT_PATTERNS = [
  /\bimport\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[^'"`;]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function collectRelativeSpecifiers(source) {
  const specs = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (match[1].startsWith('./') || match[1].startsWith('../')) specs.add(match[1]);
    }
  }
  return [...specs];
}

function resolveFile(absPath) {
  const candidates = [absPath, `${absPath}.js`, `${absPath}.mjs`, path.join(absPath, 'index.js')];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {}
  }
  return null;
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

function normalizeEntry(entry) {
  return entry.replace(/^\.\//, '').replace(/\/+$/, '');
}

function isCovered(relPath, entries) {
  return entries.some(entry => relPath === entry || relPath.startsWith(`${entry}/`));
}

const check = async function checkPackageFiles(targetDir) {
  const dir = path.resolve(targetDir || process.cwd());
  const pkgPath = path.join(dir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: 'No package.json found' } };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    return {
      exitCode: 1, skipped: false, name: NAME,
      data: { violations: [{ file: 'package.json', message: `Invalid JSON: ${err.message}` }], message: 'package.json is not valid JSON' },
    };
  }

  const bins = typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin || {});
  if (bins.length === 0) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: 'No bin entries in package.json' } };
  }
  if (!Array.isArray(pkg.files)) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: 'No `files` whitelist in package.json (everything is published)' } };
  }

  const entries = pkg.files.map(normalizeEntry);
  const violations = [];
  const visited = new Set();
  const queue = [];

  for (const bin of bins) {
    const abs = resolveFile(path.resolve(dir, bin));
    if (abs) queue.push(abs);
    else violations.push({ file: 'package.json', message: `bin entry "${bin}" does not resolve to a file` });
  }

  while (queue.length > 0) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);

    const rel = toPosix(path.relative(dir, file));
    if (!isCovered(rel, entries)) {
      violations.push({ file: rel, message: 'Reachable from bin but not covered by package.json "files"' });
    }

    let source;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch (err) {
      violations.push({ file: rel, message: `Unreadable: ${err.message}` });
      continue;
    }

    for (const spec of collectRelativeSpecifiers(source)) {
      const resolved = resolveFile(path.resolve(path.dirname(file), spec));
      if (resolved) queue.push(resolved);
      else violations.push({ file: rel, message: `Unresolved relative import "${spec}"` });
    }
  }

  return {
    exitCode: violations.length > 0 ? 1 : 0,
    skipped: false,
    name: NAME,
    data: {
      violations,
      message: violations.length > 0
        ? `${violations.length} file(s) reachable from bin are not published (missing from package.json "files")`
        : `All ${visited.size} file(s) reachable from bin are covered by package.json "files"`,
    },
  };
};

module.exports = check;

if (require.main === module) {
  check(process.argv[2]).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode);
  });
}
