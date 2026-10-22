// `view`: write the visual sales system page and optionally open it in the default browser, in the brain's language.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import pc from 'picocolors';
import path from 'node:path';
import { messageLanguage } from '../../core/brain-language.js';
import { BrainError } from '../../core/errors.js';
import { t } from '../../core/i18n.js';
import { loadDraft, writeSalesPreview, writeSalesView } from '../../core/sales-view.js';

function openerFor(file, platform = process.platform) {
  if (platform === 'darwin') return ['open', [file]];
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', file]];
  return ['xdg-open', [file]];
}

function openInBrowser(file, say) {
  const hint = () => console.log(pc.yellow(say('cli.view.openFailed', { file })));
  try {
    const [command, args] = openerFor(file);
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', hint);
    child.unref();
  } catch {
    hint();
  }
}

function reportPages(pages, targetDir, say) {
  for (const slug of pages.written) console.log(pc.green(say('cli.view.scriptPage', { file: path.join(targetDir, 'sales', 'scripts', `${slug}.html`) })));
  for (const { slug, reason } of pages.skipped) console.log(pc.yellow(say('cli.view.noScriptPage', { slug, reason })));
}

async function runPreview(targetDir, options, say) {
  if (!Array.isArray(options.draft)) throw new BrainError('DRAFT_INVALID', say('cli.view.draftMissing'));
  const drafts = options.draft.map((file) => loadDraft(path.resolve(process.cwd(), file)));
  const { outputPath, drafts: statuses, draftPages } = writeSalesPreview(targetDir, { drafts });
  const badScripts = statuses.filter((d) => d.kind === 'script' && !d.ok);
  if (badScripts.length > 0) {
    fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
    for (const d of badScripts) {
      console.log(pc.yellow(say('cli.view.draftNeedsFix', { file: path.basename(d.path) })));
      for (const e of d.errors) console.log(`  ${say('library.line', { line: e.line, message: e.message })}`);
    }
    return 1;
  }
  console.log(pc.green(say('cli.view.previewReady', { file: outputPath })));
  for (const [slug, file] of Object.entries(draftPages)) console.log(say('cli.view.scriptPreview', { slug, file }));
  const broken = statuses.filter((d) => !d.ok);
  for (const d of broken) console.log(pc.yellow(say('cli.view.draftDiagram', { file: path.basename(d.path), error: d.error })));
  if (broken.length > 0) return 1;
  const firstScript = Object.values(draftPages)[0];
  if (options.open) openInBrowser(firstScript ?? outputPath, say);
  else console.log(say('cli.view.openHintDraft', { flag: pc.cyan('--open') }));
  return 0;
}

// Core errors are worded in English; the ones a person meets here are re-worded in their language.
const ERROR_KEYS = Object.freeze({ NOT_A_BRAIN: 'cli.view.notBrain', NO_SALES_SYSTEM: 'cli.view.noSalesSystem' });
const DRAFT_KEYS = Object.freeze({ unreadable: 'cli.view.draftUnreadable', 'unknown-kind': 'cli.view.draftUnknown' });

function localized(err, targetDir, say) {
  if (!(err instanceof BrainError)) return err;
  const key = ERROR_KEYS[err.code] ?? (err.code === 'DRAFT_INVALID' ? DRAFT_KEYS[err.details?.reason] : undefined);
  return key ? new BrainError(err.code, say(key, { dir: targetDir, file: err.details?.file ?? '' }), err.details) : err;
}

export async function runView(targetDir, options) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, vars) => t(lang, key, vars);
  try {
    if (options.draft) return await runPreview(targetDir, options, say);
    const { outputPath, pages } = writeSalesView(targetDir);
    console.log(pc.green(say('cli.view.ready', { file: outputPath })));
    reportPages(pages, targetDir, say);
    if (options.open) openInBrowser(outputPath, say);
    else console.log(say('cli.view.openHint', { command: pc.cyan('clc-brain view --open') }));
    return 0;
  } catch (err) {
    throw localized(err, targetDir, say);
  }
}
