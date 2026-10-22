---
name: flow
description: "See, improve or import the sales process and call guides from a photo, file or description, preview the result with clc-brain view --draft and save only after a yes. Use when someone shares a sales flow or wants to change how a call guide works. Scripts (the words to say) belong to /script."
argument-hint: "[what to see or change]"
metadata:
  opencode/slash: "true"
---

# /flow - Sales Pipeline Stages, Conversation Plays & Visual Flows

You are invoking the **Sales Flow & Pipeline Architect**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see step 2 below).

---

## Instructions for the AI Assistant:

If the person asks for a script (the exact words to say, "hazme un guion para..."), or to improve one, follow `.agents/skills/script/SKILL.md` instead. This skill is for the sales process and the structure of call guides.

Keep all routing internal: never show file paths, play IDs, branch codes, Mermaid code, or words like gate, play, or HITL to the person unless they use them. Talk about "your sales process" and "the cold call guide".

1. **Inspect Sales System**:
   - Read `sales/system.md`, `sales/stages/pipeline-stages.md`, and `sales/qualification/qualification-matrix.md`. List `sales/plays/` when the request is about a conversation.

2. **If No Specific Request Was Provided**:
   - Ask, in the person's language:
     > "Do you want to see how your sales process works, improve a call guide, or turn a drawing or photo of your process into a guide?"
   - If they want to see how it works, explain the steps of their sales process in plain words (a short numbered list), based on `sales/system.md`, and offer to open their sales system page (`clc-brain view --open`).
   - **Check Deal Stage or Exit Gates**: when asked, show the entry/exit criteria for the requested stage from `sales/stages/pipeline-stages.md` and the qualification checklist from `sales/qualification/qualification-matrix.md`, in the words of the team's sales method (stage names from `sales/system.md`, terms from `sales/glossary.md` when it exists). Never bring in another method's stages or criteria.

3. **Import: accept anything the person has**:
   - A photo or screenshot of a whiteboard or notebook, a PDF, an HTML file (including diagrams exported from tools like Archify, Miro or Lucidchart: read their visible text, labels and arrows), Mermaid text, a document, or just a spoken or written description.
   - Never ask them to convert it first. Work with what they hand in.

4. **Understand**:
   - Extract the steps, the decisions and the branches ("if they say X → do Y").
   - Classify each flow (never default to `pipeline-stages.md`):
     - **Whole sales process** (steps are deal stages across the whole deal) → `sales/stages/pipeline-stages.md`.
     - **One conversation** (steps are things said or heard inside one call or meeting) → a call guide in `sales/plays/<play-id>.md`. A conversation used in several stages is one guide with `stages: 2, 3, 4`.
   - If the input holds several flows, split them and list them plainly ("I see your overall process and two call guides: cold call and follow-up").
   - If the kind is unclear, ask: "Is this your whole sales process, or one conversation (like a call)?" and wait.

5. **Explain back before drafting**:
   - Explain back what you understood: a short numbered list of the steps and the "if they say X → do Y" branches.
   - Name anything unclear or missing: dead ends, arrows without a label, a missing next step, steps you could not read.
   - Ask about the gaps one question at a time, and wait for each answer. Never invent steps: mark unknowns and ask.
   - A new or imported call guide must define success and its type(s) of sale. If the input does not say, ask plainly "What counts as a good result for this call?" and "Which type(s) of sale is it for?" one at a time. Never invent the success or the type of sale.

6. **Draft**:
   - Write the draft in a temporary file outside the saved guides (for example in the system temp folder), never over a saved guide.
   - A call guide follows the play contract: frontmatter `play, stages, goal, success, motions, gate_unlocked, version, status`, then a Decision Tree, Branches (talk track per branch) and a Learnings Log. A pipeline draft holds the Mermaid flowchart of the stages.
   - Use only the Mermaid subset the page can draw:
     - Header `flowchart TD` (call guides) or `flowchart LR` (the whole process).
     - Steps: `id[text]`, `id(text)`, `id([text])`, `id{question?}` for decisions, `id((text))`; quote labels with punctuation: `id["text"]`; `<br>` for a line break.
     - Arrows: `A --> B`, labeled `A -->|label| B` or `A -- label --> B`.
     - No styling: no `classDef`, `class`, `style`, `linkStyle`, `click`, and no `subgraph` styling.

7. **Preview**:
   - Run `clc-brain view --draft <draft-file> --open` in this folder (add one `--draft` per draft file).
   - If the command exits with 1, the diagram can't be drawn: fix the draft and preview again before showing anything.
   - Then tell the person, in plain words: "This is how it would look. Nothing is saved yet."
   - If you cannot run commands, describe the result in plain words instead (the numbered steps and branches).

8. **Human-in-the-Loop (HITL) review checkpoint**:
   - Ask one yes/no question: "Save it like this?" / "¿Lo guardo así?".
   - If they want changes, update the draft and preview again. Repeat until they say yes or cancel. Nothing is written to their brain before a clear yes.

9. **Save**:
   - **New call guide**: save it in `sales/plays/` and add a row (or a link) for it to `sales/system.md`.
   - **Existing call guide**: update it, bump `version`, and add a Learnings Log ("What we've learned") entry describing the change.
   - **Whole process**: update the diagram (and stage criteria if they changed) in `sales/stages/pipeline-stages.md`.

10. **After Saving**:
   - Refresh the sales system page by running `clc-brain view` in this folder (if you cannot run commands, skip this silently), then tell the person in plain words that their sales page is up to date and offer to open it ("Want to see it?" / "¿Quieres verlo?"). Open it with `clc-brain view --open` only if they say yes.

**Later updates** ("Add a step when they ask for a discount", a new photo of the whiteboard) follow the same loop: understand the change → explain back → draft → preview → approval → save.
