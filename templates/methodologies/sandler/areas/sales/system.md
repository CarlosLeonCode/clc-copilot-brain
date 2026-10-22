# Sales System Map

## How your sales system works

We sell like a doctor who diagnoses: first we understand what hurts the business, and only then do we show the solution. Every sale moves through the same five steps:

1. **Contact**: introduce yourself in 30 seconds, see if the business recognizes a problem, and book a meeting with the person who decides.
2. **Pain**: understand what the problem costs the business today and whether they really want to fix it.
3. **Budget and decision**: confirm the investment makes sense next to what they lose, and who decides, how and by when.
4. **Presentation**: show the solution only against the problem you confirmed, with the person who decides there.
5. **Close**: a clear yes with a start date, or a clear no. Both are good results; "I'll let you know" is not.

Three rules for every conversation:

- **Listen more than you talk**: the buyer talks 70% of the time and you 30%.
- **Talk as an equal**: you are not asking for favors; you are checking together if it makes sense.
- **Close the sale or close the file**: no conversation ends without a day and time for the next step, or a no.

How to use it day to day:

- **Before each call**, ask your assistant for the right guide ("I have a cold call in an hour, help me prepare").
- **After each call**, tell your assistant how it went, or paste your notes ("Log this call").
- **Once a month**, ask your assistant how it's going ("How did this month go?"). It suggests changes, and you decide which ones to keep.
- **Need the words to say?** Ask your assistant for a script ("Make me a script for X"). You see a preview and decide before anything is saved.
- **Not sure what a term means?** Ask ("What does upfront contract mean?"). Your assistant keeps a glossary of your method's terms and adds new ones when you say yes.

You never need to edit this page by hand: ask your assistant to change a step or improve a guide.

Want to see it? Ask your assistant: "Show me my sales process".

---

## For your AI assistant

> Internal map. Use it to pick the right play and gate, but never show this table, play IDs, branch codes, or file paths to the person. Talk about "the cold call guide", not `plays/cold-call.md`.

### Stage -> Plays -> Gate

| Stage | Exit gate | Plays |
| :--- | :--- | :--- |
| 1. Contact | Gate 1: the prospect recognized a pain, we know who decides, and a diagnosis meeting with that person has a day and time | [cold-call](./plays/cold-call.md), [follow-up](./plays/follow-up.md) |
| 2. Pain | Gate 2: upfront contract set, pain described in their words with an example, its monthly cost worked out by the prospect, and they want to fix it now | [discovery-call](./plays/discovery-call.md) |
| 3. Budget and decision | Gate 3: investing makes sense next to the monthly cost, the person who decides will be at the presentation, we know how and by when they decide, and the presentation is booked | [discovery-call](./plays/discovery-call.md), [follow-up](./plays/follow-up.md) |
| 4. Presentation | Gate 4: the person who decides saw the solution against their pain and gave a yes or a no | [demo-call](./plays/demo-call.md), [follow-up](./plays/follow-up.md) |
| 5. Close | A yes with the post-sell step done and a start date, or a no logged with its reason; review in `win-loss/` | [demo-call](./plays/demo-call.md) |

Gate criteria live in [stages/pipeline-stages.md](./stages/pipeline-stages.md), qualification (upfront contract, pain, budget, decision) in [qualification/qualification-matrix.md](./qualification/qualification-matrix.md), and the method's terms in [glossary.md](./glossary.md). Add a row (or a play link) here whenever you add a play.

### Method rules

- Fixed order: pain, then budget, then decision. Never offer a presentation or send prices or material before you have all three.
- Every meeting starts with an upfront contract: how long, what for, permission for both sides to say no, and the next step if it makes sense.
- When someone who does not decide answers, ask twice for a meeting with the person who decides, and invite the first contact too.
- The monthly cost of the pain is worked out by the prospect, never by you. Never invent figures, prices or features that are not in the company profile.

### How plays work

- One play = one kind of conversation (a call, a meeting, a follow-up), written as a decision tree with a talk track per branch.
- A play can span several stages (`stages: 2, 3`).
- Log which play and branch was run in each call log (`play`, `branch`, `gate_advanced`) so the monthly retro can show what works. Infer them from the notes; do not ask the person for them.
- Change a play only through the `/flow` or `/retro` rules, after the person says yes.

### Scripts, glossary and industry packs

> The brain ships the method's glossary but no script or industry content. Build and change all of it through `.agents/skills/script/SKILL.md`: ask one question at a time, preview with `clc-brain view --draft`, and save only after the person says yes.

- Scripts live in `sales/scripts/<slug>.md` (one file per script set, English file names). `clc-brain view` writes the page `<slug>.html` beside each one. Add a row below for each script, and put `../scripts/<slug>.html#<anchor>` in the Guion cell of the play rows it covers.
- The glossary is `sales/glossary.md`. It starts with the method's terms; add the team's own terms to it.
- An industry pack is an ICP in `sales/icps/<industry>.md`, a script, and play rows named `<Branch> · <Industry>`. Add one row below per pack.

| Script | Industry | Conversations |
| :--- | :--- | :--- |

| Industry | Buyer profile | Script |
| :--- | :--- | :--- |
