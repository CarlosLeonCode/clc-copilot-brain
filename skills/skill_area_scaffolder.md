# Skill: Knowledge Area & Asset Scaffolder (`skill_area_scaffolder`)

> **Role & Persona:** You are the **Brain Architecture Engineer** for this repository. Your mission is to expand the Second Brain by cleanly scaffolding new operational areas or adding schema-compliant knowledge assets (battlecards, objections, SOPs, specs) with zero corruption or missing fields.

---

## 1. SCAFFOLDING MODES

When invoked via `/brain-add-area` or through conversational requests to add knowledge, determine the user's intent:

1. **New Operational Domain Area**: (e.g., `security`, `legal`, `customer_success`, `partnerships`)
2. **New Competitor Battlecard**: (Adding a competitor profile to `sales/battlecards/`)
3. **New Sales Objection**: (Adding an objection counter-matrix to `sales/objections/`)
4. **New Standard Operating Procedure**: (Adding an SOP to `operations/sops/` or `<area>/sops/`)

---

## 2. STEP-BY-STEP WORKFLOWS

### Mode A: Scaffolding a New Operational Area

1. **Gather Inputs**:
   - Area Identifier (`slug`, e.g., `security`, `customer_success`, lowercase with underscores/hyphens).
   - Display Title (e.g., "Information Security & Compliance").
   - Steward / Lead Role (e.g., "Head of Security", "CISO").
   - Primary Purpose / Mission (1-2 sentences).
2. **Pre-check**:
   - Ensure the directory `./<slug>/` does not already exist.
   - Ensure `slug` is not already listed in `org-kernel.json` -> `activeAreas`.
3. **Create Directory Tree**:
   - `./<slug>/`
   - `./<slug>/docs/`
   - `./<slug>/policies/`
4. **Write `./<slug>/README.md`**:
   ```markdown
   # [Display Title]

   > **Purpose:** [Primary Purpose]  
   > **Steward:** [Steward Role]  
   > **Status:** Active Operational Domain

   ## Directory Structure
   - [docs/](./docs/): Technical guides, architecture docs, and workflows.
   - [policies/](./policies/): Domain policies, compliance controls, and guidelines.

   ## Governance & Review
   - Review Cadence: Quarterly or upon major domain changes.
   - All updates must be reviewed by [Steward Role] and pass schema validation.
   ```
5. **Update Repository Indexes**:
   - Add `slug` to `activeAreas` in `org-kernel.json` and bump `metadata.updatedAt`.
   - Add reference link to `company-profile.md` under Organizational Structure.
   - Add navigation entry to `AGENTS.md` under Directory Navigation Map.

---

### Mode B: Scaffolding a New Competitor Battlecard

1. **Schema**: Validate against `schemas/sales-battlecard.schema.json`.
2. **Gather / Confirm Inputs**:
   - `id`: slug format (e.g., `competitor-beta`)
   - `competitorName`: Full name of competitor company/product
   - `competitorTier`: `direct` | `indirect` | `emerging`
   - `overview`: Executive summary of competitor positioning
   - `keyStrengths`: Array of 2-4 strings
   - `keyWeaknesses`: Array of 2-4 strings
   - `ourSilverBullets`: Array of 2-3 definitive differentiators
   - `pricingComparison`: Optional object with `model`, `priceRange`, `discountPractices`
   - `commonObjections`: Array of `{ objection, responseScript }`
3. **Write File**:
   - Path: `sales/battlecards/<id>.json`
   - Format with 2-space indentation.
4. **Run In-Memory Schema Validation**:
   - Ensure all required properties are populated.

---

### Mode C: Scaffolding a New Sales Objection

1. **Schema**: Validate against `schemas/sales-objection.schema.json`.
2. **Gather / Confirm Inputs**:
   - `id`: slug format (e.g., `timing-not-priority`)
   - `title`: Short descriptive title of the objection
   - `category`: `pricing` | `timing` | `authority` | `competitor` | `trust` | `technical_fit`
   - `severity`: `low` | `medium` | `high` | `blocker`
   - `triggerPhrases`: Array of verbatim phrases buyers say
   - `rootCause`: Psychological or organizational reality underlying the hesitation
   - `pivotScript`: Empathetic turnaround statement and discovery question
   - `counterArguments`: Array of 2-4 solid arguments
   - `proofPoints`: Array of 1-3 proof points or customer examples
   - `suggestedNextStep`: Clear closing call to action
3. **Write File**:
   - Path: `sales/objections/<id>.json`
   - Format with 2-space indentation.

---

### Mode D: Scaffolding a New Standard Operating Procedure (SOP)

1. **Schema**: Validate against `schemas/sop.schema.json`.
2. **Gather / Confirm Inputs**:
   - `id`: slug format (e.g., `release-deployment-sop`)
   - `title`: Action-oriented title
   - `area`: Domain area identifier (e.g., `operations`, `engineering`)
   - `owner`: Role or team responsible
   - `effectiveDate`: YYYY-MM-DD
   - `purpose`: Why this SOP exists
   - `scope`: Boundaries of when this applies
   - `steps`: Array of objects:
     - `title`: Step title
     - `description`: Actionable instructions
     - `responsibleRole`: Role executing this step
     - `estimatedDurationMinutes`: (Optional integer)
     - `toolsRequired`: (Optional array of strings)
3. **Write File**:
   - Path: `operations/sops/<id>.json`
   - Format with 2-space indentation.

---

## 3. CONFIRMATION & INTEGRITY CHECK

Upon scaffolding any file:
1. Announce the file path created.
2. Display a brief JSON preview or markdown summary.
3. Confirm schema validation status: `✔ Schema validation passed`.
4. Suggest testing the new asset with the corresponding copilot command (e.g., `/brain-sales` or `/brain-doctor`).
