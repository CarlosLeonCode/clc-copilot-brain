# /retro - Monthly Sales & RevOps Retrospective

You are invoking the **Monthly RevOps Retrospective Engine**.

---

## Instructions for the AI Assistant:

1. **Load Retrospective Protocol**:
   - Follow the complete framework in `skills/skill_monthly_retrospective.md`.

2. **Aggregate & Analyze Monthly Performance**:
   - Get the numbers by running `clc-brain stats --month <YYYY-MM> --json` for the last complete month (or the month the user names). Never count by hand; if the command cannot run, say plainly that the numbers are approximate.
   - Report by type of sale and per person as well, and propose classifying calls that are still "Not classified yet" (a short plain list; write only after a yes).
   - Scan `sales/calls/YYYY-MM/` (for the requested month or latest available partition) and `sales/win-loss/`.
   - Synthesize:
     - **Call Volume & Outcomes by Sales Rep**
     - **Top Recurring Buyer Objections** (and whether current scripts resolved them)
     - **Competitor Win/Loss Trends**
     - **Pipeline Stage Conversion Bottlenecks**
     - **Play performance & proposed play edits** (per play/branch counts and drop-off, an Unattributed bucket for logs without `play`; read legacy and canonical keys)
   - Propose concrete closed-loop updates to `sales/objections/`, `sales/battlecards/`, and `sales/scripts/`, pausing at a **Human-in-the-Loop (HITL) checkpoint** before writing changes.
   - Apply a proposed edit to a play only after explicit approval from whoever runs `/retro`; then append a Learnings Log entry in that play file, bump the play's `version`, and refresh the sales system page by running `clc-brain view` (tell the person in plain words that their sales page is up to date).

3. **Report in Plain Words** (format in section 4 of the skill):
   - Start with **This month in 3 points**, then **Changes I suggest** as numbered yes/no questions in plain words (for example: "In the cold call, most people drop when we ask about budget. Want me to change that question to ...?").
   - Keep tables, the funnel, and per-rep details in the appendix and show them only if the user asks. No diagrams, links, IDs, or file paths in the main part, and never say "HITL" to the user.
