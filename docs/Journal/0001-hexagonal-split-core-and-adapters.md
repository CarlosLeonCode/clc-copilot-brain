# 0001. Hexagonal split: domain core vs CLI and MCP adapters

- Status: Accepted
- Date: 2026-10-16

## Context

`bin/cli.js` had grown to ~1100 lines mixing `@clack/prompts` interaction, `picocolors` output, filesystem scaffolding, schema validation, and health checks. The MCP server (`src/mcp/tools.js`) re-implemented its own doctor and could not reuse CLI logic. Domain behavior was only testable through subprocesses, and `.clckernel.yaml` declares the strict rule "Domain logic must be isolated from the CLI interface".

## Decision

- `src/core/` holds pure use cases (`scaffold`, `areas`, `doctor`, `demo`, `calls`, `objections`, `query`, `manifest`, `schema-validator`). They take explicit inputs (`rootDir`, options), return data, and throw `BrainError` with a stable `code`. No console output, prompts, colors, or `process.exit`.
- `src/cli/` is the CLI adapter: argument parsing, prompts, rendering, and mapping `BrainError` to exit code 1. One module per command under `src/cli/commands/`.
- `src/mcp/` is the MCP adapter: JSON-RPC plus thin tool handlers that call core and map `BrainError` to `isError` tool results.
- `bin/cli.js` is a 5-line entrypoint.
- Asset manifests (slash commands, skills) are derived from `templates/base/` instead of hard-coded lists.
- `tools/check_clean_architecture.js` enforces it: `bin/` files stay <= 150 lines and `src/core/` may not import UI packages or `src/cli/`, `src/mcp/`, `bin/`.

## Consequences

- CLI and MCP share one implementation of doctor, capture, query, and area rules; fixes land once.
- Core is unit-tested directly (`tests/core/`); subprocess tests remain as end-to-end coverage.
- The MCP `brain_doctor` now runs the full audit (same as the CLI) instead of a lighter, divergent check.
- New delivery mechanisms (HTTP, editor extensions) can reuse core without touching it.
