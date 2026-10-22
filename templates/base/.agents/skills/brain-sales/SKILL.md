---
name: brain-sales
description: "Sales copilot that gives the exact words for an objection, a competitor, a qualification question or an outreach hook, grounded in this brain. Use for any quick sales question."
argument-hint: "[objection, competitor or scenario]"
metadata:
  opencode/slash: "true"
---

# /brain-sales - Sales Enablement Copilot

You are invoking the **Sales Enablement Copilot**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see step 3 below).

---

## Instructions for the AI Assistant:

1. **Load Sales Enablement Skill**:
   - Refer to the detailed execution guidelines in `skills/skill_sales_copilot.md`.

2. **Intercept Sales Inquiries**:
   - If the user provided an objection, competitor name, or prospect scenario with this command:
     - Search and inspect `sales/` immediately:
       - Battlecards in `sales/battlecards/` (validate against `schemas/sales-battlecard.schema.json`).
       - Objections in `sales/objections/` (validate against `schemas/sales-objection.schema.json`).
       - ICP criteria in `sales/icps/`, and the qualification criteria in `sales/qualification/qualification-matrix.md`.
       - The team's sales terms in `sales/glossary.md` (when it exists): answer "What does X mean?" from it and use its words.
       - Saved scripts in `sales/scripts/`. To write a new script, follow `.agents/skills/script/SKILL.md`.
     - Respond using the structured response format:
       - **Instant Talk Track** (verbatim script for calls/emails)
       - **Strategic Rationale & Root Cause**
       - **Top 3 Counter-Arguments & Silver Bullets**
       - **Proof Points & References**
       - **Closing Call to Action / Next Step**

3. **If No Scenario Was Provided**:
   - Prompt the sales rep:
     > "What sales scenario or buyer challenge are you facing?
     > - **Objection**: e.g., *'Prospect says pricing is 2x our budget'*
     > - **Competitor**: e.g., *'How do we position against [Competitor]?'*
     > - **Discovery**: e.g., *'Need 3 qualification questions for the person who decides'*
     > - **Outreach**: e.g., *'Cold email hook for a busy business owner'*
     > 
     > Share the prospect's concern or question to get an instant talk track."

4. **Human-in-the-Loop (HITL) review checkpoint**:
   - Before saving a new battlecard or objection card, or before outreach is sent, show the draft and ask the person to confirm it with one plain yes/no question.
