# Sales System Map

## How your sales system works

Every deal moves through the same five steps:

1. **Discovery**: find out what hurts and who decides.
2. **Validation**: show it works and meet the person who signs off on the budget.
3. **Proposal**: agree on the value and the price, and send the proposal.
4. **Negotiation**: agree on the final terms and get the signature.
5. **Closed**: won or lost, and what we learned.

How to use it day to day:

- **Before each call**, ask your assistant for the right guide ("I have a cold call with Acme in an hour, help me prepare").
- **After each call**, tell your assistant how it went, or paste your notes ("Log this call").
- **Once a month**, ask your assistant how it's going ("How did this month go?"). It suggests changes, and you decide which ones to keep.
- **Need the words to say?** Ask your assistant for a script ("Make me a script for X"). You see a preview and decide before anything is saved.
- **Not sure what a term means?** Ask ("What does X mean?"). Your assistant keeps a glossary of your terms and adds new ones when you say yes.

You never need to edit this page by hand: ask your assistant to change a step or improve a guide.

Want to see it? Ask your assistant: "Show me my sales process".

---

## For your AI assistant

> Internal map. Use it to pick the right play and gate, but never show this table, play IDs, branch codes, or file paths to the person. Talk about "the cold call guide", not `plays/cold-call.md`.

### Stage -> Plays -> Gate

| Stage | Exit gate | Plays |
| :--- | :--- | :--- |
| 1. Discovery | Gate 1: problem and its cost understood, supporter and decision maker identified, next meeting booked | [cold-call](./plays/cold-call.md), [discovery-call](./plays/discovery-call.md) |
| 2. Validation | Gate 2: fit confirmed, decision maker met, shared plan agreed | [demo-call](./plays/demo-call.md), [follow-up](./plays/follow-up.md) |
| 3. Proposal | Gate 3: budget confirmed, proposal sent, we are the preferred option | [follow-up](./plays/follow-up.md) |
| 4. Negotiation | Gate 4: approvals done, terms agreed, contract sent for signature | [follow-up](./plays/follow-up.md) |
| 5. Closed | Contract signed or loss reason logged, post-mortem in `win-loss/` | No play yet. Add one with the `/flow` rules. |

Gate criteria live in [stages/pipeline-stages.md](./stages/pipeline-stages.md). Add a row (or a play link) here whenever you add a play.

### How plays work

- One play = one kind of conversation (a call, a meeting, a follow-up), written as a decision tree with a talk track per branch.
- A play can span several stages (`stages: 2, 3, 4`).
- Log which play and branch was run in each call log (`play`, `branch`, `gate_advanced`) so the monthly retro can show what works. Infer them from the notes; do not ask the person for them.
- Change a play only through the `/flow` or `/retro` rules, after the person says yes.

### Scripts, glossary and industry packs

> The brain ships no script, glossary or industry content. Build and change all of it through `.agents/skills/script/SKILL.md`: ask one question at a time, preview with `clc-brain view --draft`, and save only after the person says yes.

- Scripts live in `sales/scripts/<slug>.md` (one file per script set, English file names). `clc-brain view` writes the page `<slug>.html` beside each one. Add a row below for each script, and put `../scripts/<slug>.html#<anchor>` in the Guion cell of the play rows it covers.
- The glossary is `sales/glossary.md`, created with the first term. Add a line here that points to it.
- An industry pack is an ICP in `sales/icps/<industry>.md`, a script, and play rows named `<Branch> · <Industry>`. Add one row below per pack.

| Script | Industry | Conversations |
| :--- | :--- | :--- |

| Industry | Buyer profile | Script |
| :--- | :--- | :--- |
