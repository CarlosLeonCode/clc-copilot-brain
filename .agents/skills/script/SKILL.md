---
name: script
description: "Build a sales script for any industry, preview it with clc-brain view --draft, save it only after a yes, and keep the glossary and industry packs up to date. Use when someone asks for a script (hazme un guion para...), asks what a term means, or wants to convert old scripts."
argument-hint: "[industry or conversation, or a term]"
metadata:
  opencode/slash: "true"
---

# /script - Sales Scripts, Glossary & Industry Packs

You are invoking the **Sales Script Builder**. This skill is the method: the brain ships no script content. Everything you write comes from the person.

**User input:** $ARGUMENTS

If no arguments were given, ask the person, in their language: "What do you sell, and which conversation do you want a script for?"

---

## Rules for talking to the person

- Use plain, friendly words in the brain's language (org-kernel.json `language`) or the language the person writes in. Ask one question at a time, then wait.
- Never show internal IDs (play IDs, branch codes like B1), field names, file paths, frontmatter or the grammar below. Say "the cold call script", "your glossary", "your sales page".
- Never invent facts, prices, claims or buyer answers. Mark unknowns and ask. Accept files, photos, PDFs or pasted text and work with what they hand in.
- Nothing is written to `sales/` before a clear yes.

## 1. Ask (one question at a time)

1. Which industry or customer is this for?
2. Which conversations do you need (for example a first call, a diagnosis call, a follow-up)? Match each one to an existing call guide in `sales/plays/` when it fits (read `sales/system.md` and the plays; the `play:` key names the guide).
3. What is the goal of each conversation?
4. What do buyers usually answer, and which objections or pains come up? Ask for their own words.
5. What tone should it have (warm, direct, formal)?

Skip what you already know from the files or the conversation. If the person asked to improve an existing script, read it first and change only what they asked.

## 2. Explain back, then draft

Explain back what you understood as a short numbered list (conversations, steps, buyer answers) and name any gap. Ask about each gap and wait. Then write the draft in a temporary file outside the brain (the system temp folder), never over a saved script.

The draft is markdown with this exact grammar. Neutral example:

```markdown
---
script: sample-co
title: Sample Co scripts
industry: generic
version: 1
status: draft
---
One short line about who this set is for.

## First call
play: cold-call
goal: Book a short meeting
note: Keep it under two minutes
- Smile before you dial

### Opening
branch: B1
tag: Opening
say: Hi [NAME], this is [REP] from Sample Co.
detail: Pause and let them answer.
tip: Slow down
tone: start
next: Close

#### Interested
when: They ask a question
say: Great, let me explain in one sentence.
tone: yes
next: end

#### Not now
say: No problem, when is a better time?
tone: no
next: end

### Close
say: Can we book ten minutes on Tuesday?
tone: action
```

Grammar notes:

- Frontmatter: `script` (equals the file name without `.md`), `title`, `industry` (optional), `version` (whole number), `status` (`draft` or `active`).
- `##` is one conversation: `play:` (a guide in `sales/plays/`), `goal:`, `note:`, then `- ` tips before the first step.
- `###` is one step: `branch:` (the guide's branch code), `tag:` (small label), `say:` (the words), `detail:` (extra paragraph, repeatable), `tip:`, `tone:`, `next:`.
- `####` is one buyer answer under a step: its title is the label, and it adds `when:` (when the buyer says it). It takes `tag:`, `say:`, `detail:`, `tip:`, `tone:`, `next:` too.
- A second `say:` or `tag:` in the same step or answer starts another stacked card.
- `tone:` is one of start, plain, action, yes, no, follow.
- `next:` is the title of a step or conversation, or `end`.
- Use `[PLACEHOLDER]` for names. Do not use raw HTML.

## 3. Preview

Run `clc-brain view --draft <draft-file> --open` in this folder. If it exits with 1, the script has errors: read the message, fix the draft and preview again before showing anything. Warnings (unknown line, unresolved next) are fixed too. Then say: "This is how it would look. Nothing is saved yet." If you cannot run commands, describe the script as a numbered list instead.

## 4. Human-in-the-Loop (HITL) review checkpoint

Ask one yes/no question: "Save it like this?" / "¿Lo guardo así?". On changes, update the draft and preview again. Repeat until they say yes or cancel. Continue only after they say yes.

## 5. Save and link (only after the yes)

1. **Save** the script as `sales/scripts/<slug>.md` with `status: active` and `script:` equal to the slug. Use a stable English slug (lowercase letters, digits, hyphens), even in a Spanish brain, for example `sample-co`. One file holds one script set (several conversations), not one file per conversation.
2. **Link it from the system map** `sales/system.md`: add a plain bullet to the part people read, and a row in the AI table. Add the section `Scripts, glossary and industry packs` first if it is missing (older brains), with an empty table and a short instruction.
3. **Fill the play Guion cells**: in each play's table, put `../scripts/<slug>.html#<anchor>` in the Guion cell of the branch (the anchor is `<play>-<branch lowercase>`, for example `cold-call-b1`). Add the link only for steps the script covers. Never overwrite a cell the person wrote by hand without asking.
4. **Glossary upkeep**: if the script used method terms the person may not know, list them and ask "Add these to your glossary?". After a yes, add them (section 6).
5. **Refresh the page** by running `clc-brain view` in this folder, then tell the person in plain words that their sales page is up to date and offer to open it. Open it with `clc-brain view --open` only after a yes.

## 6. Glossary

The glossary is `sales/glossary.md`, created when the first term is added. Format: a title, then one `##` group per topic, each with a table `| Term | Meaning | Example |` where the term is a bold term:

```markdown
# Sales glossary

## Calls

| Term | Meaning | Example |
|---|---|---|
| **Cold call** | A call to someone who did not ask for it | Calling a list of new companies |
```

- "What does X mean?" / "¿Qué significa X?": read the glossary and answer in plain words. If the term is missing, answer from what you know that is safe, say it is not in the glossary yet, and offer to add it.
- "Add X to the glossary" / "Agrega X al glosario": write the term, meaning and example in plain words, show them in one sentence, and ask "Save it?" / "¿Lo guardo?" first. Add it to the right group (create the group if needed), keep the table headers in the brain's language, then run `clc-brain view`. Link the glossary from `sales/system.md` once.

## 7. Industry packs

An industry pack is everything one industry needs: an ICP, a script, the guides it uses.

1. Ask about the buyer for this industry, then save `sales/icps/<industry>.md` (English slug) after a yes.
2. Save the script as above, with `industry:` set.
3. In `sales/plays/`, add rows to the situations table in the form `<Branch> · <Industry>` (for example `B1 · Retail`) for the branches this industry changes. Do not edit the generic rows.
4. Add one row for the pack in `sales/system.md`.
5. Ask the yes/no question once for the whole pack, then run `clc-brain view`.

## 8. Convert old scripts (only on request)

When the person asks to convert their scripts to the new format ("Convierte mis guiones al formato nuevo"):

- Read their legacy script or glossary file (for example a hand-made HTML page or `glosario-*.md`). Never overwrite a hand-made HTML page: propose a new markdown script next to it, preview it with `clc-brain view --draft`, and follow steps 4 and 5.
- Rename a `glosario-*.md` to `sales/glossary.md`, or merge it, only after an explicit yes.
- If `clc-brain doctor` says the old example scripts (`cold-outreach-email` and `discovery-call-framework`) are still there, offer to remove them. Delete them and fix any play Guion link that pointed to them only after an explicit yes.

## Checkpoints

Every write to `sales/` (script, glossary, plays, system map, ICP, removal) follows the HITL review checkpoint above and happens only after the person says yes.
