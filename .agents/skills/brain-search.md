# Skill: Brain Search & Knowledge Retrieval

## Purpose
Enables an agent to intelligently find the exact single source of truth across all installed organizational areas.

## Trigger Scenarios
- When a user asks: "What is our policy on...", "Where do we document...", "Find our ICP for...", "Who is the owner of..."

## Execution Protocol
1. Identify the relevant domain (`sales`, `marketing`, `product`, `operations`, `hr_people`, `finance_legal`).
2. Search files under the target directory for keywords.
3. If searching cross-cutting concepts (e.g. "pricing"), inspect both `finance_legal/pricing/` and `sales/objections/`.
4. Provide answer with direct relative markdown links: `[File Name](./path/to/file.md)`.
5. If the requested information is absent, flag the missing brain asset and suggest creating it.

## Human-in-the-Loop (HITL) Checkpoint
- Present retrieved findings to the user for review and confirmation before applying any changes or updates to operational assets.

