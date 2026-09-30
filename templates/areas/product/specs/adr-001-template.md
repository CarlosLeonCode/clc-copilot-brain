# ADR-001: Architecture Decision Record Template

> **Status:** Accepted  
> **Deciders:** Engineering Lead, Systems Architect, Product Lead  
> **Date:** 2026-09-30  
> **Supersedes:** N/A

---

## 1. Context & Problem Statement
Modern development teams use disparate AI tools (Cursor, Windsurf, Claude Code, Gemini). Creating separate, diverging instruction files leads to fragmentation and conflicting agent behaviors. We need a single architectural approach to anchor AI context without duplicating files.

---

## 2. Decision
We adopt the **Universal AGENTS.md Single Source of Truth (SSOT)** pattern:
- The root `AGENTS.md` is the canonical reference.
- Tool-specific adapter files (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`) are maintained as relative symbolic links pointing to `AGENTS.md` (or clean adapter files that import it).
- Local CLI tooling validates symlink health via `copilot-brain doctor`.

---

## 3. Considered Options
1. **Multiple independent config files**: High risk of drift and stale rules.
2. **Dynamic pre-commit generation**: Fragile, extra build steps required.
3. **Symbolic Links / Canonical Adapter files**: Simple, zero runtime overhead, instant propagation across all IDEs.

---

## 4. Consequences & Trade-offs
- **Positive**: One edit in `AGENTS.md` immediately updates all copilot contexts.
- **Negative**: Windows environments without developer symlink permissions require file-based adapter fallbacks, which the CLI doctor handles transparently.
