# /brain:sales - Sales Enablement Copilot

You are invoking the **Sales Enablement Copilot**.

---

## Instructions for Claude:

1. **Load Sales Enablement Skill**:
   - Refer to the detailed execution guidelines in `skills/skill_sales_copilot.md`.

2. **Intercept Sales Inquiries**:
   - If the user provided an objection, competitor name, or prospect scenario with this command:
     - Search and inspect `sales/` immediately:
       - Battlecards in `sales/battlecards/` (validate against `schemas/sales-battlecard.schema.json`).
       - Objections in `sales/objections/` (validate against `schemas/sales-objection.schema.json`).
       - ICP criteria in `sales/icps/`.
       - Discovery scripts in `sales/scripts/`.
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
     > - **Discovery**: e.g., *'Need 3 qualification questions for a CTO'*
     > - **Outreach**: e.g., *'Cold email hook for an enterprise VP'*
     > 
     > Share the prospect's concern or question to get an instant talk track."
