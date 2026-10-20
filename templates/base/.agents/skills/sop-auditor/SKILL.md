---
name: sop-auditor
description: "Review a Standard Operating Procedure against schemas/sop.schema.json for missing fields, unclear roles, and missing fallbacks. Use when asked to audit or check an SOP."
argument-hint: "[SOP name or file]"
metadata:
  opencode/slash: "true"
---

# Skill: Standard Operating Procedure (SOP) Auditor

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need.

## Purpose
Validates operational SOP documents against `schemas/sop.schema.json` to ensure completeness, clarity, and executability.

## Trigger Scenarios
- "Audit this new onboarding SOP"
- "Review our incident management SOP in operations/sops/ for gaps"
- "Check if our deployment playbook conforms to schema standards"

## Execution Protocol
1. Read the target SOP markdown and corresponding JSON file if available.
2. Verify all required schema fields:
   - `id`, `title`, `area`, `owner`, `version`, `effectiveDate`, `purpose`, `scope`, `steps`.
3. Check steps quality:
   - Are roles clearly specified for each step?
   - Is there a clear verification criteria to confirm the step succeeded?
   - Is there an escalation/fallback action defined for failure?
4. Report clear pass/fail status and output actionable remediation diffs.

## Human-in-the-Loop (HITL) Checkpoint
- Present the audit to the SOP owner for review and confirmation before changing the SOP.
