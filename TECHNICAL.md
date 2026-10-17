# Technical Architecture & Engineering Guide

> **Single Source of Truth for Engineers, DevOps, and System Integrators**  
> For the non-technical overview and setup guide, see [README.md](./README.md) or [README.es.md](./README.es.md).

---

## 1. Architectural Overview

`@clc/copilot-brain` is a modular, schema-enforced knowledge engine and runtime that turns a Git repository into an active Single Source of Truth (SSOT) for human operators and autonomous AI agents.

### High-Level System Architecture

```
                                 ┌─────────────────────────┐
                                 │   AI Clients / Agents   │
                                 │ Claude Desktop / Cursor │
                                 │  Antigravity / Raycast  │
                                 └────────────┬────────────┘
                                              │ stdio (JSON-RPC 2.0)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Model Context Protocol (MCP) Server                             │
│                     (`src/mcp/server.js` -> `src/mcp/tools.js`)                        │
│  - Protocol Handshake (`initialize`, `notifications/initialized`)                      │
│  - Tool Registry (`tools/list`) & Execution Router (`tools/call`)                      │
│  - Prompt Registry (`prompts/list`) & Slash Prompt Resolver (`prompts/get`)            │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │     Query Engine        │                     │  Ingestion & Prompts    │
         │ (`src/core/query.js`)   │                     │ (`src/core/calls.js` …) │
         │ - Recursive scan        │                     │ - Call transcript logs  │
         │ - Snippet extraction    │                     │ - Actionable /prompts   │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      ▼                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Domain Repository Layer                                │
│                                                                                        │
│  ├── org-kernel.json                (Organization profile & active domains)            │
│  ├── AGENTS.md                      (Universal SSOT Master Directive)                  │
│  ├── schemas/                       (Draft 2020-12 JSON Schemas)                       │
│  │   ├── org-kernel.schema.json                                                        │
│  │   ├── sales-battlecard.schema.json                                                  │
│  │   ├── sales-objection.schema.json                                                   │
│  │   └── sop.schema.json                                                               │
│  ├── sales/                         (Calls, battlecards, objections, qualification)    │
│  ├── marketing/                     (Brand, messaging pillars, editorial calendars)    │
│  ├── product/                       (PRDs, ADRs, roadmaps, release communications)     │
│  ├── operations/                    (Standard Operating Procedures, vendor SLAs)       │
│  ├── hr_people/                     (Culture handbook, scorecards, onboarding)         │
│  └── finance_legal/                 (Pricing tiers, discount matrices, compliance)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Module Boundaries (Hexagonal Split)

Domain logic lives in `src/core/`; the CLI and the MCP server are thin adapters over the same use cases ([ADR 0001](./docs/Journal/0001-hexagonal-split-core-and-adapters.md)). `tools/check_clean_architecture.js` enforces it: files under `bin/` stay <= 150 lines, and `src/core/` never imports `@clack/prompts`, `picocolors`, `bin/`, `src/cli/`, or `src/mcp/`.

```
bin/cli.js                 5-line entrypoint -> src/cli/main.js
src/
├── core/                  Domain / use cases (no UI, no process.exit; throws BrainError)
│   ├── scaffold.js        initBrain, setupIdeAdapters (backs up regular files), restoreRootSkills
│   ├── areas.js           PRESET_AREAS, area id rule ^[a-z0-9_-]+$, add/list areas, resolveAllowedAreas
│   ├── doctor.js          runDoctor (structured results), repairBrain (non-destructive)
│   ├── upgrade.js         planUpgrade/applyUpgrade (allowlist: replace-with-backup, add-if-missing, AGENTS.md managed block; ADR 0005, 0006), text-diff.js
│   ├── demo.js            demo assets derived from templates/areas, cleanDemo
│   ├── calls.js           captureCall (strict date, containment, quoted frontmatter, no overwrite)
│   ├── objections.js      captureObjection (schema-validated)
│   ├── query.js           queryBrain (allowed areas + playbooks)
│   ├── sales-view.js      buildSalesView/writeSalesView (plain-language HTML page of the sales system)
│   ├── manifest.js        IDE adapters + commands/skills derived from templates/base
│   ├── schema-validator.js  ajv Draft 2020-12 (ADR 0002)
│   └── errors.js, fs-utils.js, package-paths.js
├── cli/                   Adapter: argv parsing, @clack/prompts, picocolors, exit codes
│   ├── main.js, args.js, help.js, prompt.js, render.js
│   └── commands/          init, add-area, list-areas, doctor, clean-demo, upgrade, view, mcp
└── mcp/                   Adapter: JSON-RPC 2.0 stdio server + thin tool handlers
    ├── server.js, tools.js, prompts.js
