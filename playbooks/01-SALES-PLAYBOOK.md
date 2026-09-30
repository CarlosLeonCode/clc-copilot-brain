# Sales Enablement Playbook

## 1. Overview & Objective
The Sales Enablement repository represents the revenue engine's nervous system. It equips Account Executives (AEs), Sales Development Reps (SDRs), and Customer Success (CS) with real-time, field-tested positioning, objection responses, and competitive intelligence.

---

## 2. Directory Architecture

```
sales/
├── icps/           # Ideal Customer Profiles (roles, pain points, triggers, disqualifiers)
├── battlecards/    # Competitor intelligence (dual format: JSON schema + Markdown)
├── objections/     # Root-cause matrices, live pivot scripts, and counter-arguments
├── scripts/        # Cold outreach cadences, discovery interview frameworks, closing guides
└── case-studies/   # Metric-driven proof points, customer stories, and reference clips
```

---

## 3. Battlecard Maintenance Lifecycle

Competitive intelligence decays quickly. A battlecard older than 60 days is considered unverified.

### Lifecycle Workflow:
1. **Intelligence Intake**: When a prospect or customer reveals competitor shifts (pricing changes, feature deprecation, acquisitions), the AE logs an issue or notes file.
2. **Schema Verification**: Every competitor file has a JSON representation matching `schemas/sales-battlecard.schema.json` and a human-friendly Markdown copy.
3. **Silver Bullet Formulation**:
   - Every battlecard must specify at least two **Silver Bullets**: precise technical or operational differentiators where our solution cleanly wins.
   - Avoid generic claims ("we have better support"). Use verifiable points ("zero-config local deployment with SOC2 Type II compliance vs cloud-only vendor lock-in").
4. **Bi-Weekly Review**: RevOps reconciles battlecards against recent win/loss data every other Tuesday.

---

## 4. Objection Handling Matrix Protocol

Objections are symptoms, not root causes. The brain structures objections into four dimensions:
1. **Trigger Phrase**: What the prospect literally said (e.g., "Your tool looks too expensive for our stage").
2. **Root Cause**: The unstated fear or reality (e.g., Unclear ROI timeline, unbudgeted department spend, fear of champion embarrassment).
3. **The Pivot Script**: A 2-sentence conversational technique:
   - *Acknowledge & Validate*: "Completely hear you—budget scrutiny is top of mind for everyone this quarter."
   - *Refocus / Pivot*: "Can we look at what delaying migration costs your team in engineering hours each month?"
4. **Counter-Arguments & Proof Points**: Direct links to case studies in `sales/case-studies/` demonstrating rapid payback period.

---

## 5. Win / Loss Review Cadence

Every deal outcome above the qualifying ARR threshold triggers a structured review:
- **Won Deals**: Identify the winning trigger, the decisive feature/proof point, and the competitor displaced. Commit learnings to `case-studies/` or update battlecard `winLossStats`.
- **Lost Deals**: Unpack real loss reason (product gap, price, timing, internal champion churn). Update objection matrices or file a product feedback brief under `product/specs/`.

---

## 6. AI Copilot Integration for Sales Reps
Sales reps running copilot agents (Cursor, Windsurf, or Claude) can use native prompts:
- *"Draft a follow-up email to a Fintech CTO raising security compliance objections, referencing our SOC2 case study."*
- Copilot grounds the draft directly in `sales/icps/enterprise-cto.md` and `sales/objections/pricing-too-high.md`.
