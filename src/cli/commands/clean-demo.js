// `clean-demo`: remove the demo assets seeded by the templates.
import pc from 'picocolors';
import { cleanDemo } from '../../core/demo.js';

export async function runCleanDemo(targetDir) {
  const { removed, kept } = cleanDemo(targetDir);
  if (removed.length === 0) {
    console.log(pc.green('No mock demo assets detected. Your repository is already clean!'));
  } else {
    console.log(pc.green(`Cleaned and removed ${removed.length} demo file(s):\n${removed.map((r) => `  • ${r}`).join('\n')}`));
  }
  if (kept.length > 0) {
    console.log(pc.yellow(`Kept ${kept.length} demo file(s) you edited (delete them manually if no longer needed):\n${kept.map((r) => `  • ${r}`).join('\n')}`));
  }
  return 0;
}
