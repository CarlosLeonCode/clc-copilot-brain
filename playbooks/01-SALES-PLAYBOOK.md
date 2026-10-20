# Sales Enablement Playbook

## 1. Overview & Objective
The Sales Enablement repository represents the revenue engine's nervous system. It equips Account Executives (AEs), Sales Development Reps (SDRs), and Customer Success (CS) with real-time, field-tested positioning, objection responses, qualification frameworks, call intelligence, and competitive intelligence.

---

## 2. Directory Architecture

```
sales/
├── calls/          # Historical episodic call intelligence (YYYY-MM/YYYY-MM-DD_rep_prospect.md)
├── win-loss/       # 4-dimension deal post-mortems (templates, won/lost case analyses)
├── qualification/  # MEDDPICC qualification matrix, red flags, and disqualify-fast scripts
├── system.md       # Sales system map: stage -> exit gate -> plays
├── plays/          # One play per conversation type (decision tree, talk tracks, learnings log)
├── stages/         # Canonical pipeline stages (Discovery to Closed) with mandatory exit gates
├── skills/         # Specialized AI prompts (skill_call_analyzer.md, skill_monthly_retrospective.md)
├── icps/           # Ideal Customer Profiles (roles, pain points, triggers, disqualifiers)
├── battlecards/    # Competitor intelligence (dual format: JSON schema + Markdown)
├── objections/     # Root-cause matrices, live pivot scripts, and counter-arguments
├── scripts/        # Cold outreach cadences, discovery interview frameworks, closing guides
└── case-studies/   # Metric-driven proof points, customer stories, and reference clips
```

---

## 2b. The Sales System: Pipeline + Plays

Two layers work together:
- **Macro pipeline** (`sales/stages/pipeline-stages.md`): the stages and the gates a deal must clear.
- **Micro plays** (`sales/plays/<play>.md`): how to run one kind of conversation, as a decision tree with a talk track per branch.

`sales/system.md` maps each stage to its gate and plays. Use `/flow` to add or change a play (conversation tree) or the pipeline (macro change); a tree that spans stages is one play with `stages: 2, 3, 4`. Log the `play` and `branch` you ran in each call log so `/retro` can show what works.

---

## 3. Call Intelligence & Episodic Memory (`sales/calls/`)

Call recordings and discovery transcripts are systematically processed using `skills/skill_call_analyzer.md` and saved to `sales/calls/YYYY-MM/YYYY-MM-DD_<rep>_<prospect-slug>.md`.

### Intelligence Extraction Engine:
1. **Metadata Ingestion**: Rep identification (`Carlos`, `Juanita`, `Pepito`, etc.), prospect company, canonical deal stage, call type, and outcome.
2. **Signal Distillation**: 3-bullet executive summary, business pain quantification, and stakeholder alignment.
3. **Deterministic Grounding**:
   - Detected objections are mapped to `sales/objections/*.json` to evaluate pivot effectiveness.
   - Competitor mentions are matched against `sales/battlecards/*.json` to assess silver bullet deployment.
4. **Actionable Coaching Ledger**: Identifies what worked well (discovery depth, active listening) vs actionable areas for improvement (talk ratio, missed next meeting bookings).

---

## 4. Monthly Retrospective Rhythm (`skill_monthly_retrospective.md`)

On the first business day of every calendar month, RevOps executes an automated retrospective across all calls logged in `sales/calls/YYYY-MM/` and closed deal post-mortems in `sales/win-loss/`.

### The 4 Monthly Diagnostic Pillars:
1. **Objection Frequency Trends**: Track which objections are rising or falling in severity; isolate uncataloged hesitations for immediate matrix addition.
2. **Rep Win Rates & Coaching Ledgers**: Measure deal velocity, qualification rigor, and objection handling effectiveness per rep.
3. **Pipeline Chokepoint Analysis**: Diagnose friction stages (e.g. Discovery ➔ Validation vs Validation ➔ Proposal).
4. **Competitor Emergence**: Track new competitors entering deals and measure battlecard displacement rates.

### Closed-Loop Action Protocol:
- Scaffold or update battlecards in `sales/battlecards/`.
- Refine objection scripts in `sales/objections/`.
- Update customer journey and sequence diagrams via **Archify** (`https://github.com/tt-a1i/archify`).

---

## 5. Win / Loss Post-Mortem Cadence (`sales/win-loss/`)

Every deal above the Tier 1 ($100k ARR) or Tier 2 ($25k ARR) threshold triggers a structured post-mortem within **5 business days** of closing:

### The 4 Analytical Dimensions:
1. **Core Decision Driver**: The primary catalyst, business crisis, or technical factor that decided the win or loss.
2. **Pricing & Commercial Impact**: Total Cost of Ownership (TCO) perception, packaging fit, discount requests, and budget release friction.
3. **Competitor Impact**: Which competitors, legacy platforms, or in-house alternatives were considered; where our positioning held vs cracked.
4. **Process & Qualification Learnings**: Adherence to MEDDPICC, champion strength, sales cycle speed, and handoff quality.

---

## 6. Qualification & Pipeline Stage Gates (`sales/qualification/` & `sales/stages/`)

Deals cannot advance on optimism or gut feeling. Every stage transition requires verifying documented exit criteria:

- **Stage 1 (Discovery)**: Quantified pain, ICP match, identified champion, economic buyer mapped.
- **Stage 2 (Validation)**: Fit confirmed with no open blockers, decision maker met, shared plan agreed.
- **Stage 3 (Proposal)**: Value and budget confirmed, written proposal sent, preferred option selected.
- **Stage 4 (Negotiation)**: Buyer approvals granted, contract terms agreed, contract sent for signature.
- **Stage 5 (Closed)**: Closed Won handoff to CS or Closed Lost post-mortem executed within 5 days.

### Disqualify-Fast Rule:
Reps are mandated to disqualify deals within 7 days if any immediate disqualification trigger occurs (e.g., no Economic Buyer access by Stage 2, unsupported air-gapped legacy LDAP requirements, lack of compelling event).

---

## 7. Ecosystem Tools: Sales Journey Flow Diagramming

Per `org-kernel.json` -> `ecosystemTools.salesFlowDiagrams`, our recommended ecosystem tool for visual sales architecture is:
- **Tool**: [Archify](https://github.com/tt-a1i/archify)
- **Purpose**: Interactive workflow, sequence, and lifecycle diagramming for sales journey maps and buyer stage progressions.
- **Integration**: Zero npm dependencies. RevOps maintains visual journey models in Archify and updates flows whenever retrospectives identify process chokepoints.

---

## 8. AI Copilot Integration for Sales Reps

Sales reps running AI copilots (Claude Code, Cursor, Windsurf, Antigravity) leverage the skills library:
- `/brain-sales`: Surfaces objection pivot scripts, competitor battlecards, and talk tracks.
- `skills/skill_call_analyzer.md`: Ingests raw call transcripts and generates structured call logs.
- `skills/skill_monthly_retrospective.md`: Runs cross-functional monthly revenue analysis.
