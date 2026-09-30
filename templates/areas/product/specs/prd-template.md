# PRD: [Feature / Initiative Name]

> **Status:** Draft / In Review / Approved / Shipped  
> **Author:** [Product Lead Name]  
> **Engineering Owner:** [Tech Lead Name]  
> **Target Release:** [Sprint / Milestone]  
> **Schema / Spec Link:** [Optional Schema Link]

---

## 1. Problem Statement & Customer Pain
*What user or organizational problem are we solving? Cite feedback from `sales/objections/` or customer interviews.*

---

## 2. Target Audience & Personas
*Link to relevant ICP in `sales/icps/`.*

---

## 3. Measurable Success Metrics (OKRs)
- Metric 1: (e.g., Reduce onboarding query time by 30%)
- Metric 2: (e.g., Achieve 99.9% uptime on validation hooks)

---

## 4. User Stories & Acceptance Criteria

### User Story 1:
- **As a** developer using Cursor IDE,
- **I want to** immediately access validated sales battlecards,
- **So that** I can write accurate integration copy without leaving my editor.

**Acceptance Criteria:**
- [ ] GIVEN the repository has `copilot-brain` initialized
- [ ] WHEN the agent checks `.cursorrules`
- [ ] THEN it finds the direct path to `sales/battlecards/`

---

## 5. Non-Functional Requirements & Security
- Zero remote data egress.
- Fast execution under 200ms for CLI operations.

---

## 6. Out of Scope
*Explicitly list what we are NOT building in this version to avoid scope creep.*
