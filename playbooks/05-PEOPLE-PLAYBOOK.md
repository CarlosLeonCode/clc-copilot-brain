# People & Talent Operations Playbook

## 1. Overview

The People & Talent Brain (`hr_people/`) codifies the employee lifecycle from initial talent acquisition to high-velocity onboarding and organizational culture stewardship.

```
hr_people/
├── handbook/       # Company operating manual, values manifesto, remote work norms
├── hiring/         # Role scorecards, structured interview question banks, rubrics
└── onboarding/     # 30-60-90 day milestone plans for new hires
```

---

## 2. Hiring via Structured Scorecards

Unstructured interviews introduce bias and variable hiring quality. All roles must utilize structured scorecards stored in `hr_people/hiring/`:

- **Mission**: Single sentence defining why this role exists.
- **Outcomes**: 3-5 quantifiable deliverables expected within the first 12 months (e.g., "Build and launch v2 of search engine decreasing query latency by 40%").
- **Competencies**: Behavioral and technical traits evaluated on a 1-5 rubric.
- **Question Banks**: Standardized behavioral prompts mapping to each competency.

---

## 3. Onboarding (30-60-90 Framework)

New hires must have their onboarding plan initialized from `hr_people/onboarding/30-60-90-day-plan.md` on day 1:
- **Days 1–30 (Absorb & Align)**: Environment setup, reading the Second Brain, shadowing customer calls, submitting first minor PR/deliverable.
- **Days 31–60 (Contribute & Collaborate)**: Taking ownership of independent sub-projects, running standard sprints, active team reviews.
- **Days 61–90 (Own & Innovate)**: Leading autonomous initiatives, proposing brain improvements, contributing to playbooks.

---

## 4. Culture & Handbook Maintenance

The handbook is living code:
- Any company-wide policy change (vacation, travel expense, equipment stipend) must be proposed via pull request.
- Employee questions about benefits or culture are answered by directing to `hr_people/handbook/` files, ensuring single source of truth.
