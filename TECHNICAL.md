# Technical Architecture & Engineering Guide

> **Single Source of Truth for Engineers, DevOps, and System Integrators**  
> For the non-technical overview and setup guide, see [README.md](./README.md) or [README.es.md](./README.es.md).

---

## 1. Architectural Overview

`@clc/copilot-brain` is a modular, schema-enforced knowledge engine and runtime that turns a Git repository into an active Single Source of Truth (SSOT) for human operators and autonomous AI agents.

### Access paths

| Path | Who uses it | How it works |
| :--- | :--- | :--- |
| Folder access (primary) | Claude Code, the Claude desktop Code tab, Codex, Google Antigravity, Cursor, Windsurf, Gemini CLI | The tool opens the brain folder and reads `AGENTS.md` (directly or through the adapter symlinks). People ask in plain language; the managed "What people ask" table routes each request to a skill (read as instructions) or a `clc-brain` command. |
| Slash commands (optional) | Claude Code, Codex, Google Antigravity, Cursor, OpenCode, Windsurf, Gemini CLI, GitHub Copilot | One source per command: `.agents/skills/<name>/SKILL.md` (Agent Skills format). `src/core/harness-adapters.js` generates `.claude/skills/<name>/SKILL.md`, `.gemini/commands/<name>.toml` and `.windsurf/workflows/<name>.md`; the other tools read `.agents/skills/` directly. Nothing requires them. |
| Copy-paste guides | ChatGPT custom GPTs, Gemini Gems, Claude Projects | `skills/integrations/*.md`; no file access, so no sales page or computed metrics. |
| MCP over stdio (optional) | Chat apps without folder access that support MCP | `clc-brain mcp [dir]`, described below. It exposes query, capture and doctor tools; the sales page and metrics are CLI-only. |

The package is not published on npm yet: install from source (`git clone`, `npm install`, `npm link`) and verify the global link with `readlink -f "$(command -v clc-brain)"`. Requires Node.js >= 22.

### MCP Path Architecture

```
                                 ┌─────────────────────────┐
                                 │  MCP chat apps (opt.)   │
                                 │  e.g. Claude Desktop    │
                                 │  chat, other MCP hosts  │
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
│   ├── upgrade.js         planUpgrade/applyUpgrade (allowlist: replace-with-backup, add-if-missing, AGENTS.md managed block; ADR 0005, 0006)
│   ├── demo.js            demo assets derived from templates/areas, cleanDemo
│   ├── calls.js           captureCall (strict date, containment, quoted frontmatter, no overwrite), CALL_FIELDS, readCallLog
│   ├── objections.js      captureObjection (schema-validated)
│   ├── query.js           queryBrain (allowed areas + playbooks)
│   ├── plays.js           play frontmatter parse/validate (PLAY_KEYS), parseMotions, readPlayMeta, PLAY_TITLE_PREFIX
│   ├── sales-stages.js    plain sections of system.md (SECTION_HEADINGS in en/es), stage number -> name
│   ├── sales-normalize.js slugs, company/deal keys, outcomes (English and Spanish), branches, booleans, DEFAULT_MOTIONS, motionName(slug, lang)
│   ├── sales-scripts.js   parseScript: script markdown grammar -> conversations/steps/answers/cards + diagnostics (ADR 0008)
│   ├── sales-glossary.js  parseGlossary, lookupTerm (glossary tables)
│   ├── script-view.js     renderScriptPage + SCRIPT_CSS (one offline HTML page per script, generator meta)
│   ├── sales-library.js   loadLibrary, writeScriptPages (only I/O of the feature), checkSalesLibrary (doctor)
│   ├── sales-sections.js  Scripts and Glossary sections of the sales page, script draft merge
│   ├── sales-view.js      buildSalesView/writeSalesView/writeSalesPreview (plain-language HTML page of the sales system)
│   ├── flowchart.js       offline renderer: Mermaid flowchart subset -> layered layout -> inline SVG (no deps, no network)
│   ├── html-escape.js     single HTML escaper for generated pages
│   ├── sales-records.js   tolerant reader of call logs, win-loss notes and guides under sales/ (ADR 0007)
│   ├── sales-metrics.js   pure metrics: month windows, sample-size rules, type-of-sale resolution
│   ├── legacy-assets.js   sha256 lists of removed legacy files (commands, flat skills, LEGACY_STARTER_SCRIPT_HASHES)
│   ├── sales-dashboard.js "How it's going" section of the sales page
│   ├── sales-report-text.js  plain-text `stats` report
│   ├── i18n.js            t(lang, key, vars) with en/es dictionaries (English fallback), formatMonth, formatPercent (Intl)
│   ├── brain-language.js  getBrainLanguage (org-kernel.json `language`, default "en"), parseLanguage, detectLanguage (LC_ALL/LANG)
│   ├── setup-state.js     getSetupState (org-kernel.json `setup`: pending/done/unknown), getBrainSummary (start screen data)
│   ├── manifest.js        IDE adapters + skills derived from templates/base
│   ├── harness-adapters.js  slash-command shortcuts generated from .agents/skills/
│   ├── schema-validator.js  ajv Draft 2020-12 (ADR 0002)
│   ├── text-diff.js       dependency-free line diff for upgrade previews
│   └── errors.js, fs-utils.js, package-paths.js
├── cli/                   Adapter: argv parsing, @clack/prompts, picocolors, exit codes
│   ├── main.js, args.js, help.js, prompt.js, render.js
│   └── commands/          init, add-area, list-areas, doctor, clean-demo, upgrade, view, stats, mcp
└── mcp/                   Adapter: JSON-RPC 2.0 stdio server + thin tool handlers
    ├── server.js, tools.js, prompts.js
```

