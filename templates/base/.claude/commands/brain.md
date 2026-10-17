# /brain - Second Brain Master Control

You are invoking the **Organizational Second Brain Master Control**.

---

## Instructions for Claude:

1. **Read Repository State**:
   - Inspect `org-kernel.json` in the workspace root.
   - Parse `organization.name`, `organization.industry`, `organization.tagline`, `governance.owner`, and `activeAreas`.
   - If `org-kernel.json` is missing or uninitialized, instruct the user to run `/brain:onboarding`.

2. **Display Brain Dashboard**:
   Present an executive status summary to the user:
   ```markdown
   # 🧠 Second Brain Master Control: [Organization Name]
   > **Domain / Industry:** [Industry]  
   > **Mission / Tagline:** [Tagline]  
   > **Governance Steward:** [Owner]  

   ### 📂 Active Operational Areas
   - [Area 1]: [Brief status or file count]
   - [Area 2]: [Brief status or file count]
   ...

   ---

   ### ⚡ Available Brain Slash Commands
   - `/call` - Analyze and save a sales call transcript or meeting notes into `sales/calls/YYYY-MM/`.
   - `/objection` - Get an instant answer to a buyer objection or save a new one in `sales/objections/`.
   - `/battlecard` - Compare against a competitor in seconds using `sales/battlecards/`.
   - `/flow` - Check pipeline stage rules or update your visual Mermaid sales flow diagram.
   - `/retro` - Run your monthly sales & RevOps retrospective.
   - `/brain:onboarding` - Run guided organizational onboarding interview (strictly 1 question at a time).
   - `/brain:sales` - Sales Enablement Copilot (objection handling, competitor battlecards, discovery scripts).
   - `/brain:doctor` - Run comprehensive health check, validate schemas, and fix issues.
   - `/brain:add-area` - Scaffold a new operational domain or knowledge entry (battlecard, objection, SOP).

   ---

   ### 💬 Conversational Queries You Can Ask
   - *"How do we position against [Competitor]?"*
   - *"What's our script when a prospect says we're too expensive?"*
   - *"What are the steps in our incident response SOP?"*
   - *"Show me our target ICP pain points."*
   ```

3. **Prompt the User**:
   Ask the user what they would like to work on or inspect today.
