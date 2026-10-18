---
play: follow-up
stages: 2, 3, 4
goal: Keep the deal moving between meetings until the next step is agreed
gate_unlocked: Next gate
version: 1
status: active
motions: all
success: Prospect replied with a next step
---
# Play: Follow-up

> **Goal:** after any meeting, send a short recap, confirm the next step, and re-engage quiet deals without pressure.
> **Stages:** 2, 3, 4. **Gates:** see [pipeline-stages](../stages/pipeline-stages.md). **Related:** [demo-call](./demo-call.md).

## Decision Tree

```mermaid
flowchart TD
    B1["Send recap within 24h"] --> B2{"Reply within 3 days?"}
    B2 -->|"Yes"| B3{"Next step confirmed?"}
    B2 -->|"No"| B4["Second touch with new value"]
    B3 -->|"Yes"| B5["Book it and note the progress"]
    B3 -->|"No"| B6["Ask one question about the blocker"]
    B4 -->|"Reply"| B3
    B4 -->|"Silent"| B7["Third touch: direct close-the-loop note"]
    B7 -->|"Reply"| B3
    B7 -->|"Silent"| B8["Close for now or keep in touch"]
    B6 -->|"Answered"| B5
```

## Branches

| Branch | Trigger | Talk track | Script link |
| :--- | :--- | :--- | :--- |
| B1 | Meeting just ended | Recap decisions, owners, and the agreed next step in five lines or fewer. | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B2 | Waiting for reply | Wait 3 business days before the next touch. | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B3 | Prospect replied | Confirm the next step, owner, and date in writing. | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B4 | No reply | Add one new piece of value (case study, answer to an open question), not a nudge. | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B5 | Step confirmed | Book the meeting, update the call log, and note that the deal moved forward. | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B6 | Reply without commitment | "What would need to be true for this to move forward?" | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B7 | Still silent | "Should I close this out for now, or is the timing just off?" | [Outreach frameworks](../scripts/cold-outreach-email.md) |
| B8 | No response to the close-the-loop note | Close it for now or keep in touch from time to time, and log the reason. | [Outreach frameworks](../scripts/cold-outreach-email.md) |

## Learnings Log

<!-- Format: - YYYY-MM-DD vN->vN+1: change (evidence: CALL-...) -->
- No entries yet. `/retro` proposes edits here after enough logged calls.
