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
  ${pc.green('upgrade')} [dir]      Update template-owned commands and skills of an existing brain (backups kept)
  ${pc.green('view')} [dir]         Build a visual page of your sales system (sales/sales-system.html)
  ${pc.green('help')}               Show this help message

${pc.bold('INIT OPTIONS:')}
  --name <text>       Organization / project name
  --industry <text>   Industry or domain
  --tagline <text>    Core tagline or mission
  --areas <list>      Comma-separated area ids (sales,marketing,product,operations,hr_people,finance_legal)
  --demo              Include demo samples (mock battlecards, objections, calls)
  --clean             No demo samples (empty folders and blank templates, the default)
  -y, --yes           Accept defaults for anything not passed as a flag
                      (all areas, clean brain unless --demo)

${pc.bold('ADD-AREA OPTIONS:')}
  --preset <id>       Install an uninstalled preset area
  --custom <id>       Create a custom area (id must match ^[a-z0-9_-]+$)

${pc.bold('DOCTOR OPTIONS:')}
  --fix               Apply non-destructive repairs (without a TTY, doctor never prompts)

${pc.bold('UPGRADE OPTIONS:')}
  -y, --yes           Apply the plan (without a TTY, upgrade only previews unless --yes)
  --dry-run           Show the plan and diffs without writing anything

${pc.bold('VIEW OPTIONS:')}
  --open              Open the page in your default browser after building it

${pc.bold('GLOBAL OPTIONS:')}
  -v, --version       Show version number
  -h, --help          Show help

${pc.bold('EXAMPLES:')}
  $ copilot-brain init
  $ copilot-brain init ./acme-brain --yes --clean --name "Acme" --industry "SaaS" --areas "sales,product"
  $ copilot-brain doctor ./acme-brain --fix
  $ copilot-brain add-area ./acme-brain --preset operations
  $ copilot-brain add-area ./acme-brain --custom legal_ops
  $ copilot-brain list-areas ./acme-brain
  $ copilot-brain mcp ./acme-brain
  $ copilot-brain upgrade ./acme-brain --dry-run
  $ copilot-brain view ./acme-brain --open
`;
}
