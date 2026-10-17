// Filesystem helpers shared by core use cases. No UI, no process exit.
import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Copy a directory tree, optionally transforming file contents and filtering entries.
 * @param {string} srcDir
 * @param {string} destDir
 * @param {{ replacer?: (content: string, srcPath: string) => string, filter?: (srcPath: string) => boolean }} [opts]
 */
export function copyDirRecursive(srcDir, destDir, { replacer = null, filter = null } = {}) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (filter && !filter(srcPath)) continue;
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, { replacer, filter });
    } else if (entry.isFile()) {
      const content = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, replacer ? replacer(content, srcPath) : content, 'utf8');
    }
  }
}

/** True when `child` is strictly inside `parent` (both resolved, no `..` escape). */
export function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Markdown file names (top level only) in `dir`, sorted; [] when the dir is missing. */
export function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort();
}
