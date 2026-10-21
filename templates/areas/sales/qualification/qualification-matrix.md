---
criteria: metrics, economic_buyer, decision_criteria, decision_process, paper_process, identified_pain, champion, competition, deal_size
advance_requires: champion, economic_buyer, identified_pain, deal_size
label_metrics: "Measurable impact"
label_economic_buyer: "Budget owner"
label_decision_criteria: "How they will choose"
label_decision_process: "Steps to a decision"
label_paper_process: "Contract and approvals"
label_identified_pain: "Problem that hurts"
label_champion: "Internal supporter"
label_competition: "Other options"
label_deal_size: "Deal size known"
---
# Sales Qualification Matrix & Disqualification Framework (`sales/qualification/`)

> **Core Revenue Principle:** Qualification is not a one-time gate; it is an ongoing deal hygiene discipline. Our goal is to **win big deals quickly or disqualify bad deals instantly**. Time spent pursuing unqualified opportunities is pipeline pollution.

---

## 1. The MEDDPICC Qualification Matrix

Every enterprise opportunity in the pipeline must be evaluated against the core pillars (the eight MEDDPICC pillars plus deal size):

| Pillar | Focus | Probing Discovery Questions | Verification Evidence (Green Flags) | Risk Indicators (Red Flags) |
| :--- | :--- | :--- | :--- | :--- |
| **M — Metrics** | Quantified economic impact & business case | • *"What is the financial impact of engineering documentation fragmentation today?"*<br>• *"How many developer hours are lost per sprint searching for architecture specs?"*<br>• *"What is the dollar value of reducing onboarding time from 10 weeks to 3 weeks?"* | • Quantified hard cost agreed upon in writing.<br>• Payback period calculated at < 6 months.<br>• CFO or VP Finance briefed on ROI model. | • Vague qualitative statements ("we want better docs").<br>• Inability to state developer headcount or salary costs.<br>• No quantified urgency. |
| **E — Economic Buyer** | The individual with discretionary veto & budget release authority | • *"Whose budget line item will fund this second brain deployment?"*<br>• *"If we meet all technical criteria, who gives the final financial sign-off?"*<br>• *"Can we align with [Name] directly to understand their Q4 revenue objectives?"* | • Direct 1-on-1 meeting completed with EB.<br>• EB confirms budget availability or reallocation authority.<br>• EB articulates strategic business value. | • Rep only talks to individual contributors or managers.<br>• Champion claims "I have full authority" but cannot sign contracts > $25k.<br>• EB refuses to join executive sponsor debrief. |
| **D — Decision Criteria** | Technical, operational, and commercial criteria | • *"What are the mandatory technical capabilities your architecture council requires?"*<br>• *"How will your team formally evaluate vendor security and SOC2 compliance?"*<br>• *"What vendor commercial terms are non-negotiable for procurement?"* | • Formal written evaluation scorecard shared.<br>• Our technical advantages (GitOps, Markdown SSOT, local-first) are formal criteria.<br>• Security criteria defined upfront. | • Moving goalposts without clear evaluation criteria.<br>• Technical team requests proprietary features we do not support.<br>• Prospect evaluating purely on commodity feature checklists. |
| **D — Decision Process** | The sequential roadmap from evaluation to contract signature | • *"Walk me through the exact steps from technical validation to contract execution."*<br>• *"What are the specific legal, InfoSec, and procurement reviews required?"*<br>• *"What is the typical lead time for vendor onboarding at your company?"* | • Mutual Action Plan (MAP) signed with exact calendar milestones.<br>• Legal redline point of contact identified.<br>• Procurement process steps and review cadences mapped out. | • Prospect says "once we decide, signing only takes 2 days" (enterprise fantasy).<br>• Unidentified security committees or board approval layers.<br>• No target go-live date tied to a business milestone. |
| **I — Identified Pain** | Compelling operational bottleneck costing revenue or velocity | • *"What happens to your Q4 product deliverables if this problem isn't solved?"*<br>• *"Has this documentation fragmentation caused recent production outages or security incidents?"*<br>• *"Why solve this now instead of pushing it to next fiscal year?"* | • Pain is acknowledged by executive leadership.<br>• Severe cost of inaction (COI) established.<br>• Tied directly to company-level strategic initiatives (e.g. AI transformation). | • Pain is an annoyance rather than a priority.<br>• "Nice to have" productivity improvement without acute symptoms.<br>• No consequences if project is deferred 12 months. |
| **C — Champion** | Internal advocate with political capital and personal interest | • *"What does solving this mean for your personal charter and team visibility?"*<br>• *"Will you introduce us to the Economic Buyer this week to review the findings?"*<br>• *"Are you comfortable partnering on an internal business case presentation?"* | • Champion provides internal organizational roadmap and backstage intelligence.<br>• Actively arranges access to the Economic Buyer.<br>• Sells internally when vendor is not in the room. | • Contact is friendly ("Coach") but lacks political capital or authority.<br>• Unwilling to introduce team to executive leadership.<br>• Passively forwards brochures without internal advocacy. |
| **P — Paper Process** | Legal, security and procurement steps to get a contract signed | • *"Which legal, security and procurement reviews does a contract go through here?"*<br>• *"Who signs, and how long did the last vendor take to onboard?"*<br>• *"Can we share our standard paperwork early so reviews run in parallel?"* | • Named contact for legal and procurement.<br>• Review steps and dates written into the mutual plan.<br>• Standard paperwork shared and under review. | • Nobody can describe how contracts get approved.<br>• Security or legal review is first mentioned late.<br>• Signature date is promised without any review steps. |
| **C — Competition** | Other vendors, internal builds and the do-nothing option | • *"Which other options are you looking at, including building it yourselves?"*<br>• *"What would make you stay with what you have today?"*<br>• *"What would the winning option need to prove to you?"* | • Alternatives are known and our advantages are tied to their criteria.<br>• The prospect explains why the status quo falls short. | • The prospect will not say who else is involved.<br>• An internal build or "do nothing" is quietly the favorite. |
| **$ — Deal Size** | What the deal is worth and whether the prospect has confirmed it | • *"What budget range have you set aside for this?"*<br>• *"How many people or teams would use it in the first year?"*<br>• *"What would a successful rollout be worth to you?"* | • A budget range or contract value is stated by the prospect.<br>• The number of users or teams is known.<br>• The size matches what we can deliver and support. | • The prospect will not talk about money or scale.<br>• The deal is much smaller or larger than we can serve.<br>• The value is only our guess. |

