#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');

// Read package.json version
const pkgJsonPath = path.join(PKG_ROOT, 'package.json');
let pkgVersion = '1.0.0';
try {
  const pkgData = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkgVersion = pkgData.version || pkgVersion;
} catch {
  // fallback
}

// Preset areas definition
const PRESET_AREAS = [
  {
    id: 'sales',
    name: 'Sales',
    description: 'Revenue enablement, ICPs, battlecards, objection handling matrices, scripts',
    playbook: '01-SALES-PLAYBOOK.md',
    defaultSelected: true
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Brand guidelines, positioning statements, editorial calendar, distribution',
    playbook: '02-MARKETING-PLAYBOOK.md',
    defaultSelected: true
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Roadmaps, feature briefs, PRDs, ADRs, release notes',
    playbook: '03-PRODUCT-PLAYBOOK.md',
    defaultSelected: false
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'Standard Operating Procedures (SOPs), tools catalog, vendor SLAs',
    playbook: '04-OPERATIONS-PLAYBOOK.md',
    defaultSelected: false
  },
  {
    id: 'hr_people',
    name: 'HR & People',
    description: 'Culture handbook, hiring scorecards, 30-60-90 day onboarding plans',
    playbook: '05-PEOPLE-PLAYBOOK.md',
    defaultSelected: false
  },
  {
    id: 'finance_legal',
    name: 'Finance & Legal',
    description: 'Pricing models, discount approval matrices, privacy & NDA templates',
    playbook: '06-FINANCE-LEGAL-PLAYBOOK.md',
    defaultSelected: false
  }
];

// Helper: Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper: Copy directory recursively with optional content replacer
function copyDirRecursive(srcDir, destDir, replacer = null) {
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, replacer);
    } else if (entry.isFile()) {
      let content = fs.readFileSync(srcPath, 'utf8');
      if (replacer) {
        content = replacer(content, srcPath);
      }
      fs.writeFileSync(destPath, content, 'utf8');
    }
  }
}

// Helper: Setup IDE adapters pointing to AGENTS.md
function setupIdeAdapters(targetDir) {
  const adapters = ['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules'];
  const results = [];

  for (const adapter of adapters) {
    const adapterPath = path.join(targetDir, adapter);
    try {
      // Remove existing adapter if it exists
      if (fs.existsSync(adapterPath) || fs.lstatSync(adapterPath).isSymbolicLink()) {
        fs.unlinkSync(adapterPath);
      }
    } catch {
      // ignore
    }

    try {
      // Create relative symlink to AGENTS.md
      fs.symlinkSync('AGENTS.md', adapterPath);
      results.push({ adapter, status: 'symlink', target: 'AGENTS.md' });
    } catch {
      // Fallback: write an instruction stub importing AGENTS.md
      const fallbackContent = `<!-- Multi-IDE Adapter for ${adapter} -->\n# Single Source of Truth Reference\n\nAll AI assistant behavior, repository rules, and domain context are canonically defined in [AGENTS.md](./AGENTS.md).\n\nPlease read and adhere to all instructions specified in \`AGENTS.md\`.\n`;
      fs.writeFileSync(adapterPath, fallbackContent, 'utf8');
      results.push({ adapter, status: 'fallback_file', target: 'AGENTS.md' });
    }
  }
  return results;
}

