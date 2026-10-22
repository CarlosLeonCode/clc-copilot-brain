// `init`: collect organization details (flags, --yes defaults, or prompts) and scaffold via core.
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PRESET_AREAS, PRESET_AREA_IDS } from '../../core/areas.js';
import { LANGUAGE_HELP, detectLanguage, parseLanguage } from '../../core/brain-language.js';
import { BrainError } from '../../core/errors.js';
import { DEFAULT_METHODOLOGY, METHODOLOGY_HELP, parseBuiltInMethodology } from '../../core/methodology.js';
import { hasText, t } from '../../core/i18n.js';
import { writeSalesView } from '../../core/sales-view.js';
import { INIT_DEFAULTS, initBrain } from '../../core/scaffold.js';
import { ask } from '../prompt.js';
import { reportAdapterBackups } from '../render.js';

const required = (label) => (val) => (!val || !val.trim() ? `${label} is required` : undefined);

async function textOption(value, options, prompt) {
  if (value) return value;
  if (options.yes) return prompt.defaultValue;
  return ask(p.text(prompt), 'Setup cancelled.');
}

async function chooseAreas(options) {
  if (options.areas) return options.areas.split(',').map((s) => s.trim());
  if (options.yes) return [...PRESET_AREA_IDS];
  return ask(p.multiselect({
    message: 'Select the operational areas to install in your Second Brain:',
    options: PRESET_AREAS.map((a) => ({ value: a.id, label: `${a.name} - ${a.description}`, hint: a.defaultSelected ? 'recommended' : undefined })),
    initialValues: ['sales', 'marketing'],
    required: true
  }), 'Setup cancelled.');
}

async function chooseDemo(options) {
  if (options.demo === true) return true;
  if (options.clean || options.yes) return false;
  const mode = await ask(p.select({
    message: 'How would you like to initialize your knowledge base?',
    options: [
      { value: 'clean', label: 'Clean Repository (Recommended)', hint: 'Empty folders, schemas, and blank templates — no mock data' },
      { value: 'demo', label: 'With Demo Samples', hint: 'Includes mock battlecards and calls to explore the engine' }
    ],
    initialValue: 'clean'
  }), 'Setup cancelled.');
  return mode === 'demo';
}

/** --language when passed (must be en or es); the computer's language with --yes or without a terminal; else a prompt. */
async function chooseLanguage(options, detected) {
  if (options.language !== undefined) return parseLanguage(options.language);
  if (options.yes || !process.stdin.isTTY) return detected;
  return ask(p.select({
    message: 'Language for your brain / Idioma de tu cerebro',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' }
    ],
    initialValue: detected
  }), 'Setup cancelled.');
}

/**
 * --methodology when passed (meddpicc or sandler); meddpicc with --yes, without a terminal, or without the sales area
 * (it only shapes the sales starter set); else a plain question in the brain language.
 */
async function chooseMethodology(options, language, areas) {
  if (options.methodology !== undefined) return parseBuiltInMethodology(options.methodology);
  if (options.yes || !process.stdin.isTTY || !areas.includes('sales')) return DEFAULT_METHODOLOGY;
  return ask(p.select({
    message: t(language, 'init.methodology.question'),
    options: [
      { value: 'meddpicc', label: t(language, 'init.methodology.meddpicc') },
      { value: 'sandler', label: t(language, 'init.methodology.sandler') }
    ],
    initialValue: DEFAULT_METHODOLOGY
  }), 'Setup cancelled.');
}