```

| Directory / File | Layer | Responsibility |
| :--- | :--- | :--- |
| `src/core/` | Domain / Use Cases | Pure functions taking explicit inputs (`rootDir`, options) and returning data. Errors are `BrainError` with a stable `code`. |
| `src/cli/` | Adapter (CLI) | Prompts and rendering; maps `BrainError` to a red message and exit code 1. `doctor` exits 1 when errors remain (after `--fix`, if applied); without a TTY and without `--fix` it never prompts and only prints a `--fix` hint. `upgrade [dir] [--yes] [--dry-run]` previews a plan (adds, diffs, skips); it writes only with `--yes` or an interactive confirmation; a pending plan without a TTY and without `--yes` exits 1, as does `NOT_A_BRAIN`. `view [dir] [--open]` writes `sales/sales-system.html` and prints its path; `--open` launches the default browser (`open`, `start`, `xdg-open`) and falls back to a hint on failure. `NOT_A_BRAIN` and `NO_SALES_SYSTEM` exit 1. |
| `src/mcp/` | Adapter (MCP) | Validates MCP arguments via core and maps `BrainError` to `isError` tool results. |
| `schemas/` | Core Contracts | JSON Schema definitions (Draft 2020-12) defining valid data shapes for all structured records. |
| `templates/` | Scaffolding Source | Templates copied during `init` and `add-area`; also the source of truth for expected slash commands, skills, and demo assets. |
| `playbooks/` | Governance Documentation | Markdown playbooks (00 through 06) defining lifecycle rhythms and operational procedures. |
| `tools/` | Safeguards & Static Guards | Pre-commit and CI guards (`audit.js` plus `check_*.js` and `scan_secrets.js`), CommonJS with Node.js built-ins only ([ADR 0003](./docs/Journal/0003-project-specific-clc-kernel-guards.md)). |
| `docs/Journal/` | Decisions | Architecture Decision Records (`NNNN-kebab-title.md`). |
| `tests/` | Verification | Node.js native test runner: end-to-end CLI/MCP suites plus `tests/core/` unit tests. |

---

## 3. Model Context Protocol (MCP) Specification

The Second Brain provides a native MCP server executing over standard I/O (`stdio`).

### Lifecycle & Protocol Methods

1. **`initialize`**:
   - Negotiates the protocol version: supported versions are `2025-06-18`, `2025-03-26`, `2024-11-05` (latest first). A supported client `params.protocolVersion` is echoed back; anything else gets the latest (`2025-06-18`). Also returns server identification (`copilot-brain v1.0.0`), and declared capabilities (`tools: {}`, `prompts: {}`).
2. **`notifications/initialized`**:
   - Acknowledged as a no-op notification.

**JSON-RPC 2.0 rules** (`src/mcp/server.js`):
- A notification is a message without an `id` member; it never gets a response, not even an error. `id: null` is a request and is answered with `id: null`.
- Unparseable JSON returns `-32700 Parse error` (`id: null`). A message that is not an object, lacks `jsonrpc: "2.0"`, or lacks a string `method` returns `-32600 Invalid Request` (its `id` when it is a string, number, or null; otherwise `null`). Unknown methods return `-32601`.
- Batching is not supported (removed in MCP 2025-06-18): an array payload returns a single `-32600` with `id: null`.
- `ping` returns an empty result `{}`.
- stdio lines are processed sequentially, so responses are written in request order.
3. **`prompts/list`**:
   - Returns the 5 actionable slash prompts (`call`, `objection`, `battlecard`, `flow`, `retro`) with their optional argument definitions.
4. **`prompts/get`**:
   - Resolves the requested prompt name (`call`, `objection`, `battlecard`, `flow`, `retro`) and optional arguments into structured MCP `messages` grounded in repository skills and schemas. Returns JSON-RPC error `-32602` for unknown prompt names.
5. **`tools/list`**:
   - Returns the array of available tool definitions with their complete JSON Schema input declarations.
6. **`tools/call`**:
   - Routes tool execution to the appropriate domain handler and returns standardized MCP content blocks:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "result": {
         "content": [{ "type": "text", "text": "..." }]
       }
     }
     ```

