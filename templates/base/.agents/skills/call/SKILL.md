---
name: call
description: "Log a sales call or meeting from notes or a transcript with a summary, objections, coaching tips and next steps, saved only after a yes. Use when someone pastes call notes or asks to log a call."
argument-hint: "[call notes or transcript]"
metadata:
  opencode/slash: "true"
---

# /call - Sales Call Analyzer & Logger

You are invoking the **Sales Call Intelligence Analyzer**.

**User input:** $ARGUMENTS

If no arguments were given, ask the user what they need (see the last step below).

---

## Instructions for the AI Assistant:

1. **Load Call Analysis Protocol**:
   - Follow the execution directives in `skills/skill_call_analyzer.md`.

2. **Analyze Transcript or Notes**:
   - If the user pasted a meeting transcript, recording text, or bullet notes:
     - Ask only for missing essentials (who they spoke with, which company, how it ended), one at a time. Infer everything else: **Date (`YYYY-MM-DD`)**, **Pipeline Stage** (a stage name from the stage table of `sales/system.md`, with its gate in `sales/stages/pipeline-stages.md`), and **Call Outcome**.
     - Infer the **play** run (a file in `sales/plays/`), the **branch** ID where the call went or broke, and **gate_advanced** (true or false), and write them with the canonical frontmatter keys `play`, `branch`, `gate_advanced`.
     - Infer the **type of sale**, the **lead source** and whether the guide's success was reached, and write them with the frontmatter keys `motion`, `lead_source`, `deal_id` (reuse the deal's earlier one) and `goal_met` (true or false). Never take `goal_met` from `gate_advanced`. Ask only what is missing, one question at a time.
     - Score the call as `skills/skill_call_analyzer.md` section 3c says: a 1 to 5 score for each of the six dimensions only when you have a verbatim quote (otherwise not-enough-evidence), `too-thin` when the notes are too short, the estimated counts, and one qualification result per criterion in `sales/qualification/qualification-matrix.md`. Never compute averages. Tell the person in plain words how the call went; never show key names.
     - Cross-reference buyer hesitations against `sales/objections/` and competitors against `sales/battlecards/`.
     - Formulate an **Executive Summary**, **Detected Objections**, **Coaching Feedback**, and **Next Steps / Action Items**.
     - Review checkpoint before saving the call file into `sales/calls/YYYY-MM/YYYY-MM-DD_rep_prospect.md` (or invoking `brain_capture_call`): confirm in ONE plain sentence (including the type of sale, the lead source and whether the goal was reached), then ask "Save it?" / "¿Lo guardo?". Show the full log only if asked. Never show internal IDs, field names, or file paths, and never say "HITL" to the user.

3. **If No Transcript Was Provided**:
   - Ask the user, in their language:
     > "Paste your notes or the call transcript here and I'll log it for you, with tips for next time."
