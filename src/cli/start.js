// Start screen for `clc-brain` with no command: where you are and the one next step, in plain words.
import pc from 'picocolors';
import { detectLanguage } from '../core/brain-language.js';
import { t } from '../core/i18n.js';
import { getBrainSummary } from '../core/setup-state.js';

const LANGUAGE_NAMES = Object.freeze({ en: 'English', es: 'Español' });
const SALES_PHRASES = Object.freeze(['phrase.logCall', 'phrase.howAreWeDoing', 'phrase.showSales']);
const GENERAL_PHRASES = Object.freeze(['phrase.whatCanYouDo', 'phrase.checkBrain', 'phrase.updateBrain']);

function outsideBrain(lang) {
  return [
    t(lang, 'start.notBrain'),
    t(lang, 'start.create', { command: pc.cyan(`clc-brain init ${t(lang, 'start.folder')}`) }),
    t(lang, 'start.openNew', { phrase: pc.bold(t(lang, 'phrase.setUp')) })
  ];
}

function insideBrain(brain) {
  const lang = brain.language;
  const lines = [
    pc.bold(t(lang, 'start.brainTitle', { name: brain.name })),
    t(lang, 'start.language', { language: LANGUAGE_NAMES[lang] ?? lang }),
    t(lang, `start.setup.${brain.setup}`),
    '',
    pc.bold(t(lang, 'start.nextStep'))
  ];
  if (brain.setup === 'pending') {
    lines.push(t(lang, 'start.openToSetUp', { phrase: pc.bold(t(lang, 'phrase.setUp')) }));
    return lines;
  }
  const hasSales = brain.areas.includes('sales');
  lines.push(t(lang, 'start.askExamples'));
  for (const key of hasSales ? SALES_PHRASES : GENERAL_PHRASES) lines.push(`  • ${pc.bold(t(lang, key))}`);
  if (hasSales) lines.push('', t(lang, 'start.salesPage', { command: pc.cyan('clc-brain view --open') }));
  if (brain.setup === 'unknown') lines.push(t(lang, 'start.notSetUp', { phrase: pc.bold(t(lang, 'phrase.setUp')) }));
  return lines;
}

/** Text of the start screen for `dir`: the brain's language inside a brain, the computer's language outside. */
export function renderStartScreen(dir, env = process.env) {
  const brain = getBrainSummary(dir);
  const lang = brain ? brain.language : detectLanguage(env);
  const body = brain ? insideBrain(brain) : outsideBrain(lang);
  return ['', ...body, '', t(lang, 'start.allCommands', { command: pc.cyan('clc-brain --help') }), ''].join('\n');
}