| Directory / File | Layer | Responsibility |
| :--- | :--- | :--- |
| `src/core/` | Domain / Use Cases | Pure functions taking explicit inputs (`rootDir`, options) and returning data. Errors are `BrainError` with a stable `code`. |
| `src/cli/` | Adapter (CLI) | Prompts and rendering; maps `BrainError` to a red message and exit code 1. `doctor` exits 1 when errors remain (after `--fix`, if applied); without a TTY and without `--fix` it never prompts and only prints a `--fix` hint. `upgrade [dir] [--yes] [--dry-run]` previews a plan (adds, diffs, skips); it writes only with `--yes` or an interactive confirmation; a pending plan without a TTY and without `--yes` exits 1, as does `NOT_A_BRAIN`. `view [dir] [--open]` writes `sales/sales-system.html` and prints its path; `--open` launches the default browser (`open`, `start`, `xdg-open`) and falls back to a hint on failure. `view [dir] --draft <file> [--draft <file>...]` builds a preview instead: it writes to a new OS temp folder (never inside the brain, never over `sales/sales-system.html`), prints the path, and exits 1 (with a plain warning naming the draft) when a draft diagram can't be drawn; `--open` opens it only when every draft draws. `NOT_A_BRAIN` and `NO_SALES_SYSTEM` exit 1. |
| `src/mcp/` | Adapter (MCP) | Validates MCP arguments via core and maps `BrainError` to `isError` tool results. |
| `schemas/` | Core Contracts | JSON Schema definitions (Draft 2020-12) defining valid data shapes for all structured records. |
| `templates/` | Scaffolding Source | Templates copied during `init` and `add-area` (`templates/locales/<lang>/` holds translated starter content); also the source of truth for expected slash commands, skills, and demo assets. |
| `playbooks/` | Governance Documentation | Markdown playbooks (00 through 06) defining lifecycle rhythms and operational procedures. |
| `tools/` | Safeguards & Static Guards | Pre-commit and CI guards (`audit.js` plus `check_*.js` and `scan_secrets.js`), CommonJS with Node.js built-ins only ([ADR 0003](./docs/Journal/0003-project-specific-clc-kernel-guards.md)). |
| `docs/Journal/` | Decisions | Architecture Decision Records (`NNNN-kebab-title.md`). |
| `tests/` | Verification | Node.js native test runner: end-to-end CLI/MCP suites plus `tests/core/` unit tests. |

### CLI Commands

`clc-brain` and `copilot-brain` are the same binary (`bin/cli.js`). `[dir]` defaults to the current directory.

| Command | Options |
| :--- | :--- |
| *(none)* or `<dir>` | Start screen (`src/cli/start.js`): outside a brain, how to create one (computer language); inside a brain, its name, language, setup state and the one next step (brain language). Always exits 0. `help`, `-h`, `--help` print the full help. |
| `init [dir]` | `--language <en\|es>`, `--methodology <meddpicc\|sandler>`, `--name`, `--industry`, `--tagline`, `--areas <list>`, `--demo` / `--clean` (default), `-y`/`--yes` |
| `doctor [dir]` | `--fix` |
| `add-area [dir]` | `--preset <id>` or `--custom <id>` (`^[a-z0-9_-]+$`) |
| `list-areas [dir]` | |
| `clean-demo [dir]` | |
| `view [dir]` | `--open`, `--draft <file>` (repeatable) |
| `stats [dir]` | `--month <YYYY-MM>`, `--json` |
| `upgrade [dir]` | `--dry-run`, `-y`/`--yes` |
| `mcp [dir]` | |

