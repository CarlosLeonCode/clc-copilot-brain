// `upgrade`: preview and apply template updates to an existing brain (replace-with-backup, add-if-missing).
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { diffLines } from '../../core/text-diff.js';
import { generateHarnessAdapters, harnessReportHasChanges } from '../../core/harness-adapters.js';
import { applyUpgrade, planUpgrade } from '../../core/upgrade.js';

const MAX_DIFF_LINES = 40;

function renderDiff(action) {
  const changed = diffLines(action.current ?? '', action.next).filter((l) => l.type !== 'same');
  const shown = changed.slice(0, MAX_DIFF_LINES).map((l) => (l.type === 'add' ? pc.green(`    + ${l.line}`) : pc.red(`    - ${l.line}`)));
  if (changed.length > MAX_DIFF_LINES) shown.push(pc.dim(`    ... ${changed.length - MAX_DIFF_LINES} more changed line(s)`));
  return shown.join('\n');
}

function renderPlan(actions) {
  const group = (kind) => actions.filter((a) => a.kind === kind);
  const adds = group('add');
  const replaces = group('replace');
  const skips = group('skip');
  if (adds.length) console.log('\n' + pc.bold('Will add (new files):') + '\n' + adds.map((a) => `  ${pc.green('+')} ${a.path}`).join('\n'));
  for (const a of replaces) {
    const verbs = { 'managed-block': 'Will refresh the assistant rules block in', 'frontmatter-keys': 'Will add the qualification list to' };
    const verb = verbs[a.policy] ?? 'Will replace';
    console.log(`\n${pc.bold(verb)} ${a.path} ${pc.dim('(backup: ' + a.path + '.bak)')}\n${renderDiff(a)}`);
  }
  if (skips.length) console.log('\n' + pc.bold('Will skip:') + '\n' + skips.map((a) => `  ${pc.yellow('~')} ${a.path} ${pc.dim(`(${a.reason})`)}`).join('\n'));
}

// Shortcut files are regenerated from .agents/skills/ after the plan is applied; the preview covers what is on disk now.
function renderShortcutsPreview(preview, planTouchesSkills) {
  if (preview.removed.length) console.log('\n' + pc.bold('Will remove old shortcut files (unchanged copies we shipped):') + '\n' + preview.removed.map((p) => `  ${pc.red('-')} ${p}`).join('\n'));
  if (preview.converted.length) console.log('\n' + pc.bold('Will move skills into their own folder:') + '\n' + preview.converted.map((c) => `  ${pc.green('→')} ${c.from} → ${c.to}`).join('\n'));
  if (planTouchesSkills || preview.written.length) console.log('\n' + pc.bold('Will refresh the slash-command shortcuts') + pc.dim(' (.claude/skills/, .gemini/commands/, .windsurf/workflows/) from .agents/skills/'));
  for (const w of preview.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
}

function renderShortcutsResult(report) {
  for (const p of report.removed) console.log(`  ${pc.red('-')} removed ${p}`);
  for (const c of report.converted) console.log(`  ${pc.green('→')} moved ${c.from} to ${c.to}`);
  if (report.written.length) console.log(`  ${pc.green('✔')} refreshed ${report.written.length} slash-command shortcut file(s)`);
  for (const w of report.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
}

function renderResult(result) {
  for (const path of result.added) console.log(`  ${pc.green('+')} added ${path}`);
  for (const r of result.replaced) console.log(`  ${pc.green('✔')} replaced ${r.path} ${pc.dim(`(backup: ${r.backup})`)}`);
  for (const s of result.skipped) console.log(`  ${pc.yellow('~')} skipped ${s.path} ${pc.dim(`(${s.reason})`)}`);
}

/** Never writes without consent: --yes, or an interactive confirmation. Non-TTY without --yes only previews. */
export async function runUpgrade(targetDir, options) {
  p.intro(pc.bgCyan(pc.black(' Second Brain Upgrade ')));
  const plan = planUpgrade(targetDir);
  const preview = generateHarnessAdapters(targetDir, { dryRun: true });
  if (plan.actions.length === 0 && !harnessReportHasChanges(preview)) {
    for (const w of preview.warnings) console.log(`  ${pc.yellow('!')} ${w}`);
    p.outro(pc.green('Brain is up to date: nothing to do.'));
    return 0;
  }
  renderPlan(plan.actions);
  renderShortcutsPreview(preview, plan.actions.some((a) => a.kind !== 'skip' && a.path.startsWith('.agents/skills/')));

  if (options['dry-run']) {
    p.outro('Dry run: no files were changed.');
    return 0;
  }
  let apply = options.yes === true;
  if (!apply && !process.stdin.isTTY) {
    // Non-zero so scripts and CI notice a pending upgrade that was not applied (spec S13.2).
    console.log(pc.yellow('\nNo changes written. Re-run with --yes to apply this plan.'));
    return 1;
  }
  if (!apply) {
    apply = await p.confirm({ message: 'Apply these changes? (replaced files keep a .bak copy)', initialValue: false });
    if (p.isCancel(apply) || !apply) {
      p.outro('Cancelled: no files were changed.');
      return 0;
    }
  }
  console.log('');
  renderResult(applyUpgrade(targetDir, plan));
  renderShortcutsResult(generateHarnessAdapters(targetDir));
  p.outro(pc.green('Upgrade complete.'));
  return 0;
}
