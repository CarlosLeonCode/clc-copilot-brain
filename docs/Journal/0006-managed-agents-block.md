# 0006. Managed assistant-rules block in AGENTS.md

- Status: Accepted
- Date: 2026-10-17

## Context

`AGENTS.md` is the rule file every AI tool reads (Claude Code, Cursor, Windsurf and Gemini CLI through symlinks; Antigravity directly). It is rendered from a template with company placeholders and then edited by owners, so ADR 0005 left it out of `upgrade`. As a result, brains used outside Claude Code never received new assistant rules, such as the plain-language rule and the plain-request table.

## Decision

- The template wraps section 0 (assistant rules for talking to people and the request table) in `<!-- copilot-brain:managed:start -->` / `<!-- copilot-brain:managed:end -->`.
- `upgrade` adds a `managed-block` policy for `AGENTS.md`. It replaces only the text between the markers. If the markers are missing, it inserts the block before the first `## ` heading, or appends it when there is none.
- ADR 0005 safety rules apply unchanged: a `.bak` copy is written first and never overwritten, the file is re-validated at apply time, symlinks and non-regular files are skipped, and files with init placeholders are skipped. Unpaired or reversed markers are skipped (`managed-markers-invalid`). A missing `AGENTS.md` is left to `doctor`.
- The real file is written in place. The adapters stay symlinks to it.

## Consequences

- Assistant rules now reach existing brains in every tool through `clc-brain upgrade`, and owner edits outside the block are kept.
- The block must contain no init placeholders and must stay identical in the root and template `AGENTS.md`, which tests enforce.
- Rules outside the block, such as old tone lines in older brains, are not refreshed. The block states that it overrides them.
