# Deal Post-Mortem: OmniBank Financial (Closed Lost — $140,000 ARR)

> **Status**: CLOSED LOST  
> **Date Closed**: 2026-09-05  
> **Repository ID**: `LOSS-2026-09-OMNIBANK`

---

## 1. Deal Overview & Metadata

| Field | Detail |
| :--- | :--- |
| **Prospect / Customer** | **OmniBank Financial Corp** |
| **Industry / Segment** | Traditional Retail Banking & Financial Services |
| **Assigned Rep (AE)** | **Juanita Gomez** |
| **Sales Engineer / Specialist** | **David Kalu** |
| **Outcome** | **CLOSED LOST** |
| **Deal Value (ARR)** | **$140,000 ARR** |
| **Initial Contact Date** | 2026-06-12 |
| **Close Date** | 2026-09-05 |
| **Total Cycle Duration** | 85 calendar days |
| **Primary Economic Buyer** | **Robert Thorne**, SVP Enterprise Technology |
| **Internal Champion** | **Amir Patel**, Lead Architect, Digital Banking |
| **Winning Competitor / Decision** | **LegacyDocs Cloud (Incumbent Multi-Year Enterprise Renewal)** |

---

## 2. Executive Summary (The Deal Narrative)
OmniBank’s digital banking division sought to modernize their engineering documentation and establish an AI-ready organizational brain for 350 backend developers. Amir Patel strongly advocated for our Git-native Second Brain engine to replace their outdated 8-year-old LegacyDocs Cloud instance. However, during Stage 4 security reviews, OmniBank’s central IT governance team mandated on-prem air-gapped Active Directory / LDAP synchronization without internet connectivity. Because our engine does not natively support on-prem legacy LDAP connectors, LegacyDocs Cloud matched the requirement and offered an aggressive 40% enterprise bundle discount across their broader IT stack.

---

## 3. The 4 Analytical Dimensions

### Dimension 1: Core Decision Driver
- **Primary Blocker**: Rigid enterprise security architecture requirement for air-gapped legacy on-prem LDAP/Active Directory group synchronization without external egress.
- **Value Proposition Mismatch**: While Amir Patel and the digital engineering team loved our developer-centric GitOps workflow, central IT governance retained veto power and prioritized enterprise legacy compliance over developer productivity.
- **Verbatim Customer Feedback**:
  > *"Our developers overwhelmingly prefer your GitOps brain, and the AI IDE integration is brilliant. But our central IT security policy prohibits any system that lacks on-premises air-gapped LDAP directory synchronization. LegacyDocs has been here for 8 years, and their parent company gave us a 3-year enterprise bundle discount we couldn't walk away from."*  
  > — **Amir Patel, Lead Architect**

### Dimension 2: Pricing & Commercial Impact
- **TCO Perception**: Our $140k ARR quote was competitive with list pricing, but the incumbent vendor (LegacyDocs Cloud) bundled documentation into an existing $1.2M annual enterprise license agreement, effectively slashing the incremental cost of their docs tool by 40%.
- **Discounting Dynamics**: Juanita offered standard payment terms and a 12% discount, but price was secondary to the architectural LDAP compliance barrier.
- **Budget Authority**: The digital banking unit had operational budget, but central IT held technical veto power.

### Dimension 3: Competitor Impact & Positioning
- **Winning Competitor**: LegacyDocs Cloud (Incumbent enterprise knowledge management suite).
- **Competitor Strengths in this Deal**:
  - Pre-existing vendor MSA and approved procurement status in OmniBank's vendor master file.
  - Native integration with 15-year-old legacy Windows Server Active Directory infrastructure.
- **Where Our Battlecard Was Insufficient**: Our battlecard against LegacyDocs focused heavily on modern developer velocity and AI code assistants, but lacked clear scripts for countering centralized IT legacy infrastructure inertia.

### Dimension 4: Process & Qualification Learnings
- **MEDDPICC Rigor Breakdown**:
  - *Economic Buyer*: Juanita was reliant on champion Amir Patel and did not establish early multi-threading with central IT SVP Robert Thorne until Stage 4.
  - *Decision Process*: We failed to uncover central IT’s air-gapped LDAP requirement during Stage 1 (Discovery) or Stage 2 (Validation). It surfaced as an unexpected gatekeeper hurdle 65 days into the deal cycle.
- **Disqualification Failure**: Under our current `sales/qualification/qualification-matrix.md`, discovering that a prospect requires on-prem air-gapped LDAP without cloud egress is an immediate **Disqualify-Fast Trigger**. Had we qualified this in Discovery, we would have saved 60+ engineering and sales hours.

---

## 4. Key Takeaways & Playbook Feedback Loop

### What We Did Right
1. **Developer Experience Advocacy**: Converted Amir Patel and his 12 team leads into vocal champions who fought hard for our product in internal steering meetings.
2. **Transparent Architecture**: Clear and honest communication regarding our local-first GitOps model without making false promises about unsupported on-prem LDAP features.

### What We Must Change (Correction Plan)
1. **Mandatory Central IT Discovery in Stage 1**: In regulated enterprise accounts (Banking, Healthcare), mandate identifying whether central IT holds veto authority and confirm identity provider (IdP) requirements before advancing out of Discovery.
2. **Strict Disqualification Discipline**: Enforce the Disqualify-Fast rule when unresolvable legacy on-prem infrastructure requirements emerge.

---

## 5. Repository Update Commitments

- [x] **Qualification Matrix**: Added *"Air-gapped on-prem legacy LDAP/AD without modern OAuth2/SAML SSO"* to the Disqualify-Fast triggers in `sales/qualification/qualification-matrix.md`.
- [x] **Battlecards**: Updated `sales/battlecards/` with incumbent bundling counter-strategies.
- [x] **Product Specs**: Logged feedback in `product/specs/` regarding enterprise IdP requirements for regulated banking tiers.