`clc-brain --help` is authoritative (`src/cli/help.js`).

### Upgrade Policy (`src/core/upgrade.js`, ADR 0005, 0006)

`upgrade` is an allowlist; anything not listed is never touched (call logs, win-loss notes, objections, the generated sales page, every other area file).

| Policy | Files | Behaviour |
| :--- | :--- | :--- |
| `template-owned` | `.agents/skills/<name>/SKILL.md`, `skills/*.md` from `templates/base` | Replaced when bytes differ, with a `<file>.bak` copy. Skipped (reported) when the target is a symlink or not a file, when a `.bak` already exists, or when the template still has init placeholders. |
| `add-if-missing` | New base skills; `sales/system.md` and `sales/plays/*.md` when `sales` is active | Added only when absent, never overwritten. Sales files come from `templates/locales/<brain language>/` when that file exists, else from English. |
| `managed-block` | `AGENTS.md` | Only the text between the managed markers is refreshed (see section 4). |

After the plan is applied, `generateHarnessAdapters` (also run by `init` and `doctor --fix`) regenerates the slash-command shortcuts. It is idempotent and only overwrites or deletes files it can prove it owns: shortcuts carrying the `generated from .agents/skills/<name>/SKILL.md — do not edit` marker, old `.claude/commands/*.md` and flat `.agents/skills/<name>.md` files whose SHA-256 matches a version this package shipped (`src/core/legacy-assets.js`). Anything else is kept and reported. A flat skill a person added is moved to `<name>/SKILL.md`.

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
  - `play` (`string`, optional): Call guide id used on the call (e.g. `cold-call`).
  - `branch` (`string`, optional): Decision-tree branch reached (e.g. `B2`).
  - `gateAdvanced` (`boolean`, optional): Whether the call moved the deal through its pipeline gate.
  - `notes` (`string`, optional): Raw transcript notes or coaching points.
  - `objections` (`array<string>`, optional): List of buyer objections raised.
  - `actionItems` (`array<string>`, optional): Tasks and assignees.
  - `rawTranscript` (`string`, optional): Full transcript to archive.
- **Execution**: Inputs are written with canonical frontmatter keys (`CALL_FIELDS` in `src/core/calls.js`: `prospect` -> `prospect_company`, `stage` -> `deal_stage`, `gateAdvanced` -> `gate_advanced`). The MCP tool does not take `motion`, `lead_source`, `deal_id` or `goal_met`; the call analyzer flow writes those (see section 5).
- **Validation**: Rejects any `date` that is not a real calendar date in strict `YYYY-MM-DD` form, derives the partition `sales/calls/YYYY-MM/`, and asserts the resolved path stays inside `sales/calls/`. Writes `YYYY-MM-DD_<rep-slug>_<prospect-slug>.md` (rep/prospect slugified to `[a-z0-9-]`). Frontmatter values are emitted as double-quoted (JSON-escaped) YAML scalars so newlines or colons cannot inject keys. An existing log is never overwritten: a numeric suffix (`-2`, `-3`, ...) is appended instead. There is no call JSON Schema; validation is limited to the checks above.

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

### Partitioned Historical Call Storage
- Calls are stored in monthly partitions: `sales/calls/YYYY-MM/YYYY-MM-DD_rep_prospect.md`.
- Flat frontmatter, parsed without a YAML dependency. Canonical keys (the call analyzer, `skills/skill_call_analyzer.md`, writes the full set; `brain_capture_call` writes the subset it receives plus `created_at`):
  ```yaml
  ---
  call_id: "CALL-2026-10-15-01"
  date: "2026-10-15"
  rep: "Carlos"
  prospect_company: "Acme Corp"
  contact_name: "Dana Diaz"
  contact_role: "VP Sales"
  deal_stage: "Discovery"
  call_type: "Discovery"
  outcome: "Next step scheduled"
  motion: "inbound"            # type of sale (slug)
  lead_source: "webinar"       # slug
  deal_id: "acme-2026"         # slug, joins calls and win-loss notes
  play: "discovery-call"       # call guide id
  branch: "B2"                 # decision-tree branch reached
  goal_met: true               # checked against the guide's `success:`
  gate_advanced: false
  ---
  ```
