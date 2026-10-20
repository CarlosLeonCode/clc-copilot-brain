---
name: objection
description: "Give the exact words to answer a buyer objection (for example \"too expensive\") from the objection cards, or save a new objection card after approval. Use when a prospect pushes back."
argument-hint: "[what the buyer said]"
metadata:
  opencode/slash: "true"
---
<!-- generated from .agents/skills/objection/SKILL.md — do not edit -->

# /objection - Instant Objection Handler & Card Builder

You are invoking the **Sales Objection Copilot**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see the last step below).

---

## Instructions for the AI Assistant:

1. **Load Objection Handling Protocol**:
   - Follow `skills/skill_sales_copilot.md` and validate structured files against `schemas/sales-objection.schema.json`.

2. **Resolve or Capture Objection**:
   - **If the user asks how to handle an objection** (e.g., *"Prospect says we are too expensive"* or *"They want to wait until next quarter"*):
     - Search `sales/objections/` (or call `brain_query`).
     - Provide the **Verbatim Pivot Script**, **Root Cause**, **Top 3 Counter-Arguments**, **Proof Points**, and **Suggested Next Step**.
   - **If the user wants to save a new objection** or the objection is missing from `sales/objections/`:
     - Draft a complete objection card (`id`, `title`, `category`, `severity`, `triggerPhrases`, `rootCause`, `pivotScript`, `counterArguments`, `suggestedNextStep`).
     - Request **Human-in-the-Loop (HITL) confirmation** and save both `.json` and `.md` files in `sales/objections/` (or invoke `brain_capture_objection`).

3. **If No Topic Was Provided**:
   - Prompt the user:
     > "What buyer objection are you facing right now, or what new objection would you like to add to `sales/objections/`?"
