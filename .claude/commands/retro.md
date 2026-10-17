# /retro - Monthly Sales & RevOps Retrospective

You are invoking the **Monthly RevOps Retrospective Engine**.

---

## Instructions for the AI Assistant:

1. **Load Retrospective Protocol**:
   - Follow the complete framework in `skills/skill_monthly_retrospective.md`.

2. **Aggregate & Analyze Monthly Performance**:
   - Scan `sales/calls/YYYY-MM/` (for the requested month or latest available partition) and `sales/win-loss/`.
   - Synthesize:
     - **Call Volume & Outcomes by Sales Rep**
     - **Top Recurring Buyer Objections** (and whether current scripts resolved them)
     - **Competitor Win/Loss Trends**
     - **Pipeline Stage Conversion Bottlenecks**
   - Propose concrete closed-loop updates to `sales/objections/`, `sales/battlecards/`, and `sales/scripts/`, pausing at a **Human-in-the-Loop (HITL) checkpoint** before writing changes.
