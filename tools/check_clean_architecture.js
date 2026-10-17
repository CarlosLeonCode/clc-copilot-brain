#!/usr/bin/env node
/**
 * Clean Architecture Guard
 * Enforces the `clean_architecture` rule from .clckernel.yaml:
 * "Domain logic must be isolated from the CLI interface."
 *   (a) Every file under bin/ stays a thin entrypoint (<= MAX_BIN_LINES lines).
 *   (b) Files under src/core/ must not depend on UI packages or on the
 *       interface layers (src/cli/, src/mcp/, bin/).
 * Self-contained: uses only Node.js built-ins.
 *
 * @param {string} targetDir - Directory to scan (defaults to cwd)
 * @returns {{ exitCode: number, skipped: boolean, name: string, data: object }}
 */
const MAX_BIN_LINES = 150;
const FORBIDDEN_CORE_PACKAGES = ['@clack/prompts', 'picocolors'];
const FORBIDDEN_CORE_LAYERS = ['src/cli', 'src/mcp', 'bin'];

const fs = require('fs');
const path = require('path');

const NAME = 'check_clean_architecture';
const SOURCE_EXT = /\.(c|m)?js$/;

const SPECIFIER_PATTERNS = [
  /\bimport\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[^'"`;]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function walk(absDir) {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function countLines(source) {
  if (source.length === 0) return 0;
  const lines = source.split('\n');
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

function specifiers(source) {
  const found = [];
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) found.push(match[1]);
  }
  return found;
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

const check = async function checkCleanArchitecture(targetDir) {
  const dir = path.resolve(targetDir || process.cwd());
  const binDir = path.join(dir, 'bin');
  const coreDir = path.join(dir, 'src', 'core');

  if (!fs.existsSync(binDir) && !fs.existsSync(coreDir)) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: 'No bin/ or src/core/ directory found' } };
  }

  const violations = [];

  for (const file of walk(binDir)) {
    const lines = countLines(fs.readFileSync(file, 'utf8'));
    if (lines > MAX_BIN_LINES) {
      violations.push({
        file: toPosix(path.relative(dir, file)),
        message: `${lines} lines exceeds the ${MAX_BIN_LINES}-line limit for bin/ entrypoints; move logic into src/`,
      });
    }
  }

  for (const file of walk(coreDir).filter(f => SOURCE_EXT.test(f))) {
    const rel = toPosix(path.relative(dir, file));
    for (const spec of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (FORBIDDEN_CORE_PACKAGES.some(pkg => spec === pkg || spec.startsWith(`${pkg}/`))) {
        violations.push({ file: rel, message: `Domain core imports UI package "${spec}"` });
        continue;
      }
      if (!spec.startsWith('.')) continue;
      const target = toPosix(path.relative(dir, path.resolve(path.dirname(file), spec)));
      const layer = FORBIDDEN_CORE_LAYERS.find(l => target === l || target.startsWith(`${l}/`));
      if (layer) {
        violations.push({ file: rel, message: `Domain core imports interface layer "${spec}" (${layer}/)` });
      }
    }
  }

  return {
    exitCode: violations.length > 0 ? 1 : 0,
    skipped: false,
    name: NAME,
    data: {
      violations,
      message: violations.length > 0
        ? `${violations.length} clean architecture violation(s): domain logic is not isolated from the CLI interface`
        : 'bin/ entrypoints are thin and src/core/ is isolated from interface layers',
    },
  };
};

module.exports = check;
module.exports.MAX_BIN_LINES = MAX_BIN_LINES;

if (require.main === module) {
  check(process.argv[2]).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode);
  });
}
