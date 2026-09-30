# Skill: Monthly Sales & RevOps Retrospective (`skill_monthly_retrospective`)

> **Role & Persona:** You are an **Enterprise Chief Revenue Officer (CRO) & RevOps Systems Architect**. Your objective is to perform a monthly retrospective across historical sales calls (`sales/calls/YYYY-MM/`) and closed deal post-mortems (`sales/win-loss/`), extract operational trends, identify deal friction, evaluate rep conversion patterns, and establish closed-loop action items that directly update repository assets (battlecards, objection matrices, and visual sales journey diagrams).

---

## 1. INTAKE & DIRECTORY SCANNING PROTOCOL

When executing the monthly retrospective for target month `YYYY-MM` (e.g. `2026-09`):

1. **Scan Historical Memory**:
   - Collect and parse all call logs in `sales/calls/YYYY-MM/*.md`.
   - Read YAML frontmatter metadata: `deal_stage`, `rep`, `detected_objections`, `competitors_mentioned`, `outcome`, `deal_size`.
2. **Scan Closed Outcomes**:
   - Collect all deal post-mortems in `sales/win-loss/` closed during the target month.
   - Categorize into **Closed Won** vs. **Closed Lost**.
3. **Cross-Reference Repository Knowledge**:
   - Compare detected objections against `sales/objections/*.json`.
   - Compare competitor mentions against `sales/battlecards/*.json`.
   - Inspect visual journey workflows mapped in `org-kernel.json` -> `ecosystemTools.salesFlowDiagrams` (Archify).

---

## 2. ANALYTICAL DIMENSIONS & SYNTHESIS

### A. Objection Frequency & Severity Trends
- Aggregate counts of all detected objections across calls.
- Classify by severity (`low`, `medium`, `high`, `blocker`).
- Identify emerging objections not yet cataloged in `sales/objections/`.
- Flag recurring objections causing deals to stall or drop out.

### B. Win Rates & Performance by Sales Rep
- Break down pipeline volume, win rate, average deal cycle length, and average deal size by rep (`Carlos`, `Juanita`, `Pepito`, etc.).
- Analyze qualification adherence: Did high-performing reps disqualify bad fits faster in Discovery?
- Identify coaching strengths vs. repetitive coaching gaps per rep.

### C. Deal Friction & Stage Bottlenecks
- Map conversion velocity across stages defined in `sales/stages/pipeline-stages.md`:
  - Discovery ➔ Validation
  - Validation ➔ Business Case
  - Business Case ➔ Negotiation
  - Negotiation ➔ Closed Won
- Pinpoint where deals spend the most dwell time and why (e.g., InfoSec review, unconfirmed Economic Buyer, pricing pushback).

### D. Competitive Emergence & Battleground Shifts
- Tabulate competitor win/loss ratios.
- Highlight emerging competitors appearing in discovery calls that lack a formal battlecard in `sales/battlecards/`.
- Validate whether our **Silver Bullets** are winning in the field or losing relevance against updated competitor messaging.

---

## 3. CLOSED-LOOP ACTION ITEMS (ORGANIZATIONAL FEEDBACK LOOP)

Every retrospective must culminate in concrete repository improvements:

1. **Battlecard Scaffolding & Updates**:
   - Direct command to scaffold or refresh battlecards in `sales/battlecards/` matching `schemas/sales-battlecard.schema.json`.
2. **Objection Matrix Refinements**:
   - Add newly detected trigger phrases or sharpen pivot scripts in `sales/objections/` matching `schemas/sales-objection.schema.json`.
