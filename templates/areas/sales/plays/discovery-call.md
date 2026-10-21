---
play: discovery-call
stages: 1
goal: Understand their problem and who decides, so we can plan the next meeting
gate_unlocked: Gate 1
version: 1
status: active
motions: all
success: Problem and decision maker understood
---
# Play: Discovery Call

> **Goal:** confirm ICP fit, quantify the pain, find the champion and economic buyer, and book the validation meeting.
> **Stage:** 1. **Gate:** Gate 1 in [pipeline-stages](../stages/pipeline-stages.md). **Related:** [cold-call](./cold-call.md).

## Decision Tree

```mermaid
flowchart TD
    B1["Set agenda and time"] --> B2{"Pain described?"}
    B2 -->|"Vague"| B3["Dig: impact, frequency, cost"]
    B2 -->|"Clear"| B4{"Decision process known?"}
    B3 -->|"Quantified"| B4
    B3 -->|"Cannot quantify"| B7["Stop here or keep in touch"]
    B4 -->|"Supporter and budget owner named"| B5["Summarize and propose the next meeting"]
    B4 -->|"Budget owner unknown"| B6["Ask for an introduction"]
    B6 -->|"Intro offered"| B5
    B6 -->|"Refused"| B7
    B5 -->|"Booked"| B8["Next meeting booked"]
```

## Branches

| Branch | Trigger | Talk track | Script link |
| :--- | :--- | :--- | :--- |
| B1 | Call starts | "The goal is to understand how you work today and decide together if a next step makes sense. Fair?" | — |
| B2 | Prospect describes a problem | Mirror it back in one sentence and ask what it costs. | — |
| B3 | Answers stay vague | "If this stays as is for a year, what does that cost you in hours or revenue?" | — |
| B4 | Pain is clear | "Who else would need to agree to fix this, and how are decisions like this made?" | — |
| B5 | Supporter and budget owner named | Summarize pain, impact, and owners; propose a validation meeting with an agenda. | — |
| B6 | Budget owner unknown | "Who holds the budget for this? Could you introduce us?" | — |
| B7 | No quantified pain or access | Close the loop politely, log the reason, and keep in touch from time to time. | — |
| B8 | Meeting booked | Note in the call log that the deal moved forward. | — |

## Learnings Log

<!-- Format: - YYYY-MM-DD vN->vN+1: change (evidence: CALL-...) -->
- No entries yet. `/retro` proposes edits here after enough logged calls.