### Exposed Tool Contracts

#### `brain_query`
- **Purpose**: Search and retrieve knowledge assets across all active areas.
- **Input Parameters**:
  - `query` (`string`, required): Keyword, topic, competitor, or objection trigger.
  - `area` (`string`, optional): One of the preset areas (`sales`, `marketing`, `product`, `operations`, `hr_people`, `finance_legal`) or a custom area listed in the brain's `org-kernel.json` `activeAreas`. Ids must match `^[a-z0-9_-]+$` and resolve inside the brain root; `tools/list` advertises the resolved enum ([ADR 0004](./docs/Journal/0004-mcp-filesystem-safety.md)).
- **Execution**: Scans markdown and JSON files recursively in the requested area (or every allowed area plus `playbooks/`), extracts the matching context window (matching line +/- 3 lines), and returns formatted Markdown with relative links.

#### `brain_capture_call`
- **Purpose**: Ingest and structure raw sales call transcripts into partitioned memory.
- **Input Parameters**:
  - `rep` (`string`, required): Assigned sales representative (e.g. Carlos, Juanita).
  - `prospect` (`string`, required): Target company name.
  - `date` (`string`, required): ISO format `YYYY-MM-DD`.
  - `summary` (`string`, required): 3-5 bullet executive summary.
  - `stage` (`string`, required): Pipeline stage (`Discovery`, `Validation`, `Proposal`, `Negotiation`, `Closed Won`, `Closed Lost`).
  - `outcome` (`string`, required): Immediate outcome or next scheduled milestone.
  - `notes` (`string`, optional): Raw transcript notes or coaching points.
  - `objections` (`array<string>`, optional): List of buyer objections raised.
  - `actionItems` (`array<string>`, optional): Tasks and assignees.
- **Execution**: Rejects any `date` that is not a real calendar date in strict `YYYY-MM-DD` form, derives the partition `sales/calls/YYYY-MM/`, and asserts the resolved path stays inside `sales/calls/`. Writes `YYYY-MM-DD_<rep-slug>_<prospect-slug>.md` (rep/prospect slugified to `[a-z0-9-]`). Frontmatter values are emitted as double-quoted (JSON-escaped) YAML scalars so newlines or colons cannot inject keys. An existing log is never overwritten: a numeric suffix (`-2`, `-3`, ...) is appended instead. There is no call JSON Schema; validation is limited to the checks above.

#### `brain_capture_objection`
- **Purpose**: Create or update objection-handling matrices validated against schema contracts.
- **Input Parameters**:
  - `id` (`string`, required): Alphanumeric kebab-case string (`^[a-z0-9-]+$`).
  - `title` (`string`, required): Descriptive title (min 3 chars).
  - `category` (`string`, required): `pricing` | `timing` | `authority` | `competitor` | `trust` | `technical_fit`.
  - `severity` (`string`, required): `low` | `medium` | `high` | `blocker`.
  - `rootCause` (`string`, required): Underlying fear (min 10 chars).
  - `pivotScript` (`string`, required): Immediate verbatim script (min 15 chars).
  - `counterArguments` (`array<string>`, required): Non-empty talking points.
  - `triggerPhrases` (`array<string>`, optional): Prospect trigger quotes.
  - `suggestedNextStep` (`string`, optional): Bridge action to advance deal.
- **Validation**: `id` is checked against `^[a-z0-9-]+$` first (it becomes a filename). Defaults are applied (`triggerPhrases` falls back to `[title]`, `suggestedNextStep` to a generic follow-up), then the full object is validated against `schemas/sales-objection.schema.json` via `src/core/schema-validator.js`. On success, writes dual assets:
  - `sales/objections/{id}.json` (machine-readable schema object)
  - `sales/objections/{id}.md` (human-readable battle track)

#### `brain_doctor`
- **Purpose**: Runs the same audit as `clc-brain doctor` (`src/core/doctor.js`): kernel schema, `AGENTS.md`, IDE adapters, slash commands, skills, active areas on disk, and schema validation of battlecards, objections, and SOPs. Read-only; use `clc-brain doctor --fix` for repairs.
- **Input Parameters**: none.

---