- Legacy logs with `prospect` / `stage` keys still load (`readCallLog`), and every sales-metrics field is optional for the reader.

### Qualification & Pipeline Gate Enforcement
- `sales/qualification/qualification-matrix.md`: Implements a MEDDPICC framework with 6 immediate disqualification triggers.
- `sales/stages/pipeline-stages.md`: Canonical definition of 5 pipeline stages (Discovery, Validation, Proposal, Negotiation, Closed Won/Lost) with mandatory exit criteria before stage progression.

### Sales System: Map and Plays
- `sales/system.md`: the map from pipeline stage to exit gate to the plays that apply.
- `sales/plays/<play>.md`: one play (call guide) per kind of conversation (`cold-call`, `discovery-call`, `demo-call`, `follow-up`). Flat frontmatter is parsed by regex, with no YAML dependency (`src/core/plays.js`). Required keys (`PLAY_KEYS`): `play`, `stages`, `goal`, `gate_unlocked`, `version`, `status`. Optional: `motions` (types of sale) and `success` (what success means for this call, in plain words). `stages` is a comma list, so a play can span stages (`stages: 2, 3, 4`). The body holds a Mermaid decision tree, a talk track per branch linking `sales/scripts/`, and a Learnings Log.
- The flow procedure (`.agents/skills/flow/SKILL.md`, triggered by a plain request or `/flow` in any tool) routes conversation trees to `sales/plays/` and macro pipeline changes to `sales/stages/pipeline-stages.md`.

### Sales System Page (`clc-brain view`)
- `sales/sales-system.html` is a generated, self-contained page for non-technical readers: the plain-language part of `sales/system.md`, the pipeline diagram from `sales/stages/pipeline-stages.md`, and one card per play (title, pipeline steps it is used in, goal, version, decision tree, collapsible talk tracks "What to say", and "What we've learned").
- Built by `src/core/sales-view.js`. Every file-sourced text is HTML-escaped before a tiny markdown subset (headings, paragraphs, lists, bold) is applied; frontmatter keys, file paths and the AI-only section never reach the page.
- Fully offline: the page has no scripts and makes no network requests. Diagrams are drawn at build time as inline SVG by `src/core/flowchart.js`, a dependency-free renderer (parse, layered layout, SVG). Labels are escaped; colours come from CSS variables, so light/dark follows `prefers-color-scheme`. The pipeline keeps its natural width and scrolls sideways; decision trees shrink to the card but not below a readable size.
- Supported Mermaid subset: `flowchart`/`graph` with `TD`, `TB`, `LR`, `RL`, `BT`; nodes `id`, `id[text]`, `id(text)`, `id([text])`, `id{text}`, `id((text))`, quoted labels `id["text"]`, `<br>` line breaks; edges `-->`, `---`, `-.->`, `==>`, labels `-->|text|` and `-- text -->`, chains `A --> B --> C` and `A --> B & C`. `classDef`, `class`, `style`, `linkStyle`, `click`, `%%` comments and `%%{init}%%` directives are ignored, and `subgraph`/`end` contents are drawn flat. A diagram outside this subset is shown as a plain list of its steps ("If <label> → <step>"), never as raw Mermaid code.
- Archify (`org-kernel.json` -> `ecosystemTools.salesFlowDiagrams`) remains an optional, AI-driven tool for richer journey maps; the page does not depend on it.
- `init` generates it when sales is installed (a failure never breaks init); the assistant refreshes it with `clc-brain view` after any approved pipeline or call-guide change (`/flow`, `/retro`, AGENTS.md rules).
- Drafts (`buildSalesView(root, { drafts })`, `writeSalesPreview`): a draft with `play:` frontmatter is a call guide (it replaces the saved guide with the same `play` id, or is added); otherwise a draft holding a flowchart (fenced or bare) replaces the pipeline diagram. Draft cards carry a "Draft — not saved yet" badge and the title says "Preview". The result reports each diagram's and each draft's parse status (`diagrams`, `drafts`).
- Import loop (`/flow`, `flow` MCP prompt, AGENTS.md intent): the assistant accepts photos, PDFs, HTML exports (Archify, Miro, Lucidchart), Mermaid or a description, explains back what it understood, asks about gaps one at a time, drafts with the supported subset, previews with `view --draft`, and saves only after a yes.
- `doctor` warns (never errors) when a call guide or the pipeline has no Mermaid diagram or one `src/core/flowchart.js` can't draw, in plain words ("The cold call guide's diagram can't be drawn; ask your assistant to fix it").
- The page is a generated artifact: `upgrade` does not manage it, `clean-demo` never removes it, and `doctor` and `brain_query` only read `.md`/`.json`.

