// `view`: write the visual sales system page and optionally open it in the default browser.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import pc from 'picocolors';
import path from 'node:path';
import { BrainError } from '../../core/errors.js';
import { loadDraft, writeSalesPreview, writeSalesView } from '../../core/sales-view.js';

function openerFor(file, platform = process.platform) {
  if (platform === 'darwin') return ['open', [file]];
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', file]];
  return ['xdg-open', [file]];
}

function openInBrowser(file) {
  const hint = () => console.log(pc.yellow(`Could not open the page automatically. Open this file in your browser:\n  ${file}`));
  try {
    const [command, args] = openerFor(file);
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', hint);
    child.unref();
  } catch {
    hint();
  }
}

function reportPages(pages, targetDir) {
  for (const slug of pages.written) console.log(pc.green(`Script page ready: ${path.join(targetDir, 'sales', 'scripts', `${slug}.html`)}`));
  for (const { slug, reason } of pages.skipped) console.log(pc.yellow(`The script "${slug}" has no page: ${reason}`));
}

async function runPreview(targetDir, options) {
  if (!Array.isArray(options.draft)) throw new BrainError('DRAFT_INVALID', 'Add the draft file after --draft, for example: clc-brain view --draft ./cold-call-draft.md');
  const drafts = options.draft.map((file) => loadDraft(path.resolve(process.cwd(), file)));
  const { outputPath, drafts: statuses, draftPages } = writeSalesPreview(targetDir, { drafts });
  const badScripts = statuses.filter((d) => d.kind === 'script' && !d.ok);
  if (badScripts.length > 0) {
    fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
    for (const d of badScripts) {
      console.log(pc.yellow(`The script draft ${path.basename(d.path)} needs fixing before it can be previewed:`));
      for (const e of d.errors) console.log(`  line ${e.line}: ${e.message}`);
    }
    return 1;
  }
  console.log(pc.green(`Preview ready (nothing is saved yet): ${outputPath}`));
  for (const [slug, file] of Object.entries(draftPages)) console.log(`Script preview "${slug}": ${file}`);
  const broken = statuses.filter((d) => !d.ok);
  for (const d of broken) {
    console.log(pc.yellow(`The diagram in the draft ${path.basename(d.path)} can't be drawn (${d.error}). Fix the draft and preview it again.`));
  }
  if (broken.length > 0) return 1;
  const firstScript = Object.values(draftPages)[0];
  if (options.open) openInBrowser(firstScript ?? outputPath);
  else console.log(`Open it in your browser, or add ${pc.cyan('--open')}.`);
  return 0;
}

export async function runView(targetDir, options) {
  if (options.draft) return runPreview(targetDir, options);
  const { outputPath, pages } = writeSalesView(targetDir);
  console.log(pc.green(`Your sales system page is ready: ${outputPath}`));
  reportPages(pages, targetDir);
  if (options.open) openInBrowser(outputPath);
  else console.log(`Open it in your browser, or run ${pc.cyan('clc-brain view --open')}.`);
  return 0;
}
