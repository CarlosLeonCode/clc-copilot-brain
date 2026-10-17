# /flow - Sales Pipeline Stages, Conversation Plays & Visual Flows

You are invoking the **Sales Flow & Pipeline Architect**.

---

## Instructions for the AI Assistant:

1. **Inspect Sales System**:
   - Read `sales/system.md`, `sales/stages/pipeline-stages.md`, and `sales/qualification/qualification-matrix.md`. List `sales/plays/` when the request is about a conversation.

2. **Classify Before Writing** (never default to `pipeline-stages.md`):
   - **Macro pipeline**: nodes are deal stages or gates across the whole deal. Destination: `sales/stages/pipeline-stages.md`.
   - **Conversation play**: nodes are things said or heard inside one interaction (opener, objection, reply, outcome). Destination: `sales/plays/<play-id>.md`. A tree spanning several stages is one play with `stages: 2, 3, 4`.
   - If it is unclear, ask exactly one question: "Is this the whole deal pipeline or a single conversation?" and wait.

3. **Execute Requested Action**:
   - **Check Deal Stage or Exit Gates**: Show the mandatory entry/exit criteria for the requested stage and verify MEDDPICC qualification checklists.
   - **Convert Visual Flowchart / Screenshot to Mermaid**: Convert it into a clean **Mermaid flowchart** (`flowchart LR` for pipelines, `flowchart TD` for play trees).
   - **Existing play**: update it, bump `version`, and append a Learnings Log entry. **New play**: follow the play contract (frontmatter `play, stages, goal, gate_unlocked, version, status`; Decision Tree; Branches; Learnings Log) and add a row to `sales/system.md`.
   - Show the destination path and the proposed change for **Human-in-the-Loop (HITL) review** before writing anything.

4. **If No Specific Request Was Provided**:
   - Display a concise summary of `sales/system.md` (stages, gates, plays) and ask:
     > "Would you like to check exit criteria for a deal stage, review a conversation play, or update a flow diagram?"