// Helper: Validate a JSON document against lightweight structural schema rules
function validateJsonStructure(data, schemaId) {
  const errors = [];

  if (schemaId === 'org-kernel') {
    if (!data.version) errors.push('Missing "version" field');
    if (!data.organization) errors.push('Missing "organization" block');
    else {
      if (!data.organization.name) errors.push('organization.name is required');
      if (!data.organization.industry) errors.push('organization.industry is required');
      if (!data.organization.tagline) errors.push('organization.tagline is required');
    }
    if (!Array.isArray(data.activeAreas)) errors.push('activeAreas must be an array');
    if (!data.governance || !data.governance.owner) errors.push('governance.owner is required');
  } else if (schemaId === 'sales-battlecard') {
    const required = ['id', 'competitorName', 'competitorTier', 'overview', 'lastUpdated', 'keyStrengths', 'keyWeaknesses', 'ourSilverBullets'];
    for (const req of required) {
      if (!data[req]) errors.push(`Missing required field "${req}"`);
    }
    if (data.competitorTier && !['direct', 'indirect', 'emerging'].includes(data.competitorTier)) {
      errors.push(`Invalid competitorTier: "${data.competitorTier}". Must be direct, indirect, or emerging.`);
    }
  } else if (schemaId === 'sales-objection') {
    const required = ['id', 'title', 'category', 'severity', 'triggerPhrases', 'rootCause', 'pivotScript', 'counterArguments', 'suggestedNextStep'];
    for (const req of required) {
      if (!data[req]) errors.push(`Missing required field "${req}"`);
    }
    if (data.category && !['pricing', 'timing', 'authority', 'competitor', 'trust', 'technical_fit'].includes(data.category)) {
      errors.push(`Invalid category: "${data.category}"`);
    }
    if (data.severity && !['low', 'medium', 'high', 'blocker'].includes(data.severity)) {
      errors.push(`Invalid severity: "${data.severity}"`);
    }
  } else if (schemaId === 'sop') {
    const required = ['id', 'title', 'area', 'owner', 'version', 'effectiveDate', 'purpose', 'scope', 'steps'];
    for (const req of required) {
      if (!data[req]) errors.push(`Missing required field "${req}"`);
    }
    if (data.steps && Array.isArray(data.steps)) {
      data.steps.forEach((step, idx) => {
        if (!step.title || !step.description || !step.responsibleRole) {
          errors.push(`Step ${idx + 1} is missing title, description, or responsibleRole`);
        }
      });
    } else {
      errors.push('"steps" must be a non-empty array');
    }
  }

  return errors;
}

