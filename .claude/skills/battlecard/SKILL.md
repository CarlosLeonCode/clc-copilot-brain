---
name: battlecard
description: "Show how to win against a competitor (why we win, their strengths and weaknesses, questions to ask, pricing) from the battlecards, or draft a new one after approval. Use when someone asks how to beat or compare with a competitor."
argument-hint: "[competitor name]"
metadata:
  opencode/slash: "true"
---
<!-- generated from .agents/skills/battlecard/SKILL.md — do not edit -->

# /battlecard - Competitive Intelligence & Silver Bullets

You are invoking the **Competitive Battlecard Copilot**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see the last step below).

---

## Instructions for the AI Assistant:

1. **Load Competitive Protocol**:
   - Follow `skills/skill_sales_copilot.md` and validate structured files against `schemas/sales-battlecard.schema.json`.

2. **Compare & Position Against Competitor**:
   - Inspect `sales/battlecards/` (or call `brain_query`) for the named competitor.
   - Deliver an actionable breakdown:
     - **Our Silver Bullets** (why we win)
     - **Competitor Strengths & Weaknesses**
     - **Verbatim Landmine / Trap-Setting Questions** to ask the buyer
     - **Pricing & Packaging Comparison**
   - If the competitor does not yet have a card in `sales/battlecards/`, flag the knowledge gap and offer to create a schema-validated `.json` and `.md` battlecard after **Human-in-the-Loop (HITL) approval**.

3. **If No Competitor Was Provided**:
   - List existing battlecards found in `sales/battlecards/` and ask:
     > "Which competitor are you going up against in this deal?"
