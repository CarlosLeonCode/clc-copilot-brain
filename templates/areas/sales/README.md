# Sales Enablement & Revenue Intelligence Hub

Welcome to the **Sales** area of the Organizational Second Brain. This directory is the single source of truth for revenue enablement, call intelligence, competitive positioning, pipeline qualification, and win/loss retrospectives.

---

## Directory Structure

- [calls/](./calls/): Historical episodic memory of sales calls organized by `YYYY-MM/YYYY-MM-DD_rep_prospect.md`.
- [win-loss/](./win-loss/): 4-dimension post-mortem analyses (`post-mortem-template.md`, won/lost case analyses).
- [qualification/](./qualification/): MEDDPICC qualification matrix, red flags, and disqualify-fast conversational scripts.
- [system.md](./system.md): The sales system map. Pipeline stage -> exit gate -> the plays that apply. Start here.
- [plays/](./plays/): One play per kind of conversation (`cold-call`, `discovery-call`, `demo-call`, `follow-up`): decision tree, talk track per branch, and a learnings log. A play can span several stages (`stages: 2, 3, 4`).
- [stages/](./stages/): Canonical pipeline stages (Discovery, Validation, Business Case, Negotiation, Closed) with mandatory exit criteria. Gate criteria only, no conversation trees.
- [skills/](./skills/): Specialized revenue intelligence prompts (`skill_call_analyzer.md`, `skill_monthly_retrospective.md`).
- [battlecards/](./battlecards/): Field-tested competitor intelligence with strengths, weaknesses, and silver bullets (JSON + Markdown).
- [objections/](./objections/): Root-cause objection matrices and conversational pivot scripts (JSON + Markdown).
- [icps/](./icps/): Ideal Customer Profiles detailing demographics, pain points, triggers, and decision criteria.
- [scripts/](./scripts/): Structured outreach, discovery call questions, and closing frameworks.
- [case-studies/](./case-studies/): Metric-backed proof points and customer stories.

---

## Strategic Revenue Modules

### 1. Call Intelligence & Episodic Memory (`calls/`)
Call transcripts and recording summaries are ingested using `skill_call_analyzer.md`. Every call extracts:
- Assigned Sales Rep (`Carlos`, `Juanita`, `Pepito`, etc.), Prospect, Stage, and Outcome.
- 3-bullet executive summary and key discussion points.
- Detected objections matched against `sales/objections/*.json`.
- Competitor mentions matched against `sales/battlecards/*.json`.
- Objective coaching feedback (strengths vs actionable improvement areas).

### 2. Monthly Retrospective Rhythm (`skill_monthly_retrospective.md`)
At the conclusion of each calendar month, RevOps runs a comprehensive retrospective across `sales/calls/YYYY-MM/` and `sales/win-loss/`:
- **Objection Frequency Trends**: Spiking objections and emerging uncataloged buyer hesitations.
- **Rep Performance & Win Rates**: Conversion rates, cycle velocity, and coaching ledgers.
- **Stage Friction**: Funnel bottlenecks and dwell times across pipeline stages.
- **Closed-Loop Action Items**: Automatic recommendations to scaffold battlecards, refine objection matrices, and adjust sales journey maps.

### 3. Win / Loss Post-Mortems (`win-loss/`)
All Tier 1 and Tier 2 deals receive a 4-dimension post-mortem within 5 business days of closing:
1. Core Decision Driver
2. Pricing Impact
3. Competitor Impact
4. Process & Qualification Learnings

### 4. Ecosystem Tools: Sales Journey Flow Diagramming
Visual sales lifecycle, interaction sequences, and customer journey maps are maintained using **Archify** (`https://github.com/tt-a1i/archify`), as declared in `org-kernel.json` -> `ecosystemTools.salesFlowDiagrams`.

---

## Governance & References
- **Review Cadence**: Bi-weekly operational review; monthly executive retrospective.
- **Master Playbook**: Refer to [01-SALES-PLAYBOOK.md](../../playbooks/01-SALES-PLAYBOOK.md).
