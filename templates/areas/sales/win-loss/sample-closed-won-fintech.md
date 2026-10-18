---
motion: "referral"
result: won
---
# Deal Post-Mortem: NexaPay Systems (Closed Won — $180,000 ARR)

> **Status**: CLOSED WON  
> **Date Closed**: 2026-09-18  
> **Repository ID**: `WIN-2026-09-NEXAPAY`

---

## 1. Deal Overview & Metadata

| Field | Detail |
| :--- | :--- |
| **Prospect / Customer** | **NexaPay Systems, Inc.** |
| **Industry / Segment** | FinTech / Enterprise Payments Infrastructure |
| **Assigned Rep (AE)** | **Carlos** |
| **Sales Engineer / Specialist** | **Elena Rostova** |
| **Outcome** | **CLOSED WON** |
| **Deal Value (ARR)** | **$180,000 ARR** (2-year contract: $360,000 TCV) |
| **Initial Contact Date** | 2026-07-10 |
| **Close Date** | 2026-09-18 |
| **Total Cycle Duration** | 70 calendar days |
| **Primary Economic Buyer** | **Michael Chang**, Chief Information Officer |
| **Internal Champion** | **Danielle Brooks**, Head of DevRel & Platform Ops |
| **Key Competitors Evaluated** | `Competitor Alpha`, `LegacyDocs Cloud`, Internal Custom Wiki |

---

## 2. Executive Summary (The Deal Narrative)
NexaPay operates a PCI-DSS certified global payments gateway with 650+ engineers. Knowledge silos across Confluence, disparate Google Drives, and Slack channels caused recurring deployment discrepancies, delayed developer ramp-up (10.5 weeks), and audit auditability friction. Danielle Brooks championed replacing their fractured documentation with a unified, Git-versioned Second Brain. Carlos and Elena conducted a 2-week architectural POC that proved zero cloud lock-in and validated local-first developer experience. CIO Michael Chang signed a 2-year enterprise agreement after seeing an estimated $410k annual engineering efficiency gain.

---

## 3. The 4 Analytical Dimensions

### Dimension 1: Core Decision Driver
- **Primary Catalyst**: Complete ownership of intellectual property via Git-native markdown without third-party vendor database lock-in. NexaPay's InfoSec team rejected Competitor Alpha due to cloud data sovereignty risks.
- **Value Proposition Alignment**: Clean separation between human documentation and automated AI IDE adapters (`.cursorrules`, `CLAUDE.md`, `.windsurfrules`).
- **Verbatim Customer Feedback**:
  > *"Every other vendor wanted us to sync our proprietary payment architecture into their multi-tenant cloud database. Your Git-first, local-executable brain gave our InfoSec and architecture council 100% confidence. It’s the first time an AI tool didn't terrify our compliance team."*  
  > — **Michael Chang, CIO**

### Dimension 2: Pricing & Commercial Impact
- **TCO Perception**: Perceived as high ROI. Carlos presented a payback analysis demonstrating that saving just 1.5 engineering hours per developer monthly paid for the entire platform in 75 days.
- **Discounting Dynamics**: NexaPay requested a 20% discount on standard list price ($200k/year). Carlos held firm on value but offered a multi-year term structure (10% discount in exchange for a 2-year upfront commitment, yielding $180k/year with quarterly billing terms).
- **Budget Authority**: Budget was reallocated from an underutilized Confluence Enterprise licensing line item and Q3 dev tooling reserve.

### Dimension 3: Competitor Impact & Positioning
- **Competitors in the Mix**: Competitor Alpha and LegacyDocs Cloud.
- **Where Our Positioning Won**:
  - **Silver Bullet 1**: Git versioning and local CLI schema verification (`copilot-brain doctor`) made the platform feel like standard software engineering tooling rather than an HR wiki.
  - **Silver Bullet 2**: Instant automated generation of IDE rules for Cursor, Claude Code, and Windsurf, enabling immediate productivity across their developer workstations.
- **Where Competitor Positioning Hurt Them**: Competitor Alpha attempted to pitch their proprietary knowledge graph, but NexaPay engineers found the syntax non-standard and feared long-term lock-in.

### Dimension 4: Process & Qualification Learnings
- **MEDDPICC Rigor**:
  - *Metrics*: Quantified 10.5-week onboarding time down to targeted 4-week goal, saving 180 hours/month across new hires.
  - *Economic Buyer*: Carlos met with CIO Michael Chang on day 22 after Danielle Brooks arranged the introduction following a successful technical architecture review.
  - *Champion Strength*: Danielle was an exceptional champion who pre-wired security objections and shared NexaPay's internal procurement checklist with us weeks in advance.
- **Stage Progression Velocity**: Transition from Discovery to Validation took 14 days; Validation to Proposal took 18 days; Legal and InfoSec took 28 days (standard enterprise FinTech compliance review).

---

## 4. Key Takeaways & Playbook Feedback Loop

### What We Did Right (Repeatable Patterns)
1. **Multi-Year Value Trade**: Traded a modest 10% price concession for a 2-year non-cancelable commitment, securing $360k in total contract value.
2. **Pre-emptive InfoSec Package**: Supplying the complete schema specifications, local Git architecture diagram, and SOC2 readiness documentation upfront saved at least 3 weeks of back-and-forth during Stage 4.

### What We Must Change (Correction Plan)
1. **Procurement Timeline Forecasting**: InfoSec redlining took 10 days longer than initial forecast because NexaPay required vendor SOC3 questionnaires. We should furnish standard compliance attestations on day 1 of Stage 3 (Proposal).

---

## 5. Repository Update Commitments

- [x] **Battlecards**: Updated `sales/battlecards/competitor-alpha.json` with field proof that GitOps/vendor lock-in messaging defeats their cloud graph pitch.
- [x] **Case Studies**: Drafted customer proof point in `sales/case-studies/fintech-scale-case-study.md`.
- [x] **Sales Flow**: Documented the "Pre-emptive InfoSec Package" milestone in `sales/stages/pipeline-stages.md`.
