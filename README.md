# @clc/copilot-brain

> **Open Source Second Brain Engine for Organizations & AI Coding Copilots**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Multi-IDE](https://img.shields.io/badge/AI%20Adapters-Cursor%20%7C%20Windsurf%20%7C%20Claude%20%7C%20Gemini-purple.svg)](./AGENTS.md)

---

## 1. Why Copilot Brain?

Modern engineering teams rapidly deploy AI coding assistants like **Cursor**, **Windsurf**, and **Claude Code**, only to run into a critical wall: **AI Hallucinations and Tribal Knowledge Silos**.

- **SaaS Wikis Die**: Notion, Confluence, and Google Docs drift out of sync with code within weeks.
- **AI Agents Guess**: Ungrounded AI agents invent non-existent APIs, violate internal security policies, and recommend obsolete libraries.
- **Seat Licensing Taxes**: Enterprise wiki vendors charge per-seat taxes while trapping your core intellectual property in closed proprietary databases.

**`copilot-brain`** solves this by turning your Git repository into a deterministic **Single Source of Truth (SSOT)** for both human operators and autonomous AI agents.

```
                           ┌────────────────────────┐
                           │      AGENTS.md         │
                           │ (Universal SSOT Kernel)│
                           └───────────┬────────────┘
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   .cursorrules   │          │    CLAUDE.md     │          │  .windsurfrules  │
│   (Cursor IDE)   │          │  (Claude Code)   │          │  (Windsurf IDE)  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

---

## 2. Core Architecture & Domains

The engine organizes institutional knowledge into modular, schema-backed domain areas:

| Area | Purpose | Key Subdirectories & Contents |
| :--- | :--- | :--- |
| **`sales`** (Core) | Revenue Enablement & Deal Strategy | `icps/`, `battlecards/` (JSON + MD), `objections/`, `scripts/`, `case-studies/`, `calls/`, `win-loss/`, `qualification/`, `stages/` |
| **`marketing`** | Decoupled Brand & Messaging | `brand/`, `messaging/`, `content/`, `distribution/` |
| **`product`** | Product Lifecycle & Specs | `roadmap/`, `specs/` (PRDs & ADRs), `releases/` |
| **`operations`** | Execution & Continuity | `sops/` (JSON + MD), `tools/`, `vendors/` |
| **`hr_people`** | Talent & Culture Systems | `handbook/`, `hiring/` (scorecards), `onboarding/` (30-60-90) |
| **`finance_legal`** | Commercial Governance | `pricing/` (discount matrix), `compliance/` (NDAs, privacy) |

### Sales Intelligence (Closed-Loop)

`sales/` is a first-class citizen with partitioned memory and post-mortems:

- `sales/calls/YYYY-MM/`: analyzed call logs with structured frontmatter (rep, stage, outcome, detected objections, strengths, improvements). See `sales/calls/README.md`.
- `sales/win-loss/`: 4-dimension post-mortems (product, sales process, commercial, competitive) plus a reusable template.
- `sales/qualification/qualification-matrix.md`: MEDDPICC with disqualify-fast triggers.
- `sales/stages/pipeline-stages.md`: 5 stages with canonical exit-gate criteria.
- LLM prompts in `skills/skill_call_analyzer.md` and `skills/skill_monthly_retrospective.md` are exportable to ChatGPT/Claude — not an automatic pipeline.

---

## 3. Quick Start

### Installation

Run directly with `npx` or install globally:

```bash
# Direct execution via npx
npx @clc/copilot-brain init

# Or install globally
npm install -g @clc/copilot-brain
```

### Initializing Your Brain

Run `init` inside your repository or specify a target folder:

```bash
copilot-brain init
```

The interactive CLI will prompt you for:
1. **Organization Name**
2. **Industry & Domain**
3. **Core Tagline / Operating Thesis**
4. **Active Areas**: Select which departments to install (defaults to `sales` and `marketing`).

### Multi-IDE Symlink Adapters
`copilot-brain init` automatically creates relative symbolic links pointing directly to the root `AGENTS.md`:
- `CLAUDE.md` -> `AGENTS.md`
- `GEMINI.md` -> `AGENTS.md`
- `.cursorrules` -> `AGENTS.md`
- `.windsurfrules` -> `AGENTS.md`
- `.agents/skills/` -> Query and validation skills for autonomous agents

---

## 4. CLI Reference

### `copilot-brain doctor [dir] [--fix]`
Audits repository health, validates data files against schemas, checks symlinks, and offers automated non-destructive repairs.

```bash
$ copilot-brain doctor

=== Audit Summary ===
Checks passed: 12
Warnings: 0
Errors: 0

✔ All Second Brain health checks passed with zero errors or warnings!
```

### `copilot-brain add-area [dir]`
Interactively add uninstalled preset domains (e.g., `operations`, `product`, `finance_legal`) or scaffold a custom domain with clean boilerplate.

```bash
$ copilot-brain add-area
```

### `copilot-brain list-areas [dir]`
Displays installed areas versus available preset domains.

```bash
$ copilot-brain list-areas
```

---

## 5. JSON Schemas & Validation

All mission-critical structured records are defined by JSON Schemas under `schemas/`:
- `schemas/org-kernel.schema.json`: Organizational profile & area configuration
- `schemas/sales-battlecard.schema.json`: Competitor intelligence & silver bullets
- `schemas/sales-objection.schema.json`: Root causes, pivot scripts, and counter-arguments
- `schemas/sop.schema.json`: Step-by-step procedures with roles and verification criteria

Run `copilot-brain doctor` in your CI/CD pipeline to guarantee no malformed or stale assets are committed to `main`.

---

## 6. Playbooks & Maintenance Cadence

Operational governance playbooks are provided under `playbooks/`:
- [`00-FRAMEWORK-OVERVIEW.md`](./playbooks/00-FRAMEWORK-OVERVIEW.md): Architectural principles & SSOT protocol
- [`01-SALES-PLAYBOOK.md`](./playbooks/01-SALES-PLAYBOOK.md): Battlecards, objection matrices, win/loss reviews
- [`02-MARKETING-PLAYBOOK.md`](./playbooks/02-MARKETING-PLAYBOOK.md): Messaging consistency & decoupling from AI generators
- [`03-PRODUCT-PLAYBOOK.md`](./playbooks/03-PRODUCT-PLAYBOOK.md): PRDs, ADRs, and release communications
- [`04-OPERATIONS-PLAYBOOK.md`](./playbooks/04-OPERATIONS-PLAYBOOK.md): Creating and auditing SOPs
- [`05-PEOPLE-PLAYBOOK.md`](./playbooks/05-PEOPLE-PLAYBOOK.md): Culture documentation & hiring scorecards
- [`06-FINANCE-LEGAL-PLAYBOOK.md`](./playbooks/06-FINANCE-LEGAL-PLAYBOOK.md): Pricing changes & contracts

---

## 7. Claude Code & Agent Skills

### Slash Commands (`.claude/commands/`)

- `/brain` — master dashboard (areas, health, tools)
- `/brain:onboarding` — 8-step interview, 1 question at a time
- `/brain:sales` — live sales copilot (objections, battlecards, talk tracks)
- `/brain:doctor` — in-chat repo health audit
- `/brain:add-area` — scaffold new domains or assets

### LLM Skills (`skills/` + `.agents/skills/`)

- `skill_brain_onboarding.md` — organizational interview
- `skill_sales_copilot.md` — objection handling & competitor positioning
- `skill_call_analyzer.md` — transcript → structured `sales/calls/` log
- `skill_monthly_retrospective.md` — month-end trends + closed-loop updates
- `skill_brain_doctor.md` — audit protocol
- `skill_area_scaffolder.md` — schema-compliant scaffolding
- `.agents/skills/` — `brain-search.md`, `sales-assist.md`, `sop-auditor.md` for autonomous agents

### Ecosystem Tools

`org-kernel.json → ecosystemTools` declares optional integrations (not npm dependencies):

- **Archify** (`https://github.com/tt-a1i/archify`) — interactive workflow, sequence, and lifecycle diagrams for sales journey maps. The base template only declares the tool; actual diagrams live in the instantiated project, not here.

---

## 8. Development & Testing

```bash
npm test   # node --test tests/**/*.test.js — 58 tests
```

Suites: `cli` (lifecycle), `schemas` (positive + negative validation), `areas-integrity` (6 areas + 7 playbooks), `sales-intelligence` (calls, win-loss, qualification, stages, Archify), `ide-adapters` (SSOT symlinks, slash commands, skills).

`copilot-brain doctor` is CI-safe: validates JSON against `schemas/`, checks symlinks, and detects missing skills/commands.

---

## 9. License

MIT © [Carlos Leon Code Pro](https://github.com/carlosleoncodepro) — see [LICENSE](./LICENSE).