## 4. Multi-IDE Symlink Mirror Architecture

To prevent rule drift across disparate AI coding assistants, `copilot-brain` implements a **Single Source of Truth (SSOT)** symlink mirroring topology:

```
                      ┌──────────────────────┐
                      │      AGENTS.md       │
                      │  (Master Directive)  │
                      └──────────┬───────────┘
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
    .cursorrules             CLAUDE.md            .windsurfrules
(Cursor relative link) (Claude Code link)     (Windsurf link)
```

- `AGENTS.md` is the canonical master file containing system identity, lookup protocols, and tool declarations.
- `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `.windsurfrules` are relative symbolic links (`-> AGENTS.md`).
- On systems with restricted symlink privileges (e.g. non-developer Windows mode), `src/core/scaffold.js` falls back to lightweight redirect stubs.
- An existing regular adapter file is never deleted: `init` moves it to `<name>.bak` (or leaves it untouched if that backup exists) and reports it; `doctor --fix` leaves regular files alone.
- `tools/check_symlinks.js` validates that all mirrors resolve to existing files without dangling targets.

### Managed assistant-rules block (ADR 0006)

`AGENTS.md` section 0 (plain-language rules and the "what people ask -> what you do" table) sits between two markers:

```
<!-- copilot-brain:managed:start -->
...
<!-- copilot-brain:managed:end -->
```

| Case in the brain | What `clc-brain upgrade` does |
| :--- | :--- |
| Markers present, block differs | Replaces only the text between the markers |
| No markers | Inserts the block before the first `## ` heading, or appends it |
| Block already current | Nothing (not in the plan) |
| `AGENTS.md` is a symlink or not a file, has init placeholders, has unpaired or reversed markers, or `AGENTS.md.bak` exists | Skips and reports the reason |
| No `AGENTS.md` | Nothing (`doctor` reports it) |

The real `AGENTS.md` is rewritten in place with a `.bak` copy, so the adapter symlinks keep pointing at it. Text outside the markers is never touched: edit there, not inside the block. Keep the block free of init placeholders and identical in the root and template `AGENTS.md` (`tests/agents-intents.test.js`).

---

## 5. Sales Intelligence & Partitioned Memory

The `sales/` domain implements an enterprise revenue enablement engine:

### 1. Partitioned Historical Call Storage
- Calls are stored in monthly partitions: `sales/calls/YYYY-MM/YYYY-MM-DD_rep_prospect.md`.
- Structured YAML Frontmatter allows deterministic parsing by automated retro prompts:
  ```yaml
  ---
  rep: Carlos
  prospect: Acme Corp
  date: 2026-10-15
  stage: Discovery
  outcome: Next step scheduled
  created_at: 2026-10-15T18:00:00.000Z
  ---
  ```

### 2. Qualification & Pipeline Gate Enforcement
- `sales/qualification/qualification-matrix.md`: Implements a MEDDPICC framework with 6 immediate disqualification triggers.
- `sales/stages/pipeline-stages.md`: Canonical definition of 5 pipeline stages (Discovery, Validation, Proposal, Negotiation, Closed Won/Lost) with mandatory exit criteria before stage progression.

### 3. Sales System: Map and Plays
- `sales/system.md`: the map from pipeline stage to exit gate to the plays that apply.
- `sales/plays/<play>.md`: one play per kind of conversation (`cold-call`, `discovery-call`, `demo-call`, `follow-up`). Flat frontmatter (`play`, `stages`, `goal`, `gate_unlocked`, `version`, `status`) is parsed by regex, with no YAML dependency. `stages` is a comma list, so a play can span stages (`stages: 2, 3, 4`). The body holds a Mermaid decision tree, a talk track per branch linking `sales/scripts/`, and a Learnings Log.
- `/flow` routes conversation trees to `sales/plays/` and macro pipeline changes to `sales/stages/pipeline-stages.md`.