// Command: init
async function handleInit(targetDirArg, options = {}) {
  const targetDir = path.resolve(process.cwd(), targetDirArg || '.');
  ensureDir(targetDir);

  p.intro(pc.bgCyan(pc.black(' Open Source Second Brain Engine ')));
  p.note(`Target Directory: ${pc.bold(targetDir)}`, 'Configuration Target');

  const kernelPath = path.join(targetDir, 'org-kernel.json');
  if (fs.existsSync(kernelPath) && !options.yes) {
    const shouldOverwrite = await p.confirm({
      message: 'An existing Second Brain was found in this directory. Do you want to update/re-initialize it?',
      initialValue: false
    });
    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Initialization aborted.');
      process.exit(0);
    }
  }

  let companyName = options.name;
  if (!companyName) {
    if (options.yes) {
      companyName = 'Acme Corp';
    } else {
      companyName = await p.text({
        message: 'What is the name of your organization / project?',
        placeholder: 'Acme Corporation',
        defaultValue: 'Acme Corp',
        validate: (val) => (!val || !val.trim() ? 'Company name is required' : undefined)
      });
      if (p.isCancel(companyName)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
    }
  }

  let industry = options.industry;
  if (!industry) {
    if (options.yes) {
      industry = 'Enterprise Software & Developer Tools';
    } else {
      industry = await p.text({
        message: 'What industry or domain do you operate in?',
        placeholder: 'Enterprise Developer Tools & AI',
        defaultValue: 'Enterprise Software & Developer Tools',
        validate: (val) => (!val || !val.trim() ? 'Industry is required' : undefined)
      });
      if (p.isCancel(industry)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
    }
  }

  let tagline = options.tagline;
  if (!tagline) {
    if (options.yes) {
      tagline = 'Deterministic institutional knowledge for human teams and AI coding agents';
    } else {
      tagline = await p.text({
        message: 'What is your core tagline or mission?',
        placeholder: 'Deterministic institutional knowledge for human teams and AI coding agents',
        defaultValue: 'Deterministic institutional knowledge for human teams and AI coding agents'
      });
      if (p.isCancel(tagline)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
    }
  }

  let selectedAreas;
  if (options.areas) {
    selectedAreas = options.areas.split(',').map((s) => s.trim());
  } else if (options.yes) {
    selectedAreas = ['sales', 'marketing', 'product', 'operations', 'hr_people', 'finance_legal'];
  } else {
    const areaChoices = PRESET_AREAS.map((a) => ({
      value: a.id,
      label: `${a.name} - ${a.description}`,
      hint: a.defaultSelected ? 'recommended' : undefined
    }));

    selectedAreas = await p.multiselect({
      message: 'Select the operational areas to install in your Second Brain:',
      options: areaChoices,
      initialValues: ['sales', 'marketing'],
      required: true
    });
    if (p.isCancel(selectedAreas)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }
  }

  const spin = p.spinner();
  spin.start('Scaffolding Second Brain core files and AI adapters...');

  const templateBaseDir = path.join(PKG_ROOT, 'templates', 'base');
  const templateAreasDir = path.join(PKG_ROOT, 'templates', 'areas');
  const schemasDir = path.join(PKG_ROOT, 'schemas');
  const playbooksDir = path.join(PKG_ROOT, 'playbooks');

  const nowIso = new Date().toISOString();
  const areasListMarkdown = selectedAreas.map((areaId) => {
    const meta = PRESET_AREAS.find((a) => a.id === areaId) || { name: areaId, description: 'Custom Domain' };
    return `- [${meta.name}/](./${areaId}/): ${meta.description}`;
  }).join('\n');

  const replacer = (content) => {
    return content
      .replaceAll('{{COMPANY_NAME}}', companyName)
      .replaceAll('{{INDUSTRY}}', industry)
      .replaceAll('{{TAGLINE}}', tagline)
      .replaceAll('{{ACTIVE_AREAS_JSON}}', JSON.stringify(selectedAreas, null, 2))
      .replaceAll('{{ACTIVE_AREAS_LIST}}', areasListMarkdown)
      .replaceAll('{{CREATED_AT}}', nowIso)
      .replaceAll('{{UPDATED_AT}}', nowIso);
  };

  // 1. Copy base templates (org-kernel.json, company-profile.md, AGENTS.md, .agents/)
  copyDirRecursive(templateBaseDir, targetDir, replacer);

  // 2. Setup IDE adapters (CLAUDE.md, GEMINI.md, .cursorrules, .windsurfrules)
  setupIdeAdapters(targetDir);

  // 3. Copy schemas
  const targetSchemasDir = path.join(targetDir, 'schemas');
  copyDirRecursive(schemasDir, targetSchemasDir);

  // 4. Copy framework overview and selected area playbooks
  const targetPlaybooksDir = path.join(targetDir, 'playbooks');
  ensureDir(targetPlaybooksDir);
  fs.copyFileSync(
    path.join(playbooksDir, '00-FRAMEWORK-OVERVIEW.md'),
    path.join(targetPlaybooksDir, '00-FRAMEWORK-OVERVIEW.md')
  );

  for (const areaId of selectedAreas) {
    const areaMeta = PRESET_AREAS.find((a) => a.id === areaId);
    if (areaMeta && areaMeta.playbook) {
      const srcPlaybook = path.join(playbooksDir, areaMeta.playbook);
      if (fs.existsSync(srcPlaybook)) {
        fs.copyFileSync(srcPlaybook, path.join(targetPlaybooksDir, areaMeta.playbook));
      }
    }

    // Copy area template contents
    const srcAreaDir = path.join(templateAreasDir, areaId);
    const destAreaDir = path.join(targetDir, areaId);
    if (fs.existsSync(srcAreaDir)) {
      copyDirRecursive(srcAreaDir, destAreaDir, replacer);
    }
  }

  spin.stop(pc.green('Second Brain initialized successfully!'));

  p.note(
    `1. ${pc.cyan('org-kernel.json')} - Core organizational state & active areas\n` +
    `2. ${pc.cyan('AGENTS.md')} - Universal SSOT for Cursor, Claude, Windsurf & Gemini\n` +
    `3. ${pc.cyan('.cursorrules, .windsurfrules, CLAUDE.md, GEMINI.md')} - Symlinked adapters\n` +
    `4. ${pc.cyan('.agents/skills/')} - Reusable AI query & audit skills\n` +
    `5. ${pc.cyan(selectedAreas.join(', '))} - Installed operational areas\n\n` +
    `Run ${pc.bold('copilot-brain doctor')} to audit repository health.`,
    'Scaffolded Artifacts'
  );

  p.outro(pc.bold(pc.green(`Welcome to your new Second Brain, ${companyName}! 🚀`)));
}

// Command: add-area
async function handleAddArea(targetDirArg, options = {}) {
  const targetDir = path.resolve(process.cwd(), targetDirArg || '.');
  const kernelPath = path.join(targetDir, 'org-kernel.json');

  if (!fs.existsSync(kernelPath)) {
    p.cancel(pc.red(`No org-kernel.json found at ${targetDir}. Please run "copilot-brain init" first.`));
    process.exit(1);
  }

  let kernel;
  try {
    kernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
  } catch (err) {
    p.cancel(pc.red(`Failed to parse org-kernel.json: ${err.message}`));
    process.exit(1);
  }

  const installedAreas = kernel.activeAreas || [];
  const uninstalledPresets = PRESET_AREAS.filter((a) => !installedAreas.includes(a.id));

  p.intro(pc.bgCyan(pc.black(' Add Operational Area ')));

  let actionType;
  if (options.preset) {
    actionType = 'preset';
  } else if (options.custom) {
    actionType = 'custom';
  } else {
    actionType = await p.select({
      message: 'What kind of area would you like to add?',
      options: [
        {
          value: 'preset',
          label: 'Preset Domain Area',
          hint: uninstalledPresets.length ? `${uninstalledPresets.length} available` : 'None remaining'
        },
        {
          value: 'custom',
          label: 'Custom Domain Area',
          hint: 'Scaffolds a new area with clean architecture boilerplate'
        }
      ]
    });

    if (p.isCancel(actionType)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
  }

  if (actionType === 'preset') {
    if (uninstalledPresets.length === 0) {
      p.note('All preset areas are already installed in this brain repository!', 'Notice');
      p.outro(pc.green('No further presets to add.'));
      return;
    }

    let chosenAreaId = options.preset;
    if (!chosenAreaId) {
      chosenAreaId = await p.select({
        message: 'Select preset area to install:',
        options: uninstalledPresets.map((a) => ({
          value: a.id,
          label: `${a.name} - ${a.description}`
        }))
      });

      if (p.isCancel(chosenAreaId)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }
    }

    const chosenMeta = PRESET_AREAS.find((a) => a.id === chosenAreaId);
    if (!chosenMeta) {
      p.cancel(pc.red(`Invalid preset area ID: "${chosenAreaId}"`));
      process.exit(1);
    }
    const spin = p.spinner();
    spin.start(`Installing preset area: ${chosenMeta.name}...`);

    const templateAreasDir = path.join(PKG_ROOT, 'templates', 'areas');
    const playbooksDir = path.join(PKG_ROOT, 'playbooks');
    const destAreaDir = path.join(targetDir, chosenAreaId);

    const replacer = (content) => {
      return content
        .replaceAll('{{COMPANY_NAME}}', kernel.organization?.name || 'Organization')
        .replaceAll('{{INDUSTRY}}', kernel.organization?.industry || 'Industry')
        .replaceAll('{{TAGLINE}}', kernel.organization?.tagline || '');
    };

    copyDirRecursive(path.join(templateAreasDir, chosenAreaId), destAreaDir, replacer);

    if (chosenMeta.playbook) {
      const srcPlaybook = path.join(playbooksDir, chosenMeta.playbook);
      const targetPlaybooksDir = path.join(targetDir, 'playbooks');
      ensureDir(targetPlaybooksDir);
      if (fs.existsSync(srcPlaybook)) {
        fs.copyFileSync(srcPlaybook, path.join(targetPlaybooksDir, chosenMeta.playbook));
      }
    }

    // Update org-kernel.json
    installedAreas.push(chosenAreaId);
    kernel.activeAreas = installedAreas;
    if (kernel.metadata) {
      kernel.metadata.updatedAt = new Date().toISOString();
    }
    fs.writeFileSync(kernelPath, JSON.stringify(kernel, null, 2) + '\n', 'utf8');

    spin.stop(pc.green(`Area "${chosenMeta.name}" installed successfully!`));
    p.outro(pc.bold(pc.green(`Installed ${chosenMeta.name} at ./${chosenAreaId}/`)));
  } else {
    // Custom area
    let cleanAreaId;
    if (options.custom && typeof options.custom === 'string') {
      cleanAreaId = options.custom.trim();
    } else {
      const customAreaName = await p.text({
        message: 'Enter custom area folder name (lowercase, kebab-case or underscore):',
        placeholder: 'security_compliance',
        validate: (val) => {
          if (!val || !val.trim()) return 'Area name is required';
          if (!/^[a-z0-9_-]+$/.test(val.trim())) return 'Only lowercase letters, numbers, hyphens, and underscores';
          if (installedAreas.includes(val.trim())) return 'An area with this name is already installed';
          return undefined;
        }
      });

      if (p.isCancel(customAreaName)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }
      cleanAreaId = customAreaName.trim();
    }

    const defaultTitle = cleanAreaId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    let areaTitle = defaultTitle;
    if (!options.custom) {
      areaTitle = await p.text({
        message: 'Area Display Title:',
        placeholder: 'Security & Compliance',
        defaultValue: defaultTitle
      });

      if (p.isCancel(areaTitle)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }
    }

    let areaDescription = 'Operational governance and standard documentation for this domain';
    if (!options.custom) {
      areaDescription = await p.text({
        message: 'Brief purpose or scope of this area:',
        placeholder: 'Information security controls, threat models, and regulatory compliance',
        defaultValue: areaDescription
      });

      if (p.isCancel(areaDescription)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }
    }

    const spin = p.spinner();
    spin.start(`Scaffolding custom area "${cleanAreaId}"...`);

    const destAreaDir = path.join(targetDir, cleanAreaId);
    ensureDir(destAreaDir);
    ensureDir(path.join(destAreaDir, 'docs'));
    ensureDir(path.join(destAreaDir, 'policies'));

    const customReadme = `# ${areaTitle}\n\n> **Purpose:** ${areaDescription}\n> **Steward:** Area Lead\n\n## Structure\n- [docs/](./docs/): Technical documentation and guides\n- [policies/](./policies/): Domain policies and operational controls\n\n## Governance\n- Review Cadence: Quarterly\n- Maintainer updates should follow standard pull request workflows.\n`;
    fs.writeFileSync(path.join(destAreaDir, 'README.md'), customReadme, 'utf8');

    // Update org-kernel.json
    installedAreas.push(cleanAreaId);
    kernel.activeAreas = installedAreas;
    if (kernel.metadata) {
      kernel.metadata.updatedAt = new Date().toISOString();
    }
    fs.writeFileSync(kernelPath, JSON.stringify(kernel, null, 2) + '\n', 'utf8');

    spin.stop(pc.green(`Custom area "${cleanAreaId}" created!`));
    p.outro(pc.bold(pc.green(`Scaffolded custom domain at ./${cleanAreaId}/`)));
  }
}

// Command: list-areas
async function handleListAreas(targetDirArg) {
  const targetDir = path.resolve(process.cwd(), targetDirArg || '.');
  const kernelPath = path.join(targetDir, 'org-kernel.json');

  let installedAreas = [];
  if (fs.existsSync(kernelPath)) {
    try {
      const kernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
      installedAreas = kernel.activeAreas || [];
    } catch {
      // ignore
    }
  }

  console.log(pc.bold(pc.cyan('\n=== Second Brain Area Status ===\n')));
  console.log(pc.bold('Installed Areas:'));
  if (installedAreas.length === 0) {
    console.log(pc.yellow('  (No installed areas detected. Run "copilot-brain init" to get started.)'));
  } else {
    for (const areaId of installedAreas) {
      const preset = PRESET_AREAS.find((a) => a.id === areaId);
      const name = preset ? preset.name : areaId;
      const desc = preset ? preset.description : 'Custom Area';
      const onDisk = fs.existsSync(path.join(targetDir, areaId));
      const statusIcon = onDisk ? pc.green('✔') : pc.red('✖ (missing folder)');
      console.log(`  ${statusIcon} ${pc.bold(name)} (${pc.cyan(areaId)}) - ${desc}`);
    }
  }

  console.log(pc.bold('\nAvailable Preset Areas (Not Installed):'));
  const uninstalled = PRESET_AREAS.filter((a) => !installedAreas.includes(a.id));
  if (uninstalled.length === 0) {
    console.log(pc.green('  All available presets are currently installed.'));
  } else {
    for (const preset of uninstalled) {
      console.log(`  ${pc.gray('○')} ${pc.bold(preset.name)} (${pc.cyan(preset.id)}) - ${preset.description}`);
    }
  }
  console.log('');
}

// Command: doctor
async function handleDoctor(targetDirArg, options = {}) {
  const targetDir = path.resolve(process.cwd(), targetDirArg || '.');
  p.intro(pc.bgCyan(pc.black(' Second Brain Doctor (Health & Integrity Audit) ')));
  p.note(`Inspecting repository at: ${pc.bold(targetDir)}`, 'Doctor Diagnostic');

  const issues = [];
  const repairs = [];
  let checksPassed = 0;

  // 1. Check org-kernel.json
  const kernelPath = path.join(targetDir, 'org-kernel.json');
  let kernel = null;
  if (!fs.existsSync(kernelPath)) {
    issues.push({ level: 'error', message: 'Missing org-kernel.json in repository root.' });
  } else {
    try {
      kernel = JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
      const validationErrors = validateJsonStructure(kernel, 'org-kernel');
      if (validationErrors.length > 0) {
        issues.push({ level: 'error', message: `org-kernel.json validation errors: ${validationErrors.join(', ')}` });
      } else {
        checksPassed++;
        console.log(`  ${pc.green('✔')} org-kernel.json structure is valid.`);
      }
    } catch (err) {
      issues.push({ level: 'error', message: `org-kernel.json is invalid JSON: ${err.message}` });
    }
  }

  // 2. Check AGENTS.md (SSOT)
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    issues.push({ level: 'error', message: 'Missing AGENTS.md Single Source of Truth.' });
  } else {
    checksPassed++;
    console.log(`  ${pc.green('✔')} AGENTS.md SSOT file present.`);
  }

  // 3. Check IDE adapters (.cursorrules, .windsurfrules, CLAUDE.md, GEMINI.md)
  const requiredAdapters = ['CLAUDE.md', 'GEMINI.md', '.cursorrules', '.windsurfrules'];
  let adapterIssuesCount = 0;
  for (const adapter of requiredAdapters) {
    const adapterPath = path.join(targetDir, adapter);
    if (!fs.existsSync(adapterPath)) {
      issues.push({
        level: 'warning',
        message: `Missing IDE adapter: ${adapter}`,
        repairable: true,
        action: 'create_adapter',
        adapter
      });
      adapterIssuesCount++;
    } else {
      try {
        const lstat = fs.lstatSync(adapterPath);
        if (lstat.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(adapterPath);
          if (linkTarget !== 'AGENTS.md' && linkTarget !== path.join(targetDir, 'AGENTS.md')) {
            issues.push({
              level: 'warning',
              message: `Adapter ${adapter} symlink points to "${linkTarget}", expected "AGENTS.md"`,
              repairable: true,
              action: 'repair_symlink',
              adapter
            });
            adapterIssuesCount++;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  if (adapterIssuesCount === 0) {
    checksPassed++;
    console.log(`  ${pc.green('✔')} All multi-IDE adapters (.cursorrules, .windsurfrules, CLAUDE.md, GEMINI.md) properly configured.`);
  }

  // 4. Check native skills
  const skillsDir = path.join(targetDir, '.agents', 'skills');
  const expectedSkills = ['brain-search.md', 'sales-assist.md', 'sop-auditor.md'];
  let missingSkills = 0;
  for (const skill of expectedSkills) {
    if (!fs.existsSync(path.join(skillsDir, skill))) {
      issues.push({ level: 'warning', message: `Missing agent skill: .agents/skills/${skill}` });
      missingSkills++;
    }
  }
  if (missingSkills === 0) {
    checksPassed++;
    console.log(`  ${pc.green('✔')} Agent query and audit skills present in .agents/skills/.`);
  }

  // 5. Check installed areas on disk
  if (kernel && Array.isArray(kernel.activeAreas)) {
    for (const areaId of kernel.activeAreas) {
      const areaPath = path.join(targetDir, areaId);
      if (!fs.existsSync(areaPath)) {
        issues.push({ level: 'error', message: `Active area "${areaId}" declared in org-kernel.json but directory missing.` });
      } else {
        checksPassed++;
        console.log(`  ${pc.green('✔')} Active area "${areaId}" verified on disk.`);
      }
    }
  }

  // 6. Schema check on area data files
  const battlecardsDir = path.join(targetDir, 'sales', 'battlecards');
  if (fs.existsSync(battlecardsDir)) {
    const files = fs.readdirSync(battlecardsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(battlecardsDir, file), 'utf8'));
        const errs = validateJsonStructure(data, 'sales-battlecard');
        if (errs.length > 0) {
          issues.push({ level: 'error', message: `Battlecard sales/battlecards/${file} invalid: ${errs.join('; ')}` });
        } else {
          checksPassed++;
          console.log(`  ${pc.green('✔')} Battlecard schema validated: sales/battlecards/${file}`);
        }
      } catch (err) {
        issues.push({ level: 'error', message: `Corrupted JSON in sales/battlecards/${file}: ${err.message}` });
      }
    }
  }

  const objectionsDir = path.join(targetDir, 'sales', 'objections');
  if (fs.existsSync(objectionsDir)) {
    const files = fs.readdirSync(objectionsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(objectionsDir, file), 'utf8'));
        const errs = validateJsonStructure(data, 'sales-objection');
        if (errs.length > 0) {
          issues.push({ level: 'error', message: `Objection sales/objections/${file} invalid: ${errs.join('; ')}` });
        } else {
          checksPassed++;
          console.log(`  ${pc.green('✔')} Objection schema validated: sales/objections/${file}`);
        }
      } catch (err) {
        issues.push({ level: 'error', message: `Corrupted JSON in sales/objections/${file}: ${err.message}` });
      }
    }
  }

  const sopsDir = path.join(targetDir, 'operations', 'sops');
  if (fs.existsSync(sopsDir)) {
    const files = fs.readdirSync(sopsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sopsDir, file), 'utf8'));
        const errs = validateJsonStructure(data, 'sop');
        if (errs.length > 0) {
          issues.push({ level: 'error', message: `SOP operations/sops/${file} invalid: ${errs.join('; ')}` });
        } else {
          checksPassed++;
          console.log(`  ${pc.green('✔')} SOP schema validated: operations/sops/${file}`);
        }
      } catch (err) {
        issues.push({ level: 'error', message: `Corrupted JSON in operations/sops/${file}: ${err.message}` });
      }
    }
  }

  // Summary Report
  console.log('\n' + pc.bold('=== Audit Summary ==='));
  console.log(`Checks passed: ${pc.green(checksPassed)}`);
  console.log(`Warnings: ${pc.yellow(issues.filter((i) => i.level === 'warning').length)}`);
  console.log(`Errors: ${pc.red(issues.filter((i) => i.level === 'error').length)}`);

  if (issues.length > 0) {
    console.log('\n' + pc.bold('Issues Found:'));
    for (const issue of issues) {
      const tag = issue.level === 'error' ? pc.red('[ERROR]') : pc.yellow('[WARN]');
      console.log(`  ${tag} ${issue.message}`);
    }

    const repairable = issues.filter((i) => i.repairable);
    if (repairable.length > 0) {
      let doRepair = options.fix;
      if (doRepair === undefined) {
        doRepair = await p.confirm({
          message: `Detected ${repairable.length} repairable adapter/symlink issue(s). Automatically fix them now?`,
          initialValue: true
        });
      }

      if (doRepair && !p.isCancel(doRepair)) {
        setupIdeAdapters(targetDir);
        console.log(pc.green('\n✔ Repaired missing and misconfigured IDE adapter symlinks!'));
      }
    }
  } else {
    console.log(pc.green('\n✔ All Second Brain health checks passed with zero errors or warnings!\n'));
  }

  p.outro(issues.length === 0 ? pc.green('Repository is in pristine condition.') : pc.yellow('Doctor finished with suggestions.'));
}

