# Organizational Second Brain Framework Overview

## 1. Executive Summary

The **Organizational Second Brain** is an open-source, version-controlled knowledge operating system designed for human operators and AI coding copilots. By anchoring institutional knowledge in standard Markdown and JSON schemas within your repository, it creates an unambiguous Single Source of Truth (SSOT).

### Core Pillars
1. **SSOT (Single Source of Truth)**: Every operational truth—from sales battlecards to deployment SOPs—lives in a tracked repository rather than ephemeral Slack channels or proprietary knowledge silos.
2. **Markdown & Schema First**: Content is structured in Git-friendly formats: Human-readable Markdown paired with validating JSON schemas.
3. **Decoupled AI Interoperability**: Compatible out-of-the-box with Cursor, Windsurf, Claude Code, Gemini CLI, and custom autonomous agents without vendor lock-in.
4. **Autonomous Domain Ownership**: Each business function (`sales`, `marketing`, `product`, `operations`, `hr_people`, `finance_legal`) has defined area stewards, explicit review cadences, and automated health checks.

---

## 2. Directory Architecture

```
.
├── org-kernel.json           # Organizational profile, active areas, governance configuration
├── company-profile.md        # Plain-text company narrative, positioning, and operating thesis
├── AGENTS.md                 # Universal Master Context file for AI copilots & autonomous agents
├── CLAUDE.md -> AGENTS.md    # Multi-IDE symlink adapter
├── GEMINI.md -> AGENTS.md    # Multi-IDE symlink adapter
├── .cursorrules -> AGENTS.md # Multi-IDE symlink adapter
├── .windsurfrules -> AGENTS.md
├── .agents/
│   └── skills/               # Reusable task skills (search, objection analysis, SOP audits)
├── playbooks/                # Departmental operational governance
│   ├── 00-FRAMEWORK-OVERVIEW.md
│   ├── 01-SALES-PLAYBOOK.md
│   └── ...
├── sales/                    # Revenue enablement hub
├── marketing/                # Brand, messaging, and distribution
├── product/                  # Roadmaps, PRDs, ADRs, releases
├── operations/               # SOPs, tool registry, vendor management
├── hr_people/                # Culture handbook, hiring scorecards, onboarding
└── finance_legal/            # Pricing tiers, approval matrices, legal templates
```

---

## 3. The SSOT Protocol & AI Synchronization

All AI tools read the root `AGENTS.md`. In modern agentic IDEs:
- **Cursor**: Reads `.cursorrules` (symlinked to `AGENTS.md`)
- **Windsurf**: Reads `.windsurfrules` (symlinked to `AGENTS.md`)
- **Claude Code**: Reads `CLAUDE.md` (symlinked to `AGENTS.md`)
- **Gemini CLI / Codex**: Reads `GEMINI.md` or `AGENTS.md` directly

### Grounding Rules for AI Agents:
1. **Never hallucinate company policy or specs**: AI agents must query existing files under relevant area directories before answering domain queries.
2. **Deterministic Schemas**: Machine-readable data structures (such as battlecards and SOPs) must conform to schemas in `schemas/`.
3. **Traceability**: Any update to the brain must cite the source (customer call notes, incident post-mortem, PRD, or executive decision).

---

## 4. Stewardship & Maintenance Cadence

| Area | Cadence | Primary Steward | Verification Routine |
| :--- | :--- | :--- | :--- |
| `sales` | Bi-weekly | Head of Sales / RevOps | Win/Loss reconciliation, competitor update, objection audit |
| `marketing` | Monthly | Head of Marketing / CMO | Messaging alignment, editorial review, channel performance |
| `product` | Per Sprint (2 wks)| Product Lead / VP Product | PRD sign-offs, ADR status changes, release notes compilation |
| `operations` | Quarterly | COO / Head of Ops | Tool license audit, vendor SLA check, SOP walk-through |
| `hr_people` | Quarterly | People Lead / HRBP | Handbook compliance, hiring rubrics, onboarding retrospectives |
| `finance_legal` | Bi-annual | Finance Director / GC | Pricing tier margins, contract templates, regulatory audit |

---

## 5. CLI Lifecycle Management

Use the `copilot-brain` CLI to maintain health and expand the brain:
- `copilot-brain doctor`: Scans repository integrity, validates schemas, and repairs broken adapter symlinks.
- `copilot-brain add-area`: Scaffolds new operational departments with production-ready presets or custom structures.
- `copilot-brain list-areas`: Displays installed vs available domains.
