// `add-area`: install a preset area or scaffold a custom one (flags or interactive prompts).
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { addCustomArea, addPresetArea, areaIdError, defaultAreaTitle, readKernel, uninstalledPresets } from '../../core/areas.js';
import { ask } from '../prompt.js';

async function chooseKind(options, available) {
  if (options.preset) return 'preset';
  if (options.custom) return 'custom';
  return ask(p.select({
    message: 'What kind of area would you like to add?',
    options: [
      { value: 'preset', label: 'Preset Domain Area', hint: available.length ? `${available.length} available` : 'None remaining' },
      { value: 'custom', label: 'Custom Domain Area', hint: 'Scaffolds a new area with clean architecture boilerplate' }
    ]
  }));
}

async function addPreset(targetDir, options, available) {
  if (available.length === 0) {
    p.note('All preset areas are already installed in this brain repository!', 'Notice');
    p.outro(pc.green('No further presets to add.'));
    return 0;
  }
  const areaId = options.preset || await ask(p.select({
    message: 'Select preset area to install:',
    options: available.map((a) => ({ value: a.id, label: `${a.name} - ${a.description}` }))
  }));

  const spin = p.spinner();
  spin.start(`Installing preset area: ${areaId}...`);
  try {
    const { area } = addPresetArea(targetDir, areaId);
    spin.stop(pc.green(`Area "${area.name}" installed successfully!`));
    p.outro(pc.bold(pc.green(`Installed ${area.name} at ./${area.id}/`)));
  } catch (err) {
    spin.stop(pc.red('Installation failed.'));
    throw err;
  }
  return 0;
}

async function addCustom(targetDir, options) {
  const spec = {};
  if (typeof options.custom === 'string') {
    spec.id = options.custom.trim();
  } else {
    const installed = readKernel(targetDir).activeAreas || [];
    spec.id = (await ask(p.text({
      message: 'Enter custom area folder name (lowercase, kebab-case or underscore):',
      placeholder: 'security_compliance',
      validate: (val) => areaIdError(val, installed) ?? undefined
    }))).trim();
    spec.title = await ask(p.text({ message: 'Area Display Title:', placeholder: 'Security & Compliance', defaultValue: defaultAreaTitle(spec.id) }));
    spec.description = await ask(p.text({
      message: 'Brief purpose or scope of this area:',
      placeholder: 'Information security controls, threat models, and regulatory compliance',
      defaultValue: 'Operational governance and standard documentation for this domain'
    }));
  }

  const { area } = addCustomArea(targetDir, spec);
  p.log.success(pc.green(`Custom area "${area.id}" created!`));
  p.outro(pc.bold(pc.green(`Scaffolded custom domain at ./${area.id}/`)));
  return 0;
}

export async function runAddArea(targetDir, options) {
  const available = uninstalledPresets(targetDir);
  p.intro(pc.bgCyan(pc.black(' Add Operational Area ')));
  const kind = await chooseKind(options, available);
  return kind === 'preset' ? addPreset(targetDir, options, available) : addCustom(targetDir, options);
}