// Help Message
function showHelp() {
  console.log(`
${pc.bold(pc.cyan('copilot-brain'))} - Open Source Second Brain Engine for Organizations & AI Copilots (v${pkgVersion})

${pc.bold('USAGE:')}
  copilot-brain <command> [directory] [options]
  clc-brain <command> [directory] [options]

${pc.bold('COMMANDS:')}
  ${pc.green('init')} [dir]         Initialize a new Organizational Second Brain in target directory
  ${pc.green('add-area')} [dir]     Add an uninstalled preset domain or create a custom area
  ${pc.green('doctor')} [dir]       Audit repository health, schemas, and repair broken symlinks
  ${pc.green('list-areas')} [dir]   Show installed vs available domain areas
  ${pc.green('help')}               Show this help message

${pc.bold('OPTIONS:')}
  --fix               Automatically apply non-destructive fixes in doctor mode
  -v, --version       Show version number
  -h, --help          Show help

${pc.bold('EXAMPLES:')}
  $ copilot-brain init
  $ copilot-brain init ./my-project
  $ copilot-brain doctor
  $ copilot-brain doctor --fix
  $ copilot-brain add-area
  $ copilot-brain list-areas
`);
}

// Helper: Parse CLI Arguments
function parseArgs(rawArgs) {
  const args = [];
  const options = {};

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--name' && i + 1 < rawArgs.length) {
      options.name = rawArgs[++i];
    } else if (arg === '--industry' && i + 1 < rawArgs.length) {
      options.industry = rawArgs[++i];
    } else if (arg === '--tagline' && i + 1 < rawArgs.length) {
      options.tagline = rawArgs[++i];
    } else if (arg === '--areas' && i + 1 < rawArgs.length) {
      options.areas = rawArgs[++i];
    } else if (arg === '--preset' && i + 1 < rawArgs.length) {
      options.preset = rawArgs[++i];
    } else if (arg === '--custom' && i + 1 < rawArgs.length) {
      options.custom = rawArgs[++i];
    } else if (arg.startsWith('-')) {
      options[arg.replace(/^-+/, '')] = true;
    } else {
      args.push(arg);
    }
  }

  return { args, options };
}

// CLI Entrypoint
async function main() {
  const { args, options } = parseArgs(process.argv.slice(2));
  const command = args[0];
  const targetDir = args[1];

  if (options.version || options.v) {
    console.log(`copilot-brain v${pkgVersion}`);
    process.exit(0);
  }

  if (options.help || options.h || command === 'help') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'init':
      await handleInit(targetDir, options);
      break;
    case 'add-area':
      await handleAddArea(targetDir, options);
      break;
    case 'doctor':
      await handleDoctor(targetDir, options);
      break;
    case 'list-areas':
      await handleListAreas(targetDir);
      break;
    default:
      if (!command) {
        showHelp();
      } else {
        console.error(pc.red(`Unknown command: "${command}"`));
        showHelp();
        process.exit(1);
      }
      break;
  }
}

main().catch((err) => {
  console.error(pc.red(`\nFatal error: ${err.message}`));
  process.exit(1);
});
