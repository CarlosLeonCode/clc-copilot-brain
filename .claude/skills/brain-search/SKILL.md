---
name: brain-search
description: "Find the right answer across every area of this brain (sales, marketing, product, operations, people, finance). Use when someone asks \"what is our policy on...\", \"where do we document...\", or \"who owns...\"."
argument-hint: "[topic or question]"
metadata:
  opencode/slash: "true"
---
<!-- generated from .agents/skills/brain-search/SKILL.md — do not edit -->

# Skill: Brain Search & Knowledge Retrieval

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need.

## Purpose
Enables an agent to intelligently find the exact single source of truth across all installed organizational areas.

## Trigger Scenarios
- When a user asks: "What is our policy on...", "Where do we document...", "Find our ICP for...", "Who is the owner of..."

## Execution Protocol
1. Identify the relevant domain (`sales`, `marketing`, `product`, `operations`, `hr_people`, `finance_legal`).
2. Search files under the target directory for keywords.
3. If searching cross-cutting concepts (e.g. "pricing"), inspect both `finance_legal/pricing/` and `sales/objections/`.
4. Answer in plain words and name the source the way a person would ("from your pricing policy"). Add a relative markdown link (`[File Name](./path/to/file.md)`) only if the person asks or works with the files directly.
5. If the requested information is absent, flag the missing brain asset and suggest creating it.

## Human-in-the-Loop (HITL) Checkpoint
- Present retrieved findings to the user for review and confirmation before applying any changes or updates to operational assets.
