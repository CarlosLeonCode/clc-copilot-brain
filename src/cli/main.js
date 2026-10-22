// CLI adapter entry: parse argv, dispatch to a command, map domain errors to exit codes.
import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { BrainError } from '../core/errors.js';
import { readPackageVersion } from '../core/package-paths.js';
import { parseArgs } from './args.js';
import { renderHelp } from './help.js';
import { renderStartScreen } from './start.js';
import { runAddArea } from './commands/add-area.js';
import { runCleanDemo } from './commands/clean-demo.js';
import { runDoctorCommand } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runListAreas } from './commands/list-areas.js';
import { runMcp } from './commands/mcp.js';
import { runMigrate } from './commands/migrate.js';
import { runStats } from './commands/stats.js';
import { runUpgrade } from './commands/upgrade.js';
import { runView } from './commands/view.js';

const COMMANDS = {
  init: runInit,
  'add-area': runAddArea,
  'clean-demo': runCleanDemo,
  doctor: runDoctorCommand,
  'list-areas': runListAreas,
  mcp: runMcp,
  migrate: runMigrate,
  stats: runStats,
  upgrade: runUpgrade,
  view: runView
};

export async function main(argv = process.argv.slice(2)) {
  const { args, options } = parseArgs(argv);
  const [command, dirArg] = args;
  const version = readPackageVersion();

  if (options.version || options.v) {
    console.log(`copilot-brain v${version}`);
    return 0;
  }
  if (options.help || options.h || command === 'help') {
    console.log(renderHelp(version));
    return 0;
  }
  if (!command) {
    console.log(renderStartScreen(process.cwd()));
    return 0;
  }

  const run = COMMANDS[command];
  if (!run && args.length === 1 && isDirectory(command)) {
    console.log(renderStartScreen(path.resolve(process.cwd(), command)));
    return 0;
  }
  if (!run) {
    console.error(pc.red(`Unknown command: "${command}"`));
    console.log(renderHelp(version));
    return 1;
  }

  const targetDir = path.resolve(process.cwd(), dirArg || '.');
  try {
    return (await run(targetDir, options)) ?? 0;
  } catch (err) {
    if (err instanceof BrainError) {
      p.cancel(pc.red(err.message));
      return 1;
    }
    throw err;
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Run main and translate its result into the process exit code. */
export function runCli() {
  main().then(
    (code) => { process.exitCode = code; },
    (err) => {
      console.error(pc.red(`\nFatal error: ${err.message}`));
      process.exitCode = 1;
    }
  );
}
