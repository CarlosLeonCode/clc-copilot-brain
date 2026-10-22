// `upgrade`: preview and apply template updates to an existing brain (replace-with-backup, add-if-missing).
// Files a person edited are kept unless --force-skills. Messages follow the brain's language.
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { messageLanguage } from '../../core/brain-language.js';
import { t } from '../../core/i18n.js';
import { diffLines } from '../../core/text-diff.js';
import { generateHarnessAdapters, harnessReportHasChanges } from '../../core/harness-adapters.js';
import { applyUpgrade, planUpgrade } from '../../core/upgrade.js';

const MAX_DIFF_LINES = 40;
const MATRIX_REL = 'sales/qualification/qualification-matrix.md';

/** One plain line for a skipped file: edited files are "kept", other skips keep their reason code. */
function skipLine(s, say) {
  if (s.reason === 'edited-locally') return `  ${pc.yellow('~')} ${s.path} ${pc.dim(say('cli.upgrade.kept'))}`;
  return `  ${pc.yellow('~')} ${s.path} ${pc.dim(`(${s.reason})`)}`;
}

function renderKeptHints(skips, say) {
  const kept = skips.filter((s) => s.reason === 'edited-locally');
  if (kept.some((s) => s.path !== MATRIX_REL)) console.log(pc.dim(`  ${say('cli.upgrade.keptSkillsHint')}`));
  if (kept.some((s) => s.path === MATRIX_REL)) console.log(pc.dim(`  ${say('cli.upgrade.keptMatrixHint')}`));
}

function renderDiff(action, say) {
  const changed = diffLines(action.current ?? '', action.next).filter((l) => l.type !== 'same');
  const shown = changed.slice(0, MAX_DIFF_LINES).map((l) => (l.type === 'add' ? pc.green(`    + ${l.line}`) : pc.red(`    - ${l.line}`)));
  if (changed.length > MAX_DIFF_LINES) shown.push(pc.dim(`    ${say('cli.upgrade.moreLines', { count: changed.length - MAX_DIFF_LINES })}`));
  return shown.join('\n');
}

function renderPlan(actions, say) {
  const group = (kind) => actions.filter((a) => a.kind === kind);
  const adds = group('add');
  const replaces = group('replace');
  const skips = group('skip');
  if (adds.length) console.log('\n' + pc.bold(say('cli.upgrade.willAdd')) + '\n' + adds.map((a) => `  ${pc.green('+')} ${a.path}`).join('\n'));
  for (const a of replaces) {
    const verbs = { 'managed-block': 'cli.upgrade.willRefreshBlock', 'frontmatter-keys': 'cli.upgrade.willAddQualification' };
    const verb = say(verbs[a.policy] ?? 'cli.upgrade.willReplace');
    console.log(`\n${pc.bold(verb)} ${a.path} ${pc.dim(say('cli.upgrade.backup', { path: `${a.path}.bak` }))}\n${renderDiff(a, say)}`);
  }
  if (skips.length) {
    console.log('\n' + pc.bold(say('cli.upgrade.willSkip')) + '\n' + skips.map((s) => skipLine(s, say)).join('\n'));
    renderKeptHints(skips, say);
  }
}

// Shortcut files are regenerated from .agents/skills/ after the plan is applied; the preview covers what is on disk now.
function renderShortcutsPreview(preview, planTouchesSkills, say) {
  if (preview.removed.length) console.log('\n' + pc.bold(say('cli.upgrade.willRemoveShortcuts')) + '\n' + preview.removed.map((f) => `  ${pc.red('-')} ${f}`).join('\n'));
  if (preview.converted.length) console.log('\n' + pc.bold(say('cli.upgrade.willMoveSkills')) + '\n' + preview.converted.map((c) => `  ${pc.green('→')} ${c.from} → ${c.to}`).join('\n'));
  if (planTouchesSkills || preview.written.length) console.log('\n' + pc.bold(say('cli.upgrade.willRefreshShortcuts')) + pc.dim(say('cli.upgrade.shortcutFolders')));
  for (const w of preview.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
}

function renderShortcutsResult(report, say) {
  for (const f of report.removed) console.log(`  ${pc.red('-')} ${say('cli.upgrade.removed', { path: f })}`);
  for (const c of report.converted) console.log(`  ${pc.green('→')} ${say('cli.upgrade.moved', { from: c.from, to: c.to })}`);
  if (report.written.length) console.log(`  ${pc.green('✔')} ${say('cli.upgrade.refreshed', { count: report.written.length })}`);
  for (const w of report.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
}

function renderResult(result, say) {
  for (const path of result.added) console.log(`  ${pc.green('+')} ${say('cli.upgrade.added', { path })}`);
  for (const r of result.replaced) console.log(`  ${pc.green('✔')} ${say('cli.upgrade.replaced', { path: r.path })} ${pc.dim(say('cli.upgrade.backup', { path: r.backup }))}`);
  // Files kept because they were edited are already listed in the plan above.
  for (const s of result.skipped.filter((x) => x.reason !== 'edited-locally')) console.log(`  ${pc.yellow('~')} ${say('cli.upgrade.skipped', { path: s.path })} ${pc.dim(`(${s.reason})`)}`);
}

/**
 * Never writes without consent: --yes, or an interactive confirmation. Non-TTY without --yes only previews.
 * Edited template-owned files are kept unless --force-skills; a plan with only kept/skipped files is up to date.
 */
export async function runUpgrade(targetDir, options) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, vars) => t(lang, key, vars);
  p.intro(pc.bgCyan(pc.black(say('cli.upgrade.title'))));
  const plan = planUpgrade(targetDir, { forceSkills: options['force-skills'] === true });
  const preview = generateHarnessAdapters(targetDir, { dryRun: true });
  if (!plan.actions.some((a) => a.kind !== 'skip') && !harnessReportHasChanges(preview)) {
    const skips = plan.actions;
    if (skips.length) {
      console.log('\n' + skips.map((s) => skipLine(s, say)).join('\n'));
      renderKeptHints(skips, say);
    }
    for (const w of preview.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
    p.outro(pc.green(say('cli.upgrade.upToDate')));
    return 0;
  }
  renderPlan(plan.actions, say);
  renderShortcutsPreview(preview, plan.actions.some((a) => a.kind !== 'skip' && a.path.startsWith('.agents/skills/')), say);

  if (options['dry-run']) {
    p.outro(say('cli.upgrade.dryRun'));
    return 0;
  }
  let apply = options.yes === true;
  if (!apply && !process.stdin.isTTY) {
    // Non-zero so scripts and CI notice a pending upgrade that was not applied (spec S13.2).
    console.log(pc.yellow(`\n${say('cli.upgrade.notWritten')}`));
    return 1;
  }
  if (!apply) {
    apply = await p.confirm({ message: say('cli.upgrade.confirm'), initialValue: false });
    if (p.isCancel(apply) || !apply) {
      p.outro(say('cli.upgrade.cancelled'));
      return 0;
    }
  }
  console.log('');
  renderResult(applyUpgrade(targetDir, plan), say);
  renderShortcutsResult(generateHarnessAdapters(targetDir), say);
  p.outro(pc.green(say('cli.upgrade.done')));
  return 0;
}
