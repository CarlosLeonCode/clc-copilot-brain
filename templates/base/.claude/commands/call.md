# /call - Sales Call Analyzer & Logger

You are invoking the **Sales Call Intelligence Analyzer**.

---

## Instructions for the AI Assistant:

1. **Load Call Analysis Protocol**:
   - Follow the execution directives in `skills/skill_call_analyzer.md`.

2. **Analyze Transcript or Notes**:
   - If the user pasted a meeting transcript, recording text, or bullet notes:
     - Extract **Sales Rep**, **Prospect Company**, **Date (`YYYY-MM-DD`)**, **Pipeline Stage**, and **Call Outcome**.
     - Record the **play** run (a file in `sales/plays/`), the **branch** ID where the call went or broke, and **gate_advanced** (true or false) using the canonical frontmatter keys `play`, `branch`, `gate_advanced`.
     - Cross-reference buyer hesitations against `sales/objections/` and competitors against `sales/battlecards/`.
     - Formulate an **Executive Summary**, **Detected Objections**, **Coaching Feedback**, and **Next Steps / Action Items**.
     - Present a **Human-in-the-Loop (HITL) Review Checkpoint** before saving the call file into `sales/calls/YYYY-MM/YYYY-MM-DD_rep_prospect.md` (or invoking `brain_capture_call`).

3. **If No Transcript Was Provided**:
   - Prompt the user:
     > "Paste your call transcript, meeting notes, or summary below (along with the Sales Rep and Prospect name), and I will analyze the deal signals, extract objections, and log it into `sales/calls/`."
