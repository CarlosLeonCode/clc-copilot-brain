// `list-areas`: installed areas (with on-disk status) and available presets.
import pc from 'picocolors';
import { listAreas } from '../../core/areas.js';

export async function runListAreas(targetDir) {
  const { installed, available } = listAreas(targetDir);
  console.log(pc.bold(pc.cyan('\n=== Second Brain Area Status ===\n')));
  console.log(pc.bold('Installed Areas:'));
  if (installed.length === 0) {
    console.log(pc.yellow('  (No installed areas detected. Run "copilot-brain init" to get started.)'));
  }
  for (const area of installed) {
    const icon = area.onDisk ? pc.green('✔') : pc.red('✖ (missing folder)');
    console.log(`  ${icon} ${pc.bold(area.name)} (${pc.cyan(area.id)}) - ${area.description}`);
  }

  console.log(pc.bold('\nAvailable Preset Areas (Not Installed):'));
  if (available.length === 0) console.log(pc.green('  All available presets are currently installed.'));
  for (const preset of available) {
    console.log(`  ${pc.gray('○')} ${pc.bold(preset.name)} (${pc.cyan(preset.id)}) - ${preset.description}`);
  }
  console.log('');
  return 0;
}