### Sales Scripts and Glossary (ADR 0008)
- The package ships the method, not content: the `script` skill (`/script`), AGENTS intents, an empty "Scripts, glossary and industry packs" section in `sales/system.md`, and `sales/scripts/README.md`. No script, glossary or industry pack is shipped.
- Script source: `sales/scripts/<slug>.md` (slug = file stem, `^[a-z0-9]+(-[a-z0-9]+)*$`). Files without a `script:` key are ignored. `clc-brain view` writes `<slug>.html` beside it.
- Grammar contract (`src/core/sales-scripts.js`, never throws; problems are `{level, line, message}` diagnostics):
  - Frontmatter: `script` (= stem), `title`, `industry?`, `version` (integer), `status` (`draft` or `active`). Text before the first `##` is the intro.
  - Heading levels: `## ` conversation (`play:`, `goal:`, `note:`, and `- ` rules before the first step), `### ` step (`branch:`, `tag:`, `say:`, `detail:`, `tip:`, `tone:`, `next:`), `#### ` answer (its title is the pill; same keys plus `when:`).
  - Cards: a new card starts when `say:` or `tag:` repeats in the same step or answer; `detail:` is repeatable (secondary paragraph). Tones: `start`, `plain`, `action`, `yes`, `no`, `follow`.
  - `next:` is a step title, a conversation title (case-insensitive) or `end`.
  - Anchors (stable, English): conversation = ascii-folded slug of its title; step = `<play>-<branch lowercase>` when both are set, else `<conversation-slug>-step-N`; duplicates get `-2` plus a warning.
  - Errors: no frontmatter, missing title, bad `status`/`version`, no conversation, a conversation without steps, a card without `say`, an unknown tone. Warnings: unknown line, unresolved `next:`, duplicate anchor, `script:` not matching the file stem.
- Layout rules (`script-view.js`): no answers = one column; any answer with more than one card, or 4 or more answers = lanes (2, 3 or 4 columns); otherwise 1 answer = column, 2 = pair, 3 = a row of three. Pills take their class from the tone. Pages are fully offline (no `<script>`, no `http`, no `url()` except `#` references), escape all text first, and follow light/dark through `prefers-color-scheme`.
- Generator marker: pages carry `<meta name="generator" content="clc-brain">`. `writeScriptPages` never overwrites a page without it, skips symlinks, paths outside the brain and scripts with errors, and reports each skip.
- Links: a play row's Guion cell holds `../scripts/<slug>.html#<anchor>`. Only `[text](./scripts/<slug>.html[#anchor])` and the glossary (`./glossary.md` or `./glosario-<slug>.md`) become links on the sales page (the latter as `#glossary`); every other URL stays plain text.
- Industry packs: the first table under a `## Industry packs` / `### Paquetes por industria` heading anywhere in `sales/system.md` (also below the `---` cut) renders as its own section of the sales page (`parseIndustryPacks` in `src/core/sales-sections.js`). Its cells go through the same link allowlist, which on the sales page also accepts `./icps/<slug>.md`; anything else stays plain text.
- Per-industry rows: a play row `| B1 · Retail | ... |` is branch B1 with `industry: "Retail"` (`readPlayMeta`); an empty trigger keeps the generic B1 trigger. A call log `branch` like `B1 · Retail`, `B1·Retail` or `b1 - retail` counts as branch `B1` (`parseBranch` in `src/core/sales-normalize.js`), and its suffix is the call's industry unless the log has its own optional `industry` field. Stats and the sales page add a "By industry" breakdown (`byIndustry`, empty when no call of the month records an industry).
- Hand-made pages: any `sales/scripts/*.html` without the generator meta (and not the page of a `<slug>.md` script) is listed in the Scripts section of the sales page (`loadScriptPages`), titled from its `<title>` or `<h1>` (escaped) and linked only when its name is a lowercase slug; it is never overwritten. A `.md` in `sales/scripts/` with no frontmatter (other than README.md) is reported by doctor as not recognized as a script.
- Glossary file: `sales/glossary.md`; when it is missing, the first `sales/glosario*.md` by file name (older Spanish brains, e.g. `glosario-sandler.md`) is the glossary (`findGlossaryFile` in `src/core/sales-library.js`). Doctor's "not linked" check looks for a link to that actual file name.
- Glossary format (`sales/glossary.md`, `src/core/sales-glossary.js`): `# Title`, then `## group` sections each with one three-column table (term, meaning, example; read by column position, bold term allowed). It renders as the "Glossary" section of the sales page. `lookupTerm` matches ignoring case and accents.
- `view`: writes every script page, then the sales page with a Scripts section (one card per script) and a Glossary section. `view --draft <file>` accepts a script draft (frontmatter has `script:`): it writes the page and all script pages into the temporary preview folder, never into the brain, and exits 1 when the draft has errors; `--open` opens the first script draft's page.
- `doctor` (`checkSalesLibrary`, warnings only, silent on a fresh brain): script diagnostics; a conversation `play` that is not in `sales/plays/`; a `branch` missing from that play's situations; a script or the glossary not linked from `sales/system.md`; a Guion link to a missing script or anchor; a page that is missing or older than its `.md` (suggests `clc-brain view`); a malformed glossary; and legacy starter scripts. Legacy starters are matched only by sha256 (`LEGACY_STARTER_SCRIPT_HASHES`, every committed version, CRLF-normalized), so an edited copy is never flagged; the assistant removes them only after the person says yes.
- `upgrade` adds the `script` skill and its shortcuts and refreshes the AGENTS managed block; it never touches `sales/scripts/`, `sales/glossary.md`, `system.md` or plays.

