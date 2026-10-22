// `list-areas`: installed areas (with on-disk status) and available presets, in the brain's language.
import pc from 'picocolors';
import { listAreas, presetAreaText } from '../../core/areas.js';
import { messageLanguage } from '../../core/brain-language.js';
import { t } from '../../core/i18n.js';

export async function runListAreas(targetDir) {
  const lang = messageLanguage(targetDir, process.env);
  const say = (key, vars) => t(lang, key, vars);
  const text = (area) => presetAreaText(lang, area.id) ?? { name: area.name, description: say('cli.listAreas.custom') };
  const { installed, available } = listAreas(targetDir);
  console.log(pc.bold(pc.cyan(`\n${say('cli.listAreas.title')}\n`)));
  console.log(pc.bold(say('cli.listAreas.installed')));
  if (installed.length === 0) {
    console.log(pc.yellow(`  ${say('cli.listAreas.none')}`));
  }
  for (const area of installed) {
    const icon = area.onDisk ? pc.green('✔') : pc.red(`✖ ${say('cli.listAreas.missingFolder')}`);
    const { name, description } = text(area);
    console.log(`  ${icon} ${pc.bold(name)} (${pc.cyan(area.id)}) - ${description}`);
  }

  console.log(pc.bold(`\n${say('cli.listAreas.available')}`));
  if (available.length === 0) console.log(pc.green(`  ${say('cli.listAreas.allInstalled')}`));
  for (const preset of available) {
    const { name, description } = text(preset);
    console.log(`  ${pc.gray('○')} ${pc.bold(name)} (${pc.cyan(preset.id)}) - ${description}`);
  }
  console.log('');
  return 0;
}
