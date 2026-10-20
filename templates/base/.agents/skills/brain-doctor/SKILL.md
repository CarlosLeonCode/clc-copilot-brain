---
name: brain-doctor
description: "Check the health of this brain (settings, assistant rules, shortcuts, skills, areas, schemas, broken links) and offer fixes after approval. Use when someone asks to check or repair the brain."
argument-hint: "[--fix]"
metadata:
  opencode/slash: "true"
---

# /brain-doctor - Repository Health & Schema Auditor

You are invoking the **Brain Doctor Diagnostic & Repair Tool**.

**User input:** $ARGUMENTS

If no arguments were given, run the full check and ask the user before fixing anything.

---

## Instructions for the AI Assistant:

1. **Load Doctor Skill**:
   - Refer to the full diagnostic protocol in `skills/skill_brain_doctor.md`.

2. **Execute In-Chat Audit**:
   - Inspect `org-kernel.json` and validate against `schemas/org-kernel.schema.json`.
   - Verify `AGENTS.md` and multi-IDE adapters (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`).
   - Check the skills in `.agents/skills/` (each `<name>/SKILL.md`), their generated shortcuts (`.claude/skills/`, `.gemini/commands/`, `.windsurf/workflows/`) and the skills in `skills/`. Run `clc-brain doctor` when you can run commands.
   - Check active areas on disk match `org-kernel.json` -> `activeAreas`.
   - Validate all JSON files in `sales/battlecards/`, `sales/objections/`, and `operations/sops/` against their schemas in `schemas/`.
   - Check internal markdown links for broken paths.

3. **Report & Fix**:
   - Output the diagnostic table with status (PASS / WARN / FAIL).
   - If any errors or warnings exist, explain the root cause and propose concrete fixes.
   - Ask the user for confirmation to auto-repair issues, or apply fixes immediately if the user passed an argument like `--fix` or asked you to fix everything.