### Sales Metrics (`clc-brain stats`, ADR 0007)
- Data model, all optional frontmatter. Call guides: `motions:` (comma list of types of sale, or `all`; missing means all) and `success:` (plain-words success). Call logs: `motion`, `lead_source`, `deal_id` (stored as slugs) and `goal_met` (boolean, checked against the guide's `success:`), next to `play`, `branch`, `gate_advanced` (full example in "Partitioned Historical Call Storage" above). Win-loss notes (`sales/win-loss/post-mortem-template.md`): `result`, `date`, `motion`, `lead_source`, `deal_id`, `rep`, and `company`/`prospect_company`, with the file name and the older table as fallbacks. Default types of sale (`DEFAULT_MOTIONS`): `cold-outbound`, `inbound`, `referral`, `expansion`; custom slugs are allowed.
- `readSalesRecords` (src/core/sales-records.js) reads `sales/` only, skips symlinks and sample records, and lists unreadable files in `skipped`. `buildSalesReport` (src/core/sales-metrics.js) is pure: it returns `windows` (current month so far and last complete month), `comparison`, `journeys`, `unclassified` and `excluded`. `loadSalesReport` joins the two.
- Rules: under 5 calls shows counts only, 5 to 9 is "too early to tell", and the comparison needs 10 or more calls in both months. Type of sale resolves from the record, then its deal, then its guide's only type, else "Not classified yet". Stall points are every `goal_met: false` call, grouped by branch trigger text. `gate_advanced` is a separate metric.
- `clc-brain stats [dir] [--month YYYY-MM] [--json]` prints plain text (`sales-report-text.js`) or the report as JSON. A bad month is a validation error; `NOT_A_BRAIN` and a missing sales area exit 1.
- The sales page gets a "How it's going" section (`sales-dashboard.js`): both months, per type of sale, per call guide against its own success definition, where calls miss their goal, per person, win rate, and how deals start. Bars are plain `div`s with a width and always come with text; there are no scripts, links, images or URLs. Plain words only: no IDs, field names or paths.
- `doctor` adds warnings only: guides without a success definition, records with a type of sale no guide lists, and unreadable records.
- No MCP tool is added for metrics (decision 11); `brain_capture_call` is unchanged.

### Brain language (i18n)
- `org-kernel.json` has an optional `language` (`"en"` | `"es"`, schema enum). Old brains without it stay valid and are treated as English; an invalid value also falls back to English (`getBrainLanguage` in `src/core/brain-language.js`).
- `init --language <en|es>` writes it through the `{{LANGUAGE}}` placeholder of `templates/base/org-kernel.json`. Without the flag, an interactive run asks "Language for your brain / Idioma de tu cerebro" (default from `LC_ALL`, then `LANG`: `es*` gives Spanish, anything else English); `--yes` or no TTY uses that default. An invalid value exits 1 with a plain message.
- `methodology` (optional, any lowercase slug; `meddpicc` when missing, read by `getMethodology` in `src/core/methodology.js`) picks the sales starter set and the qualification fallback (`qualificationDefaults` in `scorecard.js`). The base `templates/areas/sales/` is the meddpicc set; `templates/methodologies/<method>/areas/<area>/` and `templates/methodologies/<method>/locales/<lang>/areas/<area>/` overlay it, in the order base → base translation → method set → method translation (`areaOverlayDirs` in `areas.js`). `init --methodology <meddpicc|sandler>` writes it through `{{METHODOLOGY}}` (asked in a terminal when sales is installed; `--yes` gives meddpicc). `add-area` and `upgrade` follow the brain's methodology; `upgrade` only adds the matrix `criteria` of that method's set, and never touches the matrix of a method without a set.
- `src/core/i18n.js` is pure: `t(lang, key, vars)` looks up `en`/`es` dictionaries (plural forms via `Intl.PluralRules`, `{name}` placeholders, English fallback for missing keys), `formatMonth` (`Intl.DateTimeFormat`, first letter capitalised: "Octubre de 2026") and `formatPercent`.
- Every chrome string of the sales page (`sales-view.js`, `sales-dashboard.js`), metric labels (`sales-metrics.js`), default type-of-sale names (`motionName(slug, lang)`) and the `stats` text (`sales-report-text.js`) goes through `t`. `<html lang>` follows the brain language. Content from the brain's own files (the plain section of `system.md`, guide titles, goals, talk tracks, stage names) is shown as written.
- `buildSalesReport(records, { lang })` returns `language`; `loadSalesReport` reads it from the brain. `stats --json` keeps English keys (machine data) and includes `language`.
- Locale overlay: translated starter content lives in `templates/locales/<lang>/areas/<area>/` with the same file names as `templates/areas/<area>/` (today `es` for `sales/system.md`, `sales/stages/pipeline-stages.md` and `sales/plays/*.md`). `copyAreaTemplates` (`src/core/areas.js`) copies the English area, then the overlay for the brain language on top, with the same placeholder replacer and demo filter; `init` and `add-area --preset` use it. `upgrade` adds missing `sales/system.md` and plays from the overlay when it has the file, else from English, and never overwrites existing files. Translations keep everything code or logs rely on: frontmatter keys, `play`, `stages`, `motions`, `version`, `status`, branch IDs and script links; `tests/locale-parity.test.js` enforces it. The parsers read both heading sets (`SECTION_HEADINGS` in `sales-stages.js`: "Branches"/"Situaciones", "Learnings Log"/"Registro de aprendizajes", the plain section heading) and both title prefixes (`PLAY_TITLE_PREFIX`: "Play:"/"Guía:").
- The AGENTS.md managed block tells the assistant to talk and write new content in the brain's language, to offer once to translate starter content written in a different language (for example in an older brain; only after a yes), and maps "put my brain in Spanish" to setting `language`. Onboarding asks for the language first when it is not set.
- `init` next steps, the optional MCP block label, the web chatbot line and the welcome line go through `t` (`init.*`, `phrase.*` keys), so they follow the brain language.

### Setup state and first contact
- `org-kernel.json` has an optional `setup` object: `{ "completed": boolean, "completedAt"?: date-time }` (schema: `completed` required inside it, no other keys). `templates/base/org-kernel.json` writes `"setup": { "completed": false }` at `init`; onboarding sets `completed: true` and `completedAt` after the person approves the final summary, then shows a short menu.
- `getSetupState(rootDir)` (`src/core/setup-state.js`): `done` / `pending` from the field; when it is missing or malformed (brains made before it existed), `pending` if the company name is still the init default (`INIT_DEFAULTS.companyName`), else `unknown`; `unknown` also when the kernel cannot be read. `doctor` does not report it.
- Start screen: `clc-brain` with no command (or with only a folder) shows `pending` -> open the folder in the assistant and say "Let's set up my brain"; `done` -> three things to say (sales examples and `clc-brain view --open` when `sales` is active); `unknown` -> the same plus a one-line setup hint.
- The AGENTS.md managed block opens section 0 with a "First contact" rule: read `setup`; if not set up, offer the guided setup on the first message (even "hi"), at most once per conversation; if set up and the message is a greeting or vague, answer with a 3-6 item menu.

### Declarative Ecosystem Tools Manifest
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
Archify is optional tooling and adds no npm runtime dependencies. Conversation decision trees do not live in the pipeline file: they are Mermaid diagrams inside plays (see "Sales System: Map and Plays" above).

---

## 6. Verification, Testing & Static Safeguards

### Test Suite (`tests/`)
Executed via Node.js native test runner (`node --test tests/**/*.test.js`):
1. **`tests/cli.test.js`**: CLI lifecycle, interactive `init`, `add-area`, `doctor` repair (`--fix`), and `list-areas`.
2. **`tests/schemas.test.js`**: Positive schema validation for all repository files and negative assertions verifying rejection of malformed payloads.
3. **`tests/areas-integrity.test.js`**: Structural completeness of all 6 operational areas and marketing AI-decoupling verification.
4. **`tests/sales-intelligence.test.js`**: Call logging, win/loss post-mortems, qualification matrices, and Archify tool declarations.
5. **`tests/ide-adapters.test.js`** and **`tests/harness-adapters.test.js`**: SSOT mirror integrity, skill sources, generated slash-command shortcuts (clean scaffold, idempotence, legacy cleanup on upgrade, path references).
6. **`tests/mcp-server.test.js`**: JSON-RPC 2.0 handshake, tool registry, query retrieval, call log file writing, and objection validation.
7. **`tests/mcp-security.test.js`**: Path-traversal and invalid dates, area allow-list, YAML frontmatter injection, no-overwrite of call logs, schema-backed objection validation.
8. **`tests/schema-validator.test.js`**: Shared ajv validator contract (formats, unknown schemas, cwd independence).
9. **`tests/package.test.js`**: `npm pack --dry-run` contains every runtime module reachable from `bin/`; Node.js engine requirement.
10. **`tests/guards.test.js`** and **`tests/agents-paths.test.js`**: Governance guards (including crash handling in `audit.js`) and existence of every path referenced in root `AGENTS.md`.
11. **`tests/core/*.test.js`**: Unit tests for core use cases (scaffold, areas, doctor, calls, demo, query) without subprocesses.
12. **`tests/regressions.test.js`**: Regressions fixed during the hexagonal split (custom area id validation, custom areas over MCP, package `files`, `clean-demo` safety, adapter backups) and the `doctor` exit code (1 on errors, also after `--fix`; warnings alone exit 0).
13. **`tests/mcp-jsonrpc.test.js`**: JSON-RPC 2.0 compliance (notifications vs `id: null`, `-32600`/`-32601`/`-32700`, batch rejection, in-order responses) and protocol version negotiation.
14. **`tests/agents-intents.test.js`** and **`tests/plain-language.test.js`**: the managed AGENTS.md block (intents in English and Spanish, plain-language rules, slash commands come from one skill source), plain user-facing procedures, and the README claims about languages, the sales page and `stats`.
15. **`tests/init-language.test.js`** and **`tests/locale-parity.test.js`**: `--language`, the locale overlay and parity of translated starter files.
16. **`tests/stats-cli.test.js`**, **`tests/sales-report-text.test.js`** and **`tests/upgrade-cli.test.js`**: the `stats` and `upgrade` commands end to end.
17. **Scripts and glossary** (ADR [0008](./docs/Journal/0008-sales-scripts-and-glossary.md)): `tests/core/sales-scripts.test.js`, `sales-glossary.test.js`, `script-view.test.js`, `sales-library.test.js`, `sales-view-scripts.test.js`, `sales-doctor.test.js`, plus `tests/cli-view-script.test.js`, `script-skill.test.js`, `sales-templates.test.js`, `legacy-assets.test.js`, `upgrade-script.test.js` and `docs-scripts.test.js`.

CLI tests scaffold into a temporary directory under `os.tmpdir()`; no test writes into the repository. Requires Node.js >= 22.

### Audit Gate (`tools/audit.js`)
Discovers and runs every `tools/check_*.js` and `tools/scan_secrets.js` guard, grouped by lens. It does not run the test suite; run `npm test` separately.
- **Security**: `tools/scan_secrets.js` intercepts accidental API keys or credentials.
- **Architecture**: `check_symlinks.js`, `check_hitl.js` (Human-in-the-Loop checkpoints in agent skills), `check_clean_architecture.js`, `check_package_files.js`, `check_schema_usage.js`, and `check_template_sync.js`.
- A guard that throws is reported as **CRASHED** and fails the audit (exit code 1); it is never silently skipped.
- Writes a markdown report and a machine-readable `audit-receipt.json` into the active `sdds/` change directory.