export async function runInit(targetDir, options) {
  if (options.language !== undefined && !parseLanguage(options.language)) {
    throw new BrainError('INVALID_LANGUAGE', LANGUAGE_HELP);
  }
  if (options.methodology !== undefined && !parseBuiltInMethodology(options.methodology)) {
    throw new BrainError('INVALID_METHODOLOGY', METHODOLOGY_HELP);
  }
  fs.mkdirSync(targetDir, { recursive: true });
  p.intro(pc.bgCyan(pc.black(' Open Source Second Brain Engine ')));
  p.note(`Target Directory: ${pc.bold(targetDir)}`, 'Configuration Target');

  if (fs.existsSync(path.join(targetDir, 'org-kernel.json')) && !options.yes) {
    const overwrite = await p.confirm({ message: 'An existing Second Brain was found in this directory. Do you want to update/re-initialize it?', initialValue: false });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Initialization aborted.');
      return 0;
    }
  }

  const companyName = await textOption(options.name, options, { message: 'What is the name of your organization / project?', defaultValue: INIT_DEFAULTS.companyName, validate: required('Company name') });
  const industry = await textOption(options.industry, options, { message: 'What industry or domain do you operate in?', defaultValue: INIT_DEFAULTS.industry, validate: required('Industry') });
  const tagline = await textOption(options.tagline, options, { message: 'What is your core tagline or mission?', placeholder: INIT_DEFAULTS.tagline, defaultValue: INIT_DEFAULTS.tagline });
  const language = await chooseLanguage(options, detectLanguage(process.env));
  const areas = await chooseAreas(options);
  const methodology = await chooseMethodology(options, language, areas);
  const demo = await chooseDemo(options);

  const spin = p.spinner();
  spin.start(t(language, 'init.scaffolding'));
  let result;
  try {
    result = initBrain(targetDir, { companyName, industry, tagline, areas, demo, language, methodology });
  } catch (err) {
    spin.stop(pc.red(t(language, 'init.failed')));
    throw err;
  }
  spin.stop(pc.green(t(language, 'init.success')));
  reportAdapterBackups(result.adapters);

  const absDir = path.resolve(targetDir);
  const salesPage = areas.includes('sales') && tryWriteSalesView(absDir);
  p.note(renderNextSteps({ absDir, areas, demo, salesPage, language }), t(language, 'init.nextSteps'));
  // Printed outside the note box so the JSON stays copy-pasteable (the box wraps long lines).
  console.log(`${pc.bold(t(language, 'init.mcp'))}\n`);
  console.log(JSON.stringify({ mcpServers: { [path.basename(absDir)]: { command: 'clc-brain', args: ['mcp', absDir] } } }, null, 2));
  console.log(`\n${t(language, 'init.webChat', { dir: pc.cyan('skills/integrations/'), command: pc.cyan('clc-brain doctor') })}\n`);
  p.outro(pc.bold(pc.green(t(language, 'init.welcome', { name: companyName }))));
  return 0;
}

/** Generate the sales system page; a failure here must never break init. */
function tryWriteSalesView(absDir) {
  try {
    writeSalesView(absDir);
    return true;
  } catch {
    return false;
  }
}

// One example question per preset area (init.example.<area>), answered from that area's files once onboarding seeds them.
const MAX_EXAMPLES = 3;

/** The guided path from an empty brain to a first grounded answer, tailored to the installed areas, in the brain language. */
function renderNextSteps({ absDir, areas, demo, salesPage, language }) {
  const examples = areas.filter((a) => hasText(language, `init.example.${a}`)).slice(0, MAX_EXAMPLES)
    .map((a) => `   • ${pc.bold(t(language, `init.example.${a}`))}`);
  const steps = [
    t(language, 'init.step1', { dir: pc.cyan(absDir) }),
    t(language, 'init.step2', { phrase: pc.bold(t(language, 'phrase.setUp')), hi: pc.bold(t(language, 'phrase.hi')) }),
    examples.length > 0 ? `${t(language, 'init.step3')}\n${examples.join('\n')}` : t(language, 'init.step3Plain')
  ];
  if (salesPage) steps.push(`\n${t(language, 'init.salesPage', { file: pc.cyan('sales/sales-system.html') })}`);
  if (demo) steps.push(`\n${t(language, 'init.demo', { command: pc.cyan('clc-brain clean-demo') })}`);
  return steps.join('\n');
}
