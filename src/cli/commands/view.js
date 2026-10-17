// `view`: write the visual sales system page and optionally open it in the default browser.
import { spawn } from 'node:child_process';
import pc from 'picocolors';
import { writeSalesView } from '../../core/sales-view.js';

function openerFor(file, platform = process.platform) {
  if (platform === 'darwin') return ['open', [file]];
  if (platform === 'win32') return ['cmd', ['/c', 'start', '', file]];
  return ['xdg-open', [file]];
}

function openInBrowser(file) {
  const hint = () => console.log(pc.yellow(`Could not open the page automatically. Open this file in your browser:\n  ${file}`));
  try {
    const [command, args] = openerFor(file);
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', hint);
    child.unref();
  } catch {
    hint();
  }
}

export async function runView(targetDir, options) {
  const { outputPath } = writeSalesView(targetDir);
  console.log(pc.green(`Your sales system page is ready: ${outputPath}`));
  if (options.open) openInBrowser(outputPath);
  else console.log(`Open it in your browser, or run ${pc.cyan('clc-brain view --open')}.`);
  return 0;
}
