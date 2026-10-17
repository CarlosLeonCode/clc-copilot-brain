#!/usr/bin/env node
/**
 * Template Sync Guard
 * The repo root dogfoods the same commands and skills that `templates/base/`
 * scaffolds into new projects. Files under `.claude/commands/` and `skills/`
 * must exist on both sides and be byte-identical.
 * Managed sales skills in `templates/areas/sales/skills/*.md` must also be
 * byte-identical to the matching `skills/*.md`.
 * Intentionally NOT compared (filled-in at root): AGENTS.md, org-kernel.json,
 * `.agents/skills/`.
 * Self-contained: uses only Node.js built-ins.
 *
 * @param {string} targetDir - Directory to scan (defaults to cwd)
 * @returns {{ exitCode: number, skipped: boolean, name: string, data: object }}
 */
const fs = require('fs');
const path = require('path');

const NAME = 'check_template_sync';
const SYNCED_DIRS = ['.claude/commands', 'skills'];
const TEMPLATE_BASE = 'templates/base';
const SALES_SKILLS_DIR = 'templates/areas/sales/skills';

function listFiles(baseDir, relDir) {
  const out = [];
  const absDir = path.join(baseDir, relDir);
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(baseDir, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

const check = async function checkTemplateSync(targetDir) {
  const dir = path.resolve(targetDir || process.cwd());
  const templateDir = path.join(dir, TEMPLATE_BASE);

  if (!fs.existsSync(templateDir)) {
    return { exitCode: 0, skipped: true, name: NAME, data: { violations: [], message: `No ${TEMPLATE_BASE}/ directory found` } };
  }

  const violations = [];
  let compared = 0;

  for (const syncedDir of SYNCED_DIRS) {
    const rootFiles = new Set(listFiles(dir, syncedDir));
    const templateFiles = new Set(listFiles(templateDir, syncedDir));

    for (const rel of rootFiles) {
      if (!templateFiles.has(rel)) {
        violations.push({ file: rel, message: `Missing from ${TEMPLATE_BASE}/` });
        continue;
      }
      compared++;
      const a = fs.readFileSync(path.join(dir, rel));
      const b = fs.readFileSync(path.join(templateDir, rel));
      if (!a.equals(b)) {
        violations.push({ file: rel, message: `Content drift between root and ${TEMPLATE_BASE}/` });
      }
    }
    for (const rel of templateFiles) {
      if (!rootFiles.has(rel)) {
        violations.push({ file: `${TEMPLATE_BASE}/${rel}`, message: 'Missing from repo root' });
      }
    }
  }

  for (const rel of listFiles(dir, SALES_SKILLS_DIR)) {
    if (!rel.endsWith('.md') || rel.slice(SALES_SKILLS_DIR.length + 1).includes('/')) continue;
    const rootRel = `skills/${rel.slice(SALES_SKILLS_DIR.length + 1)}`;
    const rootAbs = path.join(dir, rootRel);
    if (!fs.existsSync(rootAbs)) {
      violations.push({ file: rel, message: `Missing from repo root (${rootRel})` });
      continue;
    }
    compared++;
    if (!fs.readFileSync(path.join(dir, rel)).equals(fs.readFileSync(rootAbs))) {
      violations.push({ file: rel, message: `Content drift between ${rootRel} and ${SALES_SKILLS_DIR}/` });
    }
  }

  return {
    exitCode: violations.length > 0 ? 1 : 0,
    skipped: false,
    name: NAME,
    data: {
      violations,
      message: violations.length > 0
        ? `${violations.length} template drift issue(s) between root and ${TEMPLATE_BASE}/`
        : `${compared} synced file(s) identical between root and ${TEMPLATE_BASE}/`,
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
