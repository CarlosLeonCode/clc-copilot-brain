// `doctor`: render the core health audit and optionally apply non-destructive repairs, in the brain's language.
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { messageLanguage } from '../../core/brain-language.js';
import { repairBrain, runDoctor } from '../../core/doctor.js';
import { t } from '../../core/i18n.js';

/** Exit code contract: 1 when the audited brain has any error; warnings alone keep 0. */
export async function runDoctorCommand(targetDir, options) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, vars) => t(lang, key, vars);
  p.intro(pc.bgCyan(pc.black(say('cli.doctor.title'))));
  p.note(say('cli.doctor.inspecting', { dir: pc.bold(targetDir) }), say('cli.doctor.noteTitle'));

  const result = runDoctor(targetDir, { lang });
  for (const message of result.passed) console.log(`  ${pc.green('✔')} ${message}`);

  console.log('\n' + pc.bold(say('cli.doctor.summary')));
  console.log(say('cli.doctor.passed', { count: pc.green(result.checksPassed) }));
  console.log(say('cli.doctor.warnings', { count: pc.yellow(result.warnings) }));
  console.log(say('cli.doctor.errors', { count: pc.red(result.errors) }));

  if (result.healthy) {
    console.log(pc.green(`\n${say('cli.doctor.healthy')}\n`));
    p.outro(pc.green(say('cli.doctor.pristine')));
    return 0;
  }

  console.log('\n' + pc.bold(say('cli.doctor.issues')));
  for (const issue of result.issues) {
    console.log(`  ${issue.level === 'error' ? pc.red(say('cli.doctor.errorTag')) : pc.yellow(say('cli.doctor.warnTag'))} ${issue.message}`);
  }

  let finalResult = result;
  const repairable = result.issues.filter((i) => i.repairable);
  if (repairable.length > 0) {
    let doRepair = options.fix;
    if (doRepair === undefined && !process.stdin.isTTY) {
      // Non-interactive (CI): never prompt, since a closed stdin would leave the prompt pending forever.
      console.log(pc.yellow(`\n${say('cli.doctor.rerunFix', { count: repairable.length })}`));
      doRepair = false;
    } else if (doRepair === undefined) {
      doRepair = await p.confirm({ message: say('cli.doctor.confirmFix', { count: repairable.length }), initialValue: true });
    }
    if (doRepair && !p.isCancel(doRepair)) {
      repairBrain(targetDir);
      console.log(pc.green(`\n${say('cli.doctor.repaired')}`));
      finalResult = runDoctor(targetDir, { lang });
    }
  }

  if (finalResult.errors > 0) {
    p.outro(pc.red(say('cli.doctor.errorsLeft', { count: finalResult.errors })));
    return 1;
  }
  p.outro(pc.yellow(say('cli.doctor.suggestions')));
  return 0;
}
