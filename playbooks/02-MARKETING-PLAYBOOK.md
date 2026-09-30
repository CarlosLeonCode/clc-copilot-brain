# Marketing Playbook & Governance

## 1. Vision & Architecture

The marketing brain area organizes company positioning, brand guidelines, content assets, and distribution playbooks into an open, git-backed structure.

```
marketing/
├── brand/          # Voice, typography, logo usage, color palette, persona tone
├── messaging/      # Value propositions, elevator pitches, category positioning
├── content/        # Content pillars, editorial calendars, format templates
└── distribution/   # Channel distribution matrices (social, outbound, SEO, community)
```

---

## 2. Decoupling from AI Generators (No Vendor Lock-In)

Many teams fall into the trap of letting AI copywriting tools invent narrative tone, resulting in bland, generic, or misaligned messaging.

### Decoupling Rules:
1. **The Brain Dictates Voice, Not the LLM**: AI tools must ingest `marketing/brand/brand-guidelines.md` and `marketing/messaging/core-positioning.md` before generating copy.
2. **Deterministic Output Constraints**: Prompts must enforce banned words, tone parameters (e.g., authoritative, engineer-to-engineer, zero marketing fluff), and required citations.
3. **Format Portability**: All campaigns, outlines, and briefs are stored in plain Markdown files. Any generative AI tool (Claude, Gemini, OpenAI, open models) can be swapped without rewriting domain assets.

---

## 3. Messaging Hierarchy

Our messaging adheres to a three-tier hierarchy:
- **Tier 1: Category Narrative**: Why does this product category exist now? What macroeconomic or architectural shift forces change?
- **Tier 2: Value Proposition**: Single clear sentence articulating the transformation delivered to the core ICP.
- **Tier 3: Feature Pillars**: 3-4 structural pillars detailing tangible capabilities, technical mechanics, and quantifiable outcomes.

---

## 4. Distribution Governance

Every content piece created must map to at least one distribution channel in `marketing/distribution/`:
- **Developer / Technical Audience**: Hacker News, Reddit, GitHub Discussions, Engineering Blog. Must prioritize code snippets, benchmarks, and architectural clarity.
- **Executive / Buyer Audience**: LinkedIn thought leadership, whitepapers, executive briefings. Must emphasize ROI, compliance, velocity, and total cost of ownership (TCO).
- **SEO & Search Intent**: High-intent comparative queries (e.g., `[Our Solution] vs [Competitor]`) tied directly to `sales/battlecards/`.

---

## 5. Maintenance & Content Lifecycles

- **Monthly**: Review engagement metrics across channels; retire underperforming messaging angles.
- **Quarterly**: Audit `marketing/messaging/core-positioning.md` with Product and Sales leads to reflect shipped features and market shifts.
