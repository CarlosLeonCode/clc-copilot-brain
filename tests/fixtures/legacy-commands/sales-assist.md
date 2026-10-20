---
name: sales-assist
description: Draft sales emails, answer buyer objections, beat competitors, and prepare calls with the right call guide from this brain. Use for any sales help request.
---

# Skill: Sales Enablement Assistant

## Purpose
Empowers agents to draft high-converting cold outreach, live objection pivots, and competitive deal strategy grounded in the brain.

## Trigger Scenarios
- "Draft a cold email to a prospective VP of Engineering"
- "How do we handle the objection that Competitor X is cheaper?"
- "Help me prepare for a discovery call with a healthcare fintech prospect"
- "Mejoremos el guion de la llamada en frío" / "El cliente dice que es caro"

## Execution Protocol
1. For a call or meeting, read `sales/system.md` (the sales system map) and use the matching call guide in `sales/plays/` (opening, questions, what to say on each pushback).
2. Load target persona from `sales/icps/`.
3. Check for relevant competitor intel in `sales/battlecards/` and objection answers in `sales/objections/`.
4. Reference concrete metrics or proof points from `sales/case-studies/`.
5. Follow script flow from `sales/scripts/`:
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
