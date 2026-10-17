# 0003. Project-specific CLC Kernel guards and pre-commit gate

- Status: Accepted
- Date: 2026-10-16

## Context

The CLC Kernel scaffold shipped generic guards aimed at a content-calendar style project. They did not check the risks specific to this package: unpublished runtime modules, schema drift in shipped templates, broken IDE adapter symlinks, divergence between root files and `templates/base/`, missing HITL checkpoints in skills, and CLI/domain coupling.

## Decision

Replace the generic guards with project-specific ones in `tools/`, registered in `.clckernel.yaml` and run by `node tools/audit.js`:

- `check_package_files` — every module reachable from `bin/` is covered by `package.json` `files`.
- `check_schema_usage` — template JSON assets and `org-kernel.json` conform to `schemas/`.
- `check_symlinks` — IDE adapters point at `AGENTS.md`.
- `check_template_sync` — synced files are identical between the root and `templates/base/`.
- `check_hitl` — agent skills keep Human-in-the-Loop checkpoints.
- `check_clean_architecture` — see ADR 0001.
- `scan_secrets` — no credentials committed.

`.githooks/pre-commit` runs `npm test` and then `node tools/audit.js`; any failure blocks the commit.

## Consequences

- Each guard targets a defect that actually happened or is likely in this repository, and each has fixture tests in `tests/guards.test.js`.
- Guards use only Node built-ins (CommonJS via `tools/package.json`) so the audit runs before dependencies are installed.
- Contributors must enable the hook (`git config core.hooksPath .githooks`); CI should run the same two commands.
