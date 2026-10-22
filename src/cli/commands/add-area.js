// `add-area`: install a preset area or scaffold a custom one (flags or interactive prompts), in the brain's language.
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { addCustomArea, addPresetArea, areaIdError, defaultAreaTitle, readKernel, uninstalledPresets } from '../../core/areas.js';
import { messageLanguage } from '../../core/brain-language.js';
import { t } from '../../core/i18n.js';
import { ask } from '../prompt.js';

async function chooseKind(options, available, say) {
  if (options.preset) return 'preset';
  if (options.custom) return 'custom';
  return ask(p.select({
    message: say('cli.addArea.kind'),
    options: [
      { value: 'preset', label: say('cli.addArea.presetLabel'), hint: available.length ? say('cli.addArea.presetAvailable', { count: available.length }) : say('cli.addArea.presetNone') },
      { value: 'custom', label: say('cli.addArea.customLabel'), hint: say('cli.addArea.customHint') }
    ]
  }));
}

async function addPreset(targetDir, options, available, say) {
  if (available.length === 0) {
    p.note(say('cli.addArea.allInstalled'), say('cli.addArea.notice'));
    p.outro(pc.green(say('cli.addArea.noMore')));
    return 0;
  }
  const areaId = options.preset || await ask(p.select({
    message: say('cli.addArea.selectPreset'),
    options: available.map((a) => ({ value: a.id, label: `${a.name} - ${a.description}` }))
  }));

  const spin = p.spinner();
  spin.start(say('cli.addArea.installing', { area: areaId }));
  try {
    const { area } = addPresetArea(targetDir, areaId);
    spin.stop(pc.green(say('cli.addArea.installed', { name: area.name })));
    p.outro(pc.bold(pc.green(say('cli.addArea.installedAt', { name: area.name, id: area.id }))));
  } catch (err) {
    spin.stop(pc.red(say('cli.addArea.failed')));
    throw err;
  }
  return 0;
}

async function addCustom(targetDir, options, say) {
  const spec = {};
  if (typeof options.custom === 'string') {
    spec.id = options.custom.trim();
  } else {
    const installed = readKernel(targetDir).activeAreas || [];
    spec.id = (await ask(p.text({
      message: say('cli.addArea.customName'),
      placeholder: 'security_compliance',
      validate: (val) => areaIdError(val, installed) ?? undefined
    }))).trim();
    spec.title = await ask(p.text({ message: say('cli.addArea.customTitle'), placeholder: 'Security & Compliance', defaultValue: defaultAreaTitle(spec.id) }));
    spec.description = await ask(p.text({
      message: say('cli.addArea.customPurpose'),
      placeholder: 'Information security controls, threat models, and regulatory compliance',
      defaultValue: 'Operational governance and standard documentation for this domain'
    }));
  }

  const { area } = addCustomArea(targetDir, spec);
  p.log.success(pc.green(say('cli.addArea.customCreated', { id: area.id })));
  p.outro(pc.bold(pc.green(say('cli.addArea.customAt', { id: area.id }))));
  return 0;
}

export async function runAddArea(targetDir, options) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, vars) => t(lang, key, vars);
  const available = uninstalledPresets(targetDir);
  p.intro(pc.bgCyan(pc.black(say('cli.addArea.title'))));
  const kind = await chooseKind(options, available, say);
  return kind === 'preset' ? addPreset(targetDir, options, available, say) : addCustom(targetDir, options, say);
}
