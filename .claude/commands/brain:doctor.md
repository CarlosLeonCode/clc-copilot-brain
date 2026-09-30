# /brain:doctor - Repository Health & Schema Auditor

You are invoking the **Brain Doctor Diagnostic & Repair Tool**.

---

## Instructions for Claude:

1. **Load Doctor Skill**:
   - Refer to the full diagnostic protocol in `skills/skill_brain_doctor.md`.

2. **Execute In-Chat Audit**:
   - Inspect `org-kernel.json` and validate against `schemas/org-kernel.schema.json`.
   - Verify `AGENTS.md` and multi-IDE adapters (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`).
   - Check all commands in `.claude/commands/` and skills in `skills/`.
   - Check active areas on disk match `org-kernel.json` -> `activeAreas`.
   - Validate all JSON files in `sales/battlecards/`, `sales/objections/`, and `operations/sops/` against their schemas in `schemas/`.
   - Check internal markdown links for broken paths.

3. **Report & Fix**:
   - Output the diagnostic table with status (PASS / WARN / FAIL).
   - If any errors or warnings exist, explain the root cause and propose concrete fixes.
   - Ask the user for confirmation to auto-repair issues, or apply fixes immediately if the user passed an argument like `--fix` or asked you to fix everything.
