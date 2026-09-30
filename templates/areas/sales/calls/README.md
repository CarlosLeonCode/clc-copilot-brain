# Historical Sales Calls Memory Hub (`sales/calls/`)

Welcome to the **Call Intelligence & Episodic Memory Hub**. This directory stores structured intelligence extracted from sales discovery calls, demos, technical validations, and negotiation sessions.

---

## 1. Storage Hierarchy & Naming Convention

All calls are partitioned chronologically by month into subdirectories:

```
sales/calls/
├── README.md
└── YYYY-MM/
    └── YYYY-MM-DD_<rep>_<prospect-slug>.md
```

### File Naming Rules:
- `YYYY-MM`: Four-digit year followed by two-digit month (e.g. `2026-09`).
- `YYYY-MM-DD`: Date of the call in ISO 8601 format (e.g. `2026-09-15`).
- `<rep>`: First name of the assigned AE or SDR in lowercase (e.g. `carlos`, `juanita`, `pepito`).
- `<prospect-slug>`: Lowercase, hyphen-delimited company name (e.g. `acme-corp`, `nexapay-systems`).
- **Example**: `sales/calls/2026-09/2026-09-15_carlos_acme-corp.md`

---

## 2. The Role of Historical Episodic Memory

Rather than leaving call recordings and notes scattered across disparate tools (Zoom, Gong, Google Docs, Notion), logging calls into this repository fulfills four strategic objectives:

1. **AI Agent Context & Handoffs**:
   Autonomous copilots (Claude, Cursor, Windsurf, Antigravity) use these call logs to recall specific buyer statements, stakeholder dynamics, architectural caveats, and pricing commitments during proposals, renewals, or account transitions.
2. **Deterministic Objection Tracking**:
   Every detected objection is matched directly with root causes in `sales/objections/*.json`, tracking field prevalence over time.
3. **Competitive Field Intelligence**:
   Real-time notes on competitor pricing, FUD, or claims are cross-referenced with `sales/battlecards/*.json`.
4. **Data Engine for Monthly Retrospectives**:
   The `skill_monthly_retrospective.md` skill scans monthly directories to compute rep conversion rates, stage friction points, and objection trends.

---

## 3. Metadata Schema (YAML Frontmatter)

Every call file must begin with YAML frontmatter:

```yaml
---
call_id: "CALL-2026-09-15-01"
date: "2026-09-15"
rep: "Carlos"
prospect_company: "Acme Corp"
contact_name: "Sarah Lin"
contact_role: "VP of Engineering"
deal_stage: "Discovery"
call_type: "Discovery & Qualification"
outcome: "Advanced"
deal_size: "$120,000 ARR"
detected_objections:
  - id: "pricing-too-high"
    severity: "medium"
    handled_effectively: true
competitors_mentioned:
  - id: "competitor-alpha"
    context: "Piloting Competitor Alpha, worried about vendor lock-in"
next_meeting: "2026-09-24T15:00:00Z"
---
```

---

## 4. How to Log and Analyze Calls

Use the AI skill `skill_call_analyzer.md`:
```bash
# In Claude Code or your agent terminal:
/brain:sales Analyze this call transcript and save to sales/calls/2026-09/
```
Or paste the transcript directly to your LLM copilot using the prompt in `skills/skill_call_analyzer.md`.
