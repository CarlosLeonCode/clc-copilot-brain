# Sales System Map (`sales/system.md`)

> **How to use this page:** find the deal stage you are in, check the gate you must clear, then open the play for the conversation you are about to have. Plays hold the decision tree and talk tracks; stages hold the gate criteria.

---

## Stage -> Plays -> Gate

| Stage | Exit gate | Plays |
| :--- | :--- | :--- |
| 1. Discovery | Gate 1: pain quantified, champion and economic buyer identified, validation meeting booked | [cold-call](./plays/cold-call.md), [discovery-call](./plays/discovery-call.md) |

Gate criteria live in [stages/pipeline-stages.md](./stages/pipeline-stages.md). Add a row (or a play link) here whenever you add a play.

---

## How plays work

- One play = one kind of conversation (a call, a meeting, a follow-up), written as a decision tree with a talk track per branch.
- A play can span several stages (`stages: 2, 3, 4`).
- Log which play and branch you ran in each call log (`play`, `branch`, `gate_advanced`) so `/retro` can show what works.
- Change a play only through `/flow` or `/retro`, after human review.
