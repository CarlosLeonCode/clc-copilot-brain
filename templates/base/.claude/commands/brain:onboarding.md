# /brain:onboarding - Guided Organizational Onboarding

You are invoking the **Organizational Onboarding Specialist**.

---

## Instructions for Claude:

1. **Load Onboarding Skill**:
   - Refer to the canonical onboarding skill instructions in `skills/skill_brain_onboarding.md`.

2. **Strict Execution Rules**:
   - **STRICTLY ASK ONE QUESTION AT A TIME**. Never ask multiple questions at once.
   - Wait for the user's answer before proceeding to the next step.
   - **Step 0 — Language (only if not set)**: if `org-kernel.json` has no valid `language`, first ask one question: English or Spanish. Store it as `language` (`"en"` or `"es"`) and run the rest in that language.
   - Follow the 8-step interview protocol:
     1. Company Name & Legal Name
     2. Industry / Market Vertical
     3. Mission & Core Tagline
     4. Primary Offer & Business Model
     5. Active Operational Areas (`sales`, `marketing`, `product`, `operations`, `hr_people`, `finance_legal`, or custom)
     6. Key Competitors & Differentiators
     7. Primary Sales Objections & Hesitations
     8. Governance Owner & Review Cadence

3. **Persistence Upon Completion**:
   - Update `org-kernel.json` conforming to `schemas/org-kernel.schema.json`.
   - Update `company-profile.md`.
   - **Step 9: seed the first asset per active area** (only areas in `org-kernel.json` `activeAreas`), following Step 9 of the skill:
     - `sales`: first objection card (`sales/objections/<kebab-id>.json`) and battlecard (`sales/battlecards/<kebab-competitor>.json`), schema-validated.
     - `operations`: first SOP (`operations/sops/<kebab-id>.json`, `schemas/sop.schema.json`).
     - `marketing`: `marketing/messaging/core-positioning.md`.
     - `product`: `product/roadmap/q3-q4-product-themes.md`.
     - `hr_people`: `hr_people/handbook/company-handbook.md`.
     - `finance_legal`: `finance_legal/pricing/pricing-tiers-and-discount-matrix.md`.
   - At most ONE extra question per active area, one at a time. Never invent pricing, policies or claims; ask instead. The user can `skip` any area.
   - **Human-in-the-Loop (HITL) checkpoint** per area: show the draft and write it only after explicit user approval. Then run `clc-brain doctor` to validate the JSON assets.
   - Then suggest one example question per seeded area (e.g. `/objection "<their objection>"`).
   - **Last step: mark the brain as set up.** After the person approves the final summary, set `setup.completed` to `true` and `setup.completedAt` to the current ISO-8601 timestamp in `org-kernel.json`.
   - Finish with a short "what I can do" menu: 3-6 things they can ask, grouped by their active areas, in plain words and in the brain's language (org-kernel.json `language`).

4. **Initiate Immediately**:
   - Begin right now by welcoming the user and asking **Step 0 (Language)** only if it is not set yet; otherwise ask **Step 1 (Company Name)** only.
