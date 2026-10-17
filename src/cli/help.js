import pc from 'picocolors';

export function renderHelp(version) {
  return `
${pc.bold(pc.cyan('copilot-brain'))} - Open Source Second Brain Engine for Organizations & AI Copilots (v${version})

${pc.bold('USAGE:')}
  copilot-brain <command> [directory] [options]
  clc-brain <command> [directory] [options]

${pc.bold('COMMANDS:')}
  ${pc.green('init')} [dir]         Initialize a new Organizational Second Brain in target directory
  ${pc.green('add-area')} [dir]     Add an uninstalled preset domain or create a custom area
  ${pc.green('clean-demo')} [dir]   Remove mock demo assets and keep only real company data
  ${pc.green('doctor')} [dir]       Audit repository health, schemas, and repair broken symlinks
  ${pc.green('list-areas')} [dir]   Show installed vs available domain areas
  ${pc.green('mcp')} [dir]          Start the Model Context Protocol (MCP) server over stdio
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
`;
}
