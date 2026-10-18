# 0007. Computed sales metrics by type of sale

- Status: Accepted
- Date: 2026-10-18

## Context

The brain assumed a single cold-style journey, and the monthly retro counted call results by eye. Teams could not see which type of sale (cold outreach, inbound, referral, existing customers) or which call guide actually works, and an AI counting records by hand gives different numbers each time.

## Decision

- Truth lives in frontmatter, parsed without a YAML dependency. Call guides declare `motions:` (a comma list, or `all`) and `success:` (what a good call means, in plain words). Call logs record `motion`, `lead_source`, `deal_id` and `goal_met`. Win-loss notes may carry `motion`, `lead_source`, `deal_id` and `result`, and fall back to the file name and the older table.
- Success is defined per call guide. `goal_met` is judged against that guide's `success:`; `gate_advanced` stays a separate metric and is never used to infer success. A guide with no `success:` falls back to its goal text, labeled "success not defined yet".
- One report object is computed on demand by pure functions (`src/core/sales-metrics.js`) from tolerantly read records (`src/core/sales-records.js`). Nothing is stored, so nothing can go stale or need a migration. Every surface renders the same report: `clc-brain stats` (text or `--json`), the "How it's going" section of the sales page, and the retro.
- Windows are the current month so far and the last complete month. Under 5 calls shows counts only; 5 to 9 says "too early to tell"; the month-over-month comparison needs 10 or more calls in both months. The thresholds are constants.
- A record's type of sale is its own tag, else the earliest tag of the same deal (`deal_id`, else the normalized company name), else the only type of sale its call guide serves, else "Not classified yet". Sample (demo) records are excluded.
- Stall points count every call that missed its guide's success (`goal_met: false`), grouped by the branch trigger text.
- `doctor` adds warnings only: call guides without a success definition, records whose type of sale no guide lists, and unreadable records. A fresh scaffold stays at zero warnings.
- No MCP work (decision 11). The team works in agentic tools that read `AGENTS.md`, edit files and run `clc-brain stats`, so no `brain_sales_metrics` tool is added and the `brain_capture_call` schema is unchanged.

## Consequences

- Older brains keep working: every field is optional, and records without a tag show as "Not classified yet" until the assistant proposes tags and the user approves them. `upgrade` does not tag existing call guides.
- Numbers are identical on every surface, and tests can pin them with fixed dates.
- Per-person numbers appear on the shared sales page by decision.
- Reading is bounded to `sales/` (symlinks skipped, ADR 0004). Unreadable files are reported, never thrown.
- Rejected: a YAML dependency, letting the LLM count, a stored metrics snapshot, deriving success from `gate_advanced`, and separate journey files.
