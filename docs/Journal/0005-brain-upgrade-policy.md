# 0005. Brain upgrade policy

- Status: Accepted
- Date: 2026-10-17

## Context

Brains are scaffolded from templates and then edited by their owners. When the package ships new commands, skills, or sales plays, existing brains have no safe way to receive them: re-running `init` is not an option, and blindly overwriting would destroy local edits.

## Decision

`clc-brain upgrade` uses an explicit allowlist in `src/core/upgrade.js`; anything not listed is never touched (company data, `org-kernel.json`, area documents, calls, objections, battlecards).

- **Template-owned, replace with backup**: base `.agents/skills/<name>/SKILL.md` (formerly `.claude/commands/*.md`, see the update below) and `skills/*.md`. When bytes differ from the template, the file is replaced and the previous version is copied to `<file>.bak`.
- **Add if missing**: new base commands and skills, plus `sales/system.md` and `sales/plays/*.md` when `sales` is active. Existing sales files are user data and are never replaced.
- **No-clobber backups**: an existing `.bak` is never overwritten; that file is skipped (`backup-exists`) and reported.
- **Safety skips**: symlinks, non-regular files, templates with unresolved placeholders, and files changed between plan and apply are skipped and reported.
- **Plan first**: `planUpgrade` is pure; `applyUpgrade` re-validates each action against disk. The CLI shows adds, compact diffs, and skips, and writes only with `--yes` or an interactive confirmation. Without a TTY and without `--yes` it prints the plan, writes nothing and exits 1 so scripts notice the pending upgrade; `--dry-run` never writes and exits 0.

## Consequences

- Upgrades are repeatable: an up-to-date brain yields an empty plan ("nothing to do").
- Local edits to template-owned files survive as `.bak` but need manual re-merging; once a `.bak` exists, further changes to that file are skipped until it is removed.
- Covered by `tests/core/` (planner) and `tests/upgrade-cli.test.js` (CLI).
- Addendum (2026-10-17): `AGENTS.md` is no longer fully unmanaged; its marked assistant-rules block is refreshed by `upgrade` (see ADR 0006).

## Update: one skill source for every slash command

`.claude/commands/` is no longer shipped. Every slash command is `.agents/skills/<name>/SKILL.md`; the shortcuts for Claude Code, Gemini CLI and Windsurf are generated from it (`src/core/harness-adapters.js`). Names with `:` became hyphenated (`brain:doctor` -> `brain-doctor`). Upgrades delete an old command file only when its hash matches a shipped version and keep (and report) any other.
