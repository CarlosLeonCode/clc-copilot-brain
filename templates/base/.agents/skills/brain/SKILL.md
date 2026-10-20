---
name: brain
description: "Show what this brain can help with as a short plain menu grouped by its active areas, and offer setup when the brain is not set up yet. Use when someone says hi, asks for help, or asks what you can do."
metadata:
  opencode/slash: "true"
---

# /brain - Second Brain Master Control

You are invoking the **Organizational Second Brain Master Control**.

**User input:** $ARGUMENTS

If no arguments were given, show the menu below and ask the user what they want to work on.

---

## Instructions for the AI Assistant:

1. **Read Repository State** (internal, do not show to the user):
   - Inspect `org-kernel.json` in the workspace root.
   - Parse `organization.name`, `organization.industry`, `organization.tagline`, `governance.owner`, and `activeAreas`.
   - If `org-kernel.json` is missing or still has the default placeholders, offer to set up the brain together ("Want to set up your brain now? It's a short chat.") and follow `skills/skill_brain_onboarding.md` on a yes.

2. **Show a plain "What I can help with" menu**:
   Reply in the user's language. No commands, file paths, or field names. Only list areas that are active. Example:
   ```markdown
   # [Organization Name]: what I can help with

   **Sales**
   - Tell you what to say when a customer pushes back ("it's too expensive")
   - Help you beat a competitor
   - Log a call and give you tips for the next one
   - Tell you how the month went and what to change

   **Marketing**
   - Write in your brand's voice and check your messaging

   **Product**, **Operations**, **People**, **Finance**
   - One short line each, in plain words, for the areas you have

   I can also check or update your brain if you ask.
   ```

3. **Prompt the User**:
   Ask one question: what they want to work on today.

4. **Review checkpoint**:
   - This menu never changes files. Any change goes through its own skill and waits for the person to confirm it.
