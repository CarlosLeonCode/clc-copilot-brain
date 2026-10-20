---
name: brain-add-area
description: "Add a new area (for example customer success) or a new battlecard, objection card or SOP that follows the brain schemas, written after review. Use when someone wants to add knowledge to the brain."
argument-hint: "[area or asset, e.g. customer_success]"
metadata:
  opencode/slash: "true"
---

# /brain-add-area - Knowledge Area & Asset Scaffolder

You are invoking the **Brain Area & Asset Scaffolder**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see step 3 below).

---

## Instructions for the AI Assistant:

1. **Load Scaffolder Skill**:
   - Refer to the detailed scaffolding workflows in `skills/skill_area_scaffolder.md`.

2. **Determine Scaffolding Target**:
   - Check if the user specified what they want to add (e.g., `/brain-add-area customer_success` or `/brain-add-area battlecard CompetitorY`):
     - **A new operational domain area**: (e.g., `security`, `legal`, `customer_success`)
     - **A new competitor battlecard**: (e.g., in `sales/battlecards/`)
     - **A new sales objection matrix**: (e.g., in `sales/objections/`)
     - **A new SOP**: (e.g., in `operations/sops/`)

3. **If Target Was Not Specified**:
   - Ask the user:
     > "What would you like to scaffold?
     > 1. **New Operational Domain Area** (e.g., `security`, `customer_success`, `partnerships`)
     > 2. **New Competitor Battlecard** (creates validated JSON in `sales/battlecards/`)
     > 3. **New Sales Objection** (creates validated JSON in `sales/objections/`)
     > 4. **New Standard Operating Procedure (SOP)** (creates validated JSON in `operations/sops/`)"

4. **Execute & Validate**:
   - Collect required fields one step at a time or parse user input.
   - Write the files strictly conforming to `schemas/`.
   - Update `org-kernel.json`, `company-profile.md`, and `AGENTS.md` when adding new areas.
   - Report success with file paths created and schema validation confirmation.