---

## 2. Disqualify-Fast Triggers (Instant Deal Breakers)

If any of the following conditions are met and cannot be resolved within **7 calendar days**, sales reps are required to **Disqualify the Opportunity immediately**:

### 🚫 The 6 Immediate Disqualification Rules

1. **No Economic Buyer Access by Stage 2**:
   - *Condition*: If the primary contact refuses to introduce or schedule the Economic Buyer by the conclusion of the Validation Stage.
   - *Action*: Disqualify. Do not build bespoke POCs or technical demonstrations without EB confirmation.

2. **Unsupported Architectural Constraints**:
   - *Condition*: Prospect mandates on-prem air-gapped legacy LDAP/Active Directory or proprietary closed databases that contradict our Git-native local architecture.
   - *Action*: Disqualify. Respectfully decline rather than engineering custom unmaintainable workarounds.

3. **No Compelling Event or Arbitrary Timeline**:
   - *Condition*: Prospect cannot articulate a specific business date, launch milestone, or financial consequence tied to delay.
   - *Action*: Downgrade to nurture; remove from active pipeline forecasting.

4. **Budget Disconnect (> 50% Gap)**:
   - *Condition*: Prospect expects consumer SaaS or free open-source tier pricing for an enterprise multi-seat deployment requiring governance and support.
   - *Action*: Point to open-source repository; close commercial pipeline record.

5. **Vendor Beauty Pageant / RFP Blind Bidding**:
   - *Condition*: Prospect issues an un-influenced 200-question spreadsheet RFP with zero discovery access or interaction with decision makers.
   - *Action*: Do not bid unless a certified Champion within the account wrote our differentiators into the RFP.

6. **Single-Threaded Champion Attrition**:
   - *Condition*: Sole internal champion leaves the company or changes teams, and remaining stakeholders express indifference.
   - *Action*: Pause deal; re-qualify from Stage 1 or close out.

---

## 3. Disqualification Conversational Scripts

When disqualifying an opportunity, maintain professional goodwill while firmly protecting company resources:

### Script A: No Economic Buyer Access
> *"Sarah, based on our experience deploying across engineering organizations your size, this project only succeeds when the CTO and platform leadership are aligned on developer velocity goals. Because we haven't been able to involve Dave in validating the business case, I recommend we pause this evaluation. When Dave is ready to prioritize this initiative for Q1, let's reconnect immediately."*

### Script B: Architecture / Technical Mismatch
> *"Mark, our platform is purpose-built for Git-native, modern software engineering teams using Markdown and automated IDE copilots. Because your organization strictly requires on-premises air-gapped LDAP directory sync without cloud egress, our architecture is not the right fit today. We'd rather be upfront now than deploy a solution that compromises your compliance standards."*

### Script C: Lack of Urgency / Compelling Event
> *"Amir, it sounds like modernizing internal documentation is an important long-term wish, but not an acute fire compared to your upcoming database migration. To respect your team's bandwidth, let's step back for now. Let's schedule a checkpoint in six months once the migration dust settles."*

---

## 4. Pipeline Health Auditing Cadence

- **Weekly Pipeline Scrub**: In 1-on-1 deal reviews, the Sales Lead inspects all Stage 2+ opportunities against this matrix.
- **MEDDPICC Completeness Score**: Deals missing > 2 letters may not be forecasted in the commit category for the quarter.
