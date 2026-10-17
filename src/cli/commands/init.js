// `init`: collect organization details (flags, --yes defaults, or prompts) and scaffold via core.
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PRESET_AREAS, PRESET_AREA_IDS } from '../../core/areas.js';
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

export async function runInit(targetDir, options) {
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
  const areas = await chooseAreas(options);
  const demo = await chooseDemo(options);

  const spin = p.spinner();
  spin.start('Scaffolding Second Brain core files and AI adapters...');
  let result;
  try {
    result = initBrain(targetDir, { companyName, industry, tagline, areas, demo });
  } catch (err) {
    spin.stop(pc.red('Scaffolding failed.'));
    throw err;
  }
  spin.stop(pc.green('Second Brain initialized successfully!'));
  reportAdapterBackups(result.adapters);

  const absDir = path.resolve(targetDir);
  p.note(renderNextSteps({ absDir, areas, demo }), 'Next steps');
  // Printed outside the note box so the JSON stays copy-pasteable (the box wraps long lines).
  console.log(`${pc.bold('Using Claude Desktop or another MCP client?')} Add this to its config:\n`);
  console.log(JSON.stringify({ mcpServers: { [path.basename(absDir)]: { command: 'clc-brain', args: ['mcp', absDir] } } }, null, 2));
  console.log(`\nWeb chatbots (ChatGPT, Gemini): see ${pc.cyan('skills/integrations/')}. Health check: ${pc.cyan('clc-brain doctor')}.\n`);
  p.outro(pc.bold(pc.green(`Welcome to your new Second Brain, ${companyName}! 🚀`)));
  return 0;
}

// One example question per preset area, answered from that area's files once onboarding seeds them.
const AREA_EXAMPLES = Object.freeze({
  sales: '/objection "it\'s too expensive"',
  marketing: '"How do we position ourselves against the market leader?"',
  product: '"What are this quarter\'s product themes?"',
  operations: '"A P1 incident just started, what do I do?"',
  hr_people: '"What is the onboarding plan for a new engineer?"',
  finance_legal: '"Can I give a customer a 25% discount?"'
});
const MAX_EXAMPLES = 3;

/** The guided path from an empty brain to a first grounded answer, tailored to the installed areas. */
function renderNextSteps({ absDir, areas, demo }) {
  const examples = areas.filter((a) => AREA_EXAMPLES[a]).slice(0, MAX_EXAMPLES).map((a) => `   • ${pc.bold(AREA_EXAMPLES[a])}`);
  const steps = [
    `1. Open this folder in Claude Code, Cursor, Windsurf or Gemini CLI:\n   ${pc.cyan(absDir)}`,
    `2. Run ${pc.bold('/brain:onboarding')}, a short interview that fills your profile\n   and drafts a first asset for each area you installed.`,
    examples.length > 0
      ? `3. Ask your copilot; answers cite the source file in this brain:\n${examples.join('\n')}`
      : '3. Ask your copilot about your company;\n   answers cite the files in this brain.'
  ];
  if (demo) steps.push(`\nDemo samples installed. Remove them with ${pc.cyan('clc-brain clean-demo')}.`);
  return steps.join('\n');
}
