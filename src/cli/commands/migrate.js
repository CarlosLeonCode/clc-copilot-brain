// `migrate`: show the plan that brings an older brain to today's formats; apply it only with --yes.
// Messages follow the brain's language. Nothing is deleted; changed files keep a .bak copy.
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { messageLanguage } from '../../core/brain-language.js';
import { BrainError } from '../../core/errors.js';
import { t } from '../../core/i18n.js';
import { applyMigration, planMigration } from '../../core/migrate.js';

const CHANGE_KEYS = Object.freeze({
  methodology: 'cli.migrate.methodology',
  'script-header': 'cli.migrate.scriptHeader',
  'glossary-link': 'cli.migrate.glossaryLink'
});
const NOTE_KEYS = Object.freeze({
  'script-convert': 'cli.migrate.scriptConvert',
  'industry-rows': 'cli.migrate.industryRows',
  'legacy-sample': 'cli.migrate.legacySample'
});

const vars = (step) => ({ path: step.path ?? '', method: step.methodology ?? '', file: step.glossary ?? '', count: step.count ?? 0 });

function renderPlan(plan, say) {
  const changes = plan.steps.filter((s) => s.change);
  const notes = plan.steps.filter((s) => !s.change);
  if (changes.length) {
    console.log('\n' + pc.bold(say('cli.migrate.willChange')));
    for (const step of changes) {
      const blocked = step.blocked ? ` ${pc.yellow(say('cli.migrate.blocked', { path: `${step.path}.bak` }))}` : '';
      console.log(`  ${pc.green('~')} ${say(CHANGE_KEYS[step.id], vars(step))}${blocked}`);
    }
  }
  if (notes.length) {
    console.log('\n' + pc.bold(say('cli.migrate.notes')));
    for (const step of notes) console.log(`  ${pc.cyan('i')} ${say(NOTE_KEYS[step.id], vars(step))}`);
  }
}

export async function runMigrate(targetDir, options) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, values) => t(lang, key, values);
  p.intro(pc.bgCyan(pc.black(say('cli.migrate.title'))));
  let plan;
  try {
    plan = planMigration(targetDir);
  } catch (err) {
    if (err instanceof BrainError && err.code === 'NOT_A_BRAIN') throw new BrainError(err.code, say('cli.notBrain', { dir: targetDir }), err.details);
    throw err;
  }
  const pending = plan.steps.filter((s) => s.change && !s.blocked);
  renderPlan(plan, say);
  if (pending.length === 0) {
    p.outro(pc.green(say(plan.steps.length ? 'cli.migrate.nothingToApply' : 'cli.migrate.nothing')));
    return 0;
  }
  if (options.yes !== true) {
    p.outro(say('cli.migrate.dryRun', { flag: pc.cyan('--yes') }));
    return 0;
  }
  console.log('');
  const result = applyMigration(targetDir, plan);
  for (const rel of result.applied) console.log(`  ${pc.green('✔')} ${say('cli.migrate.applied', { path: rel, backup: `${rel}.bak` })}`);
  for (const s of result.skipped) console.log(`  ${pc.yellow('~')} ${say(`cli.migrate.skipped.${s.reason}`, { path: s.path, backup: `${s.path}.bak` })}`);
  p.outro(pc.green(say('cli.migrate.done')));
  return 0;
}