### Sales System Page (`clc-brain view`)
- `sales/sales-system.html` is a generated, self-contained page for non-technical readers: the plain-language part of `sales/system.md`, the pipeline diagram from `sales/stages/pipeline-stages.md`, and one card per play (title, pipeline steps it is used in, goal, version, decision tree, collapsible talk tracks "What to say", and "What we've learned").
- Built by `src/core/sales-view.js`. Every file-sourced text is HTML-escaped before a tiny markdown subset (headings, paragraphs, lists, bold) is applied; frontmatter keys, file paths and the AI-only section never reach the page.
- Diagrams render client-side with Mermaid pinned to `11.4.1` from jsDelivr (`securityLevel: 'strict'`, light/dark theme from `prefers-color-scheme`). Offline, a note says diagrams need an internet connection and the escaped diagram text stays readable.
- `init` generates it when sales is installed (a failure never breaks init); the assistant refreshes it with `clc-brain view` after any approved pipeline or call-guide change (`/flow`, `/retro`, AGENTS.md rules).
- The page is a generated artifact: `upgrade` does not manage it, `clean-demo` never removes it, and `doctor` and `brain_query` only read `.md`/`.json`.

### 4. Declarative Ecosystem Tools Manifest
Declared inside `org-kernel.json` under `ecosystemTools`:
```json
"ecosystemTools": {
  "salesFlowDiagrams": {
    "tool": "Archify",
    "repository": "https://github.com/tt-a1i/archify",
    "purpose": "Interactive workflow and lifecycle diagramming for sales journey maps"
  }
}
```
Archify is optional tooling and adds no npm runtime dependencies. Conversation decision trees do not live in the pipeline file: they are Mermaid diagrams inside plays (see below).

---

## 6. Verification, Testing & Static Safeguards

### Test Suite (`tests/`)
Executed via Node.js native test runner (`node --test tests/**/*.test.js`):
1. **`tests/cli.test.js`**: CLI lifecycle, interactive `init`, `add-area`, `doctor` repair (`--fix`), and `list-areas`.
2. **`tests/schemas.test.js`**: Positive schema validation for all repository files and negative assertions verifying rejection of malformed payloads.
3. **`tests/areas-integrity.test.js`**: Structural completeness of all 6 operational areas and marketing AI-decoupling verification.
4. **`tests/sales-intelligence.test.js`**: Call logging, win/loss post-mortems, qualification matrices, and Archify tool declarations.
5. **`tests/ide-adapters.test.js`**: SSOT mirror integrity, slash commands, and agent skills.
6. **`tests/mcp-server.test.js`**: JSON-RPC 2.0 handshake, tool registry, query retrieval, call log file writing, and objection validation.
7. **`tests/mcp-security.test.js`**: Path-traversal and invalid dates, area allow-list, YAML frontmatter injection, no-overwrite of call logs, schema-backed objection validation.
8. **`tests/schema-validator.test.js`**: Shared ajv validator contract (formats, unknown schemas, cwd independence).
9. **`tests/package.test.js`**: `npm pack --dry-run` contains every runtime module reachable from `bin/`; Node.js engine requirement.
10. **`tests/guards.test.js`** and **`tests/agents-paths.test.js`**: Governance guards (including crash handling in `audit.js`) and existence of every path referenced in root `AGENTS.md`.
11. **`tests/core/*.test.js`**: Unit tests for core use cases (scaffold, areas, doctor, calls, demo, query) without subprocesses.
12. **`tests/regressions.test.js`**: Regressions fixed during the hexagonal split (custom area id validation, custom areas over MCP, package `files`, `clean-demo` safety, adapter backups) and the `doctor` exit code (1 on errors, also after `--fix`; warnings alone exit 0).
13. **`tests/mcp-jsonrpc.test.js`**: JSON-RPC 2.0 compliance (notifications vs `id: null`, `-32600`/`-32601`/`-32700`, batch rejection, in-order responses) and protocol version negotiation.

CLI tests scaffold into a temporary directory under `os.tmpdir()`; no test writes into the repository. Requires Node.js >= 22.

### Audit Gate (`tools/audit.js`)
Discovers and runs every `tools/check_*.js` and `tools/scan_secrets.js` guard, grouped by lens. It does not run the test suite; run `npm test` separately.
- **Security**: `tools/scan_secrets.js` intercepts accidental API keys or credentials.
- **Architecture**: `check_symlinks.js`, `check_hitl.js` (Human-in-the-Loop checkpoints in agent skills), `check_clean_architecture.js`, `check_package_files.js`, `check_schema_usage.js`, and `check_template_sync.js`.
- A guard that throws is reported as **CRASHED** and fails the audit (exit code 1); it is never silently skipped.
- Writes a markdown report and a machine-readable `audit-receipt.json` into the active `sdds/` change directory.
