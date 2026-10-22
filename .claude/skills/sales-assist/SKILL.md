---
name: sales-assist
description: "Draft sales emails, answer buyer objections, beat competitors, and prepare calls with the right call guide from this brain. Use for any sales help request."
argument-hint: "[what you need help with]"
metadata:
  opencode/slash: "true"
---
<!-- generated from .agents/skills/sales-assist/SKILL.md — do not edit -->

# Skill: Sales Enablement Assistant

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need.

## Purpose
Empowers agents to draft high-converting cold outreach, live objection pivots, and competitive deal strategy grounded in the brain.

## Trigger Scenarios
- "Draft a cold email to the owner of a company we want to reach"
- "How do we handle the objection that Competitor X is cheaper?"
- "Help me prepare for a discovery call with a healthcare fintech prospect"
- "Mejoremos el guion de la llamada en frío" / "El cliente dice que es caro"

## Execution Protocol
1. For a call or meeting, read `sales/system.md` (the sales system map) and use the matching call guide in `sales/plays/` (opening, questions, what to say on each pushback). Use its stage names, the qualification criteria in `sales/qualification/qualification-matrix.md` and the terms in `sales/glossary.md` (when it exists), never another sales method's words.
2. Load target persona from `sales/icps/`.
3. Check for relevant competitor intel in `sales/battlecards/` and objection answers in `sales/objections/`.
4. Reference concrete metrics or proof points from `sales/case-studies/`.
5. Use the saved scripts in `sales/scripts/` when they exist. If the person needs a new script, or a script for another industry, follow `.agents/skills/script/SKILL.md`. For outreach, follow this flow:
   - Pattern interrupt / genuine hook.
   - Specific quantified business impact.
   - Low-friction call to action (e.g., 15-minute intro vs high-pressure demo).
6. Never invent features or compliance claims not documented in the repository.

## Talking to the person
- Use plain, friendly words in the person's language; give the exact words to say first.
- Never show internal IDs (play IDs, branch codes like B3), field names, or file paths: say "the cold call guide". Do not say HITL, gate, or play unless the person does.
- Ask at most one question at a time.

## Human-in-the-Loop (HITL) Checkpoint
- Require human sales rep review and confirmation before sending drafted outreach or applying negotiation strategies to active prospect deals. Ask it as one plain yes/no question ("Send it?" / "¿Lo envío?").
