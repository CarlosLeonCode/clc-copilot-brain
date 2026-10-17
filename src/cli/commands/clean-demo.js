// `clean-demo`: remove the demo assets seeded by the templates.
import pc from 'picocolors';
import { cleanDemo } from '../../core/demo.js';

export async function runCleanDemo(targetDir) {
  const { removed } = cleanDemo(targetDir);
  if (removed.length === 0) {
    console.log(pc.green('No mock demo assets detected. Your repository is already clean!'));
  } else {
    console.log(pc.green(`Cleaned and removed ${removed.length} demo file(s):\n${removed.map((r) => `  • ${r}`).join('\n')}`));
  }
  return 0;
}
