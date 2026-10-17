# 0004. MCP filesystem safety

- Status: Accepted
- Date: 2026-10-16

## Context

MCP tools write to and read from the user's repository using arguments supplied by an LLM client. Those arguments are untrusted: a date like `../../../evil`, an objection id with path segments, an `area` such as `../..`, or text with embedded newlines could escape the brain root, inject YAML frontmatter keys, or overwrite existing records.

## Decision

All rules live in `src/core/` so the CLI and MCP share them:

- **Strict date**: `brain_capture_call` requires a real calendar date in `YYYY-MM-DD` (`isIsoDate`); the month directory is derived from it.
- **Allowed areas**: `brain_query` accepts the preset area ids plus the `activeAreas` declared in the brain's `org-kernel.json`, keeping only ids matching `^[a-z0-9_-]+$` whose real path (symlinks resolved) stays inside the root. `tools/list` advertises that same list. The same id rule guards `add-area` and `init`.
- **Path containment**: resolved write paths are checked with `isInside()` against `sales/calls/`; objection ids must match `^[a-z0-9-]+$` before touching disk.
- **Quoted frontmatter**: call-log frontmatter values are emitted as JSON-escaped double-quoted YAML scalars, so newlines and colons cannot add keys.
- **No overwrite**: call logs get a `-2`, `-3`... suffix when the name exists and are written with the `wx` flag. Init never deletes a regular IDE adapter file; it is moved to `<name>.bak` (or left untouched if a backup exists) and reported.

## Consequences

- Traversal, injection, and clobbering are covered by `tests/mcp-security.test.js`, `tests/regressions.test.js`, and `tests/core/`.
- Custom areas are queryable over MCP without loosening validation.
- Objection capture still overwrites a card with the same id (an intentional "save or update" semantic).
