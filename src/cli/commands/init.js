// `init`: collect organization details (flags, --yes defaults, or prompts) and scaffold via core.
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PRESET_AREAS, PRESET_AREA_IDS } from '../../core/areas.js';
import { LANGUAGE_HELP, detectLanguage, parseLanguage } from '../../core/brain-language.js';
import { BrainError } from '../../core/errors.js';
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

export async function runInit(targetDir, options) {
  if (options.language !== undefined && !parseLanguage(options.language)) {
    throw new BrainError('INVALID_LANGUAGE', LANGUAGE_HELP);
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

  const companyName = await textOption(options.name, options, { message: 'What is the name of your organization / project?', placeholder: 'Acme Corporation', defaultValue: INIT_DEFAULTS.companyName, validate: required('Company name') });
  const industry = await textOption(options.industry, options, { message: 'What industry or domain do you operate in?', placeholder: 'Enterprise Developer Tools & AI', defaultValue: INIT_DEFAULTS.industry, validate: required('Industry') });
  const tagline = await textOption(options.tagline, options, { message: 'What is your core tagline or mission?', placeholder: INIT_DEFAULTS.tagline, defaultValue: INIT_DEFAULTS.tagline });
  const language = await chooseLanguage(options, detectLanguage(process.env));
  const areas = await chooseAreas(options);
  const demo = await chooseDemo(options);

  const spin = p.spinner();
  spin.start('Scaffolding Second Brain core files and AI adapters...');
  let result;
  try {
    result = initBrain(targetDir, { companyName, industry, tagline, areas, demo, language });
  } catch (err) {
    spin.stop(pc.red('Scaffolding failed.'));
    throw err;
  }
  spin.stop(pc.green('Second Brain initialized successfully!'));
  reportAdapterBackups(result.adapters);

  const absDir = path.resolve(targetDir);
  const salesPage = areas.includes('sales') && tryWriteSalesView(absDir);
  p.note(renderNextSteps({ absDir, areas, demo, salesPage }), 'Next steps');
  // Printed outside the note box so the JSON stays copy-pasteable (the box wraps long lines).
  console.log(`${pc.bold('Using Claude Desktop or another MCP client?')} Add this to its config:\n`);
  console.log(JSON.stringify({ mcpServers: { [path.basename(absDir)]: { command: 'clc-brain', args: ['mcp', absDir] } } }, null, 2));
  console.log(`\nWeb chatbots (ChatGPT, Gemini): see ${pc.cyan('skills/integrations/')}. Health check: ${pc.cyan('clc-brain doctor')}.\n`);
  p.outro(pc.bold(pc.green(`Welcome to your new Second Brain, ${companyName}! 🚀`)));
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

// One example question per preset area, answered from that area's files once onboarding seeds them.
const AREA_EXAMPLES = Object.freeze({
  sales: '"A customer says we\'re too expensive. What do I say?"',
  marketing: '"How do we position ourselves against the market leader?"',
  product: '"What are this quarter\'s product themes?"',
  operations: '"A P1 incident just started, what do I do?"',
  hr_people: '"What is the onboarding plan for a new engineer?"',
  finance_legal: '"Can I give a customer a 25% discount?"'
});
const MAX_EXAMPLES = 3;

/** The guided path from an empty brain to a first grounded answer, tailored to the installed areas. */
function renderNextSteps({ absDir, areas, demo, salesPage }) {
  const examples = areas.filter((a) => AREA_EXAMPLES[a]).slice(0, MAX_EXAMPLES).map((a) => `   • ${pc.bold(AREA_EXAMPLES[a])}`);
  const steps = [
    `1. Open this folder in your AI tool (Claude Code, Antigravity,\n   Cursor, Windsurf or Gemini CLI):\n   ${pc.cyan(absDir)}`,
    `2. Tell your assistant: ${pc.bold('"Let\'s set up my brain"')} \n   (in Claude Code you can also type /brain:onboarding).\n   It runs a short interview that fills your profile\n   and drafts a first asset for each area you installed.`,
    examples.length > 0
      ? `3. Then just ask in plain words, for example:\n${examples.join('\n')}`
      : '3. Then just ask your assistant about your company in plain words.'
  ];
  if (salesPage) steps.push(`\nYour sales system page: ${pc.cyan('sales/sales-system.html')}\n(open it in your browser to see your sales steps and call guides).`);
  if (demo) steps.push(`\nDemo samples installed. Remove them with ${pc.cyan('clc-brain clean-demo')}.`);
  return steps.join('\n');
}
