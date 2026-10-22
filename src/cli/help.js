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
  ${pc.green('stats')} [dir]        Show how your sales are going: results by type of sale, call guide and person
  ${pc.green('upgrade')} [dir]      Update template-owned commands and skills of an existing brain (backups kept)
  ${pc.green('view')} [dir]         Build a visual page of your sales system (sales/sales-system.html)
  ${pc.green('help')}               Show this help message

${pc.bold('INIT OPTIONS:')}
  --name <text>       Organization / project name
  --industry <text>   Industry or domain
  --tagline <text>    Core tagline or mission
  --areas <list>      Comma-separated area ids (sales,marketing,product,operations,hr_people,finance_legal)
  --language <en|es>  Language for people: English or Spanish
                      (asked when run in a terminal; default: your computer's language)
  --methodology <meddpicc|sandler>
                      How your team sells: meddpicc (enterprise deals with many
                      stakeholders) or sandler (small and mid-size businesses,
                      short cycles). Sets the starter sales stages, qualification
                      and terms (asked when run in a terminal; default: meddpicc)
  --demo              Include demo samples (mock battlecards, objections, calls)
  --clean             No demo samples (empty folders and blank templates, the default)
  -y, --yes           Accept defaults for anything not passed as a flag
                      (all areas, clean brain unless --demo,
                      your computer's language unless --language,
                      meddpicc unless --methodology)

${pc.bold('ADD-AREA OPTIONS:')}
  --preset <id>       Install an uninstalled preset area
  --custom <id>       Create a custom area (id must match ^[a-z0-9_-]+$)

${pc.bold('DOCTOR OPTIONS:')}
  --fix               Apply non-destructive repairs (without a TTY, doctor never prompts)

${pc.bold('UPGRADE OPTIONS:')}
  -y, --yes           Apply the plan (without a TTY, upgrade only previews unless --yes)
  --dry-run           Show the plan and diffs without writing anything
  --force-skills      Also replace skills you edited with the new version (a .bak copy is kept)

${pc.bold('VIEW OPTIONS:')}
  --open              Open the page in your default browser after building it
  --draft <file>      Preview a draft call guide, script or pipeline without saving it (repeatable);
                      the preview goes to a temp file and sales/sales-system.html is untouched

${pc.bold('STATS OPTIONS:')}
  --month <YYYY-MM>   Show one month (compared with the month before) instead of this month and last
  --json              Print the full report as JSON (for your AI assistant)

${pc.bold('GLOBAL OPTIONS:')}
  -v, --version       Show version number
  -h, --help          Show help

${pc.bold('EXAMPLES:')}
  $ copilot-brain init
  $ copilot-brain init ./my-brain --yes --clean --name "My Company" --industry "SaaS" --areas "sales,product"
  $ copilot-brain init ./my-brain --yes --methodology sandler --language es
  $ copilot-brain doctor ./my-brain --fix
  $ copilot-brain add-area ./my-brain --preset operations
  $ copilot-brain add-area ./my-brain --custom legal_ops
  $ copilot-brain list-areas ./my-brain
  $ copilot-brain mcp ./my-brain
  $ copilot-brain stats ./my-brain --month 2026-09
  $ copilot-brain upgrade ./my-brain --dry-run
  $ copilot-brain view ./my-brain --open
  $ copilot-brain view ./my-brain --draft /tmp/cold-call-draft.md --open
`;
}
