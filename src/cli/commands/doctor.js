// `doctor`: render the core health audit and optionally apply non-destructive repairs.
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { repairBrain, runDoctor } from '../../core/doctor.js';

/** Exit code contract: 1 when the audited brain has any error; warnings alone keep 0. */
export async function runDoctorCommand(targetDir, options) {
  p.intro(pc.bgCyan(pc.black(' Second Brain Doctor (Health & Integrity Audit) ')));
  p.note(`Inspecting repository at: ${pc.bold(targetDir)}`, 'Doctor Diagnostic');

  const result = runDoctor(targetDir);
  for (const message of result.passed) console.log(`  ${pc.green('✔')} ${message}`);

  console.log('\n' + pc.bold('=== Audit Summary ==='));
  console.log(`Checks passed: ${pc.green(result.checksPassed)}`);
  console.log(`Warnings: ${pc.yellow(result.warnings)}`);
  console.log(`Errors: ${pc.red(result.errors)}`);

  if (result.healthy) {
    console.log(pc.green('\n✔ All Second Brain health checks passed with zero errors or warnings!\n'));
    p.outro(pc.green('Repository is in pristine condition.'));
    return 0;
  }

  console.log('\n' + pc.bold('Issues Found:'));
  for (const issue of result.issues) {
    console.log(`  ${issue.level === 'error' ? pc.red('[ERROR]') : pc.yellow('[WARN]')} ${issue.message}`);
  }

  let finalResult = result;
  const repairable = result.issues.filter((i) => i.repairable);
  if (repairable.length > 0) {
    let doRepair = options.fix;
    if (doRepair === undefined && !process.stdin.isTTY) {
      // Non-interactive (CI): never prompt, since a closed stdin would leave the prompt pending forever.
      console.log(pc.yellow(`\nDetected ${repairable.length} repairable issue(s). Re-run with --fix to repair them.`));
      doRepair = false;
    } else if (doRepair === undefined) {
      doRepair = await p.confirm({ message: `Detected ${repairable.length} repairable issue(s). Automatically fix them now?`, initialValue: true });
    }
    if (doRepair && !p.isCancel(doRepair)) {
      repairBrain(targetDir);
      console.log(pc.green('\n✔ Repaired missing and misconfigured IDE adapters, slash commands, and skills!'));
      finalResult = runDoctor(targetDir);
    }
  }

  if (finalResult.errors > 0) {
    p.outro(pc.red(`Doctor found ${finalResult.errors} error(s) that need manual attention.`));
    return 1;
  }
  p.outro(pc.yellow('Doctor finished with suggestions.'));
  return 0;
}
