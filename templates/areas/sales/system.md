# Sales System Map

## How your sales system works

Every deal moves through the same five steps:

1. **Discovery**: find out what hurts and who decides.
2. **Validation**: show it works and meet the person who signs off on the budget.
3. **Business Case**: agree on the value and send the proposal.
4. **Negotiation**: security review, legal terms, and who signs.
5. **Closed**: won or lost, and what we learned.

How to use it day to day:

- **Before each call**, ask your assistant for the right guide ("I have a cold call with Acme in an hour, help me prepare").
- **After each call**, tell your assistant how it went, or paste your notes ("Log this call").
- **Once a month**, ask your assistant how it's going ("How did this month go?"). It suggests changes, and you decide which ones to keep.

You never need to edit this page by hand: ask your assistant to change a step or improve a guide.

Want to see it? Ask your assistant: "Show me my sales process".

---

## For your AI assistant

> Internal map. Use it to pick the right play and gate, but never show this table, play IDs, branch codes, or file paths to the person. Talk about "the cold call guide", not `plays/cold-call.md`.

### Stage -> Plays -> Gate

| Stage | Exit gate | Plays |
| :--- | :--- | :--- |
| 1. Discovery | Gate 1: pain quantified, champion and economic buyer identified, validation meeting booked | [cold-call](./plays/cold-call.md), [discovery-call](./plays/discovery-call.md) |
| 2. Validation | Gate 2: technical sign-off, economic buyer met, mutual action plan started | [demo-call](./plays/demo-call.md), [follow-up](./plays/follow-up.md) |
| 3. Business Case | Gate 3: business case approved, proposal submitted, vendor selected | [follow-up](./plays/follow-up.md) |
| 4. Negotiation | Gate 4: InfoSec cleared, legal terms agreed, signer verified | [follow-up](./plays/follow-up.md) |
| 5. Closed | Contract signed or loss reason logged, post-mortem in `win-loss/` | No play yet. Add one with the `/flow` rules. |

Gate criteria live in [stages/pipeline-stages.md](./stages/pipeline-stages.md). Add a row (or a play link) here whenever you add a play.

### How plays work

- One play = one kind of conversation (a call, a meeting, a follow-up), written as a decision tree with a talk track per branch.
- A play can span several stages (`stages: 2, 3, 4`).
- Log which play and branch was run in each call log (`play`, `branch`, `gate_advanced`) so the monthly retro can show what works. Infer them from the notes; do not ask the person for them.
- Change a play only through the `/flow` or `/retro` rules, after the person says yes.
