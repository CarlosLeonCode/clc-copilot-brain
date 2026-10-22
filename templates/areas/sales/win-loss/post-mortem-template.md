---
motion:
lead_source:
deal_id:
result:
---
# Deal Post-Mortem Template

> **Instructions**: Complete this post-mortem within 5 business days of closing any Tier 1 or Tier 2 deal. Ground findings in factual customer statements, emails, and call recordings. Commit the finalized document to `sales/win-loss/YYYY-MM-DD_<prospect-slug>_<won|lost>.md`.

---

## 1. Deal Overview & Metadata

| Field | Detail |
| :--- | :--- |
| **Prospect / Customer** | [Company Name] |
| **Industry / Segment** | [e.g. FinTech / Enterprise B2B SaaS] |
| **Assigned Rep (AE)** | [Name] |
| **Sales Engineer / Specialist** | [Name] |
| **Outcome** | **CLOSED WON** / **CLOSED LOST** |
| **Deal Value (ARR)** | $[Amount] ARR |
| **Initial Contact Date** | [YYYY-MM-DD] |
| **Close Date** | [YYYY-MM-DD] |
| **Total Cycle Duration** | [X] days |
| **Primary Economic Buyer** | [Name, Title] |
| **Internal Champion** | [Name, Title] |
| **Key Competitors Evaluated** | [Competitor 1, Competitor 2, Build In-House] |

---

## 2. Executive Summary (The Deal Narrative)
*Provide a concise 3-5 sentence narrative of the deal from initial discovery to final closing signature or cancellation notice.*

> [Deal narrative here]

---

## 3. The 4 Analytical Dimensions

### Dimension 1: Core Decision Driver
*What was the decisive tipping point, trigger event, or insurmountable blocker that decided this deal?*
- **Primary Catalyst / Blocker**: [Explain the root technical or business driver]
- **Value Proposition Alignment**: [How well did our core product align with their primary pain?]
- **Verbatim Customer Feedback**:
  > "[Direct quote from champion or economic buyer explaining their decision]"

### Dimension 2: Pricing & Commercial Impact
*How did pricing structure, packaging, and commercial terms influence the decision?*
- **TCO Perception**: [Did the prospect perceive our solution as high ROI, premium, fair, or overpriced?]
- **Discounting Dynamics**: [What discounts were requested? What trade-offs were negotiated?]
- **Budget Authority & Procurement Friction**: [Was budget already allocated, or did we have to build an unbudgeted business case?]

### Dimension 3: Competitor Impact & Positioning
*How did competitors, incumbents, or internal build alternatives affect the outcome?*
- **Competitors in the Mix**: [List competitors actively evaluated by the prospect]
- **Where Our Positioning Won**: [Which silver bullets or capabilities held strong?]
- **Where Competitor Positioning Hurt Us**: [What competitor claims, FUD, or features created doubt?]
- **Incumbent Relationship**: [Were we replacing an incumbent, or was it a greenfield deployment?]

### Dimension 4: Process & Qualification Learnings
*How effectively was the deal qualified and managed through pipeline stages?*
- **Qualification Rigor** (criteria from `sales/qualification/qualification-matrix.md`):
  - *Evidenced early*: [Which criteria did the buyer confirm, and when?]
  - *Missing or late*: [Which criteria were never confirmed, and how did that affect the outcome?]
  - *Decision maker access*: [Did we meet the person who decides, and when?]
- **Stage Progression Velocity**: [Were there unnecessary dwell times or stalls between stages?]
- **Handoff Quality**: [How smooth was the transition to Customer Success or technical onboarding?]

---

## 4. Key Takeaways & Playbook Feedback Loop

### What We Did Right (Repeatable Patterns)
1. [Pattern 1]
2. [Pattern 2]

### What We Must Change (Correction Plan)
1. [Actionable change 1]
2. [Actionable change 2]

---

## 5. Repository Update Commitments

Check off all closed-loop repository updates resulting from this post-mortem:
- [ ] **Battlecards**: Update `sales/battlecards/[competitor].json` with new competitor claims or objection responses.
- [ ] **Objections**: Add newly encountered trigger phrases to `sales/objections/[objection].json`.
- [ ] **Case Studies**: Draft a customer proof point in `sales/case-studies/` (if Closed Won).
- [ ] **Product Roadmap**: File an architectural enhancement brief in `product/specs/` (if Closed Lost due to product gaps).
- [ ] **Sales Flow**: Update sales journey diagram in Archify if process chokepoints were detected.
