# Product Documentation Lifecycle Playbook

## 1. Scope & Purpose

The Product directory bridges strategic roadmap vision with engineering execution. It establishes clear protocols for Product Requirement Documents (PRDs), Architecture Decision Records (ADRs), and Release Communications.

```
product/
├── roadmap/        # Quarterly themes, high-level horizons, feature backlogs
├── specs/          # PRDs, feature briefs, user story mappings, ADRs
└── releases/       # Release notes, changelog history, launch communication plans
```

---

## 2. Product Requirements Document (PRD) Lifecycle

Every non-trivial feature (>3 engineering days) requires a PRD in `product/specs/`.

### Stages:
1. **Draft**: Authored by Product Lead with problem statement, target ICP, measurable success metrics, and out-of-scope boundaries.
2. **Review & RFC**: Engineering and Design review feasibility, data models, and edge cases.
3. **Approved**: Committed with explicit sign-off in the frontmatter.
4. **Shipped / Deprecated**: Status updated, changelog link recorded.

---

## 3. Architecture Decision Records (ADRs)

Engineering decisions that impact system resilience, data storage, or developer workflows must be memorialized as ADRs in `product/specs/` using the Nygard format:
- **Title**: Numbered sequence (e.g., `ADR-001-hybrid-state-management.md`)
- **Status**: Proposed / Accepted / Rejected / Superseded
- **Context**: The business/technical problem forcing a decision
- **Decision**: The selected architecture or library and rationale
- **Consequences**: Positive tradeoffs and accepted liabilities

---

## 4. Release Communication Playbook

Every production release coordinates three stakeholder layers:
1. **Engineering Changelog**: Detailed commit-level changes, bug fixes, breaking API changes.
2. **Customer Release Notes**: Value-focused highlights, screenshot walkthroughs, upgrade guides.
3. **Internal GTM Enablement**: Notifying Sales and CS on how to position new capabilities and updating relevant battlecards.
