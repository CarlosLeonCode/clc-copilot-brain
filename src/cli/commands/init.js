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

  p.note(
    `1. ${pc.cyan('org-kernel.json')} - Core organizational state & active areas\n` +
    `2. ${pc.cyan('AGENTS.md')} - Universal SSOT for Cursor, Claude, Windsurf & Gemini\n` +
    `3. ${pc.cyan('.cursorrules, .windsurfrules, CLAUDE.md, GEMINI.md')} - Symlinked adapters\n` +
    `4. ${pc.cyan('.claude/commands/')} - Claude Code slash commands (/brain, /brain:sales, etc.)\n` +
    `5. ${pc.cyan('skills/')} - LLM skills & exportable prompts for ChatGPT/Gemini (skills/integrations/)\n` +
    `6. ${pc.cyan(areas.join(', '))} - Installed operational areas\n\n` +
    `Run ${pc.bold('copilot-brain doctor')} to audit repository health.`,
    'Scaffolded Artifacts'
  );
  p.note(
    `• ${pc.bold('With MCP (Cursor, Claude Desktop, Antigravity):')} Run ${pc.cyan('clc-brain mcp')}\n` +
    `• ${pc.bold('With Web AI (ChatGPT Custom GPTs, Gemini Gems):')} Instructions in ${pc.cyan('skills/integrations/')}\n` +
    `• ${pc.bold('Health check:')} Run ${pc.cyan('clc-brain doctor')} anytime.`,
    'How to Connect Your AI'
  );
  p.outro(pc.bold(pc.green(`Welcome to your new Second Brain, ${companyName}! 🚀`)));
  return 0;
}