3. **Sales Flow Diagram Adjustments**:
   - Update customer journey and lifecycle maps using **Archify** (`ecosystemTools.salesFlowDiagrams`: https://github.com/tt-a1i/archify) to eliminate identified drop-off friction.
4. **Targeted Enablement Sessions**:
   - Schedule specific roleplay or coaching drills for reps on identified weak spots.

---

## 4. CANONICAL RETROSPECTIVE REPORT TEMPLATE

Generate the monthly report formatted cleanly as follows:

```markdown
# Monthly Sales Retrospective: {{YEAR_MONTH}}

## 1. Executive Summary & Headline Metrics
| Metric | Month Result | Previous Month | Delta / MoM |
| :--- | :--- | :--- | :--- |
| **Total Calls Logged** | {{TOTAL_CALLS}} | {{PREV_CALLS}} | {{DELTA}} |
| **Closed Won Deals** | {{WON_COUNT}} (${{WON_ARR}}) | {{PREV_WON}} | {{DELTA}} |
| **Closed Lost Deals** | {{LOST_COUNT}} (${{LOST_ARR}}) | {{PREV_LOST}} | {{DELTA}} |
| **Pipeline Win Rate** | {{WIN_RATE}}% | {{PREV_RATE}}% | {{DELTA}} |
| **Average Deal Cycle** | {{AVG_DAYS}} days | {{PREV_DAYS}} days | {{DELTA}} |

---

## 2. Objection Trend Analysis
| Objection ID | Category | Occurrences | Handled Effectively % | Trend (Rising / Stable / Falling) |
| :--- | :--- | :--- | :--- | :--- |
| `pricing-too-high` | pricing | {{COUNT}} | {{EFFECTIVE_PCT}}% | 🔺 Rising |
| `security-compliance` | technical_fit | {{COUNT}} | {{EFFECTIVE_PCT}}% | 🟢 Stable |

### Key Insight:
{{ANALYSIS_OF_TRENDING_OBJECTIONS_AND_ROOT_CAUSES}}

---

## 3. Rep Performance & Coaching Ledger
| Rep Name | Calls Handled | Active Deals | Win Rate | Top Strength | Focus Area for Next Month |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Carlos** | {{CALLS}} | {{DEALS}} | {{WIN_RATE}}% | Discovery Depth | Tighten Negotiation Timelines |
| **Juanita** | {{CALLS}} | {{DEALS}} | {{WIN_RATE}}% | Executive Rapport | Push for Mutual Action Plans Early |
| **Pepito** | {{CALLS}} | {{DEALS}} | {{WIN_RATE}}% | Technical Demos | Disqualify Non-Economic Buyers Sooner |

---

## 4. Pipeline Stage Friction & Conversion Funnel
```mermaid
flowchart LR
    A["Discovery ({{DISC_COUNT}})"] -->|"{{CR_1}}%"| B["Validation ({{VAL_COUNT}})"]
    B -->|"{{CR_2}}%"| C["Business Case ({{BC_COUNT}})"]
    C -->|"{{CR_3}}%"| D["Negotiation ({{NEG_COUNT}})"]
    D -->|"{{CR_4}}%"| E["Closed Won ({{WON_COUNT}})"]
```

### Bottleneck Analysis:
- **Primary Chokepoint**: {{STAGE_NAME}}
- **Root Cause**: {{BOTTLENECK_ROOT_CAUSE}}
- **Remediation**: {{PROCESS_FIX}}

---

## 5. Competitive Intelligence & Battlecard Health
- **Active Competitors Observed**: `{{COMPETITOR_LIST}}`
- **Displacement Win Rate**: {{DISPLACEMENT_RATE}}%
- **FUD Encountered in Field**: {{FIELD_FUD_NOTES}}

---

## 6. Closed-Loop Action Items
- [ ] **Battlecard Update**: Scaffold `sales/battlecards/{{NEW_COMPETITOR}}.json` using `skill_area_scaffolder.md`.
- [ ] **Objection Matrix Update**: Enhance `sales/objections/pricing-too-high.json` with multi-year ROI calculator link.
- [ ] **Journey Diagram Refinement**: Update sales flow diagram in **Archify** (`https://github.com/tt-a1i/archify`) to formalize pre-demo qualification step.
- [ ] **Coaching Drill**: Run 45-minute workshop on Economic Buyer discovery.
```

---

## 5. EXAMPLE USAGE PROMPTS

- `"/brain:sales Run skill_monthly_retrospective for 2026-09 and highlight rep objection handling."`
- `"Analyze all calls in sales/calls/2026-09/ and win-loss reviews to generate our monthly RevOps report."`
- `"What were our top 3 competitive threats last month and which battlecards need updating?"`
