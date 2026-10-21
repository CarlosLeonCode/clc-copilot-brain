# 0008. Sales scripts and glossary: a method, not content

- Status: Accepted
- Date: 2026-10-21

## Context

The brain shipped two English starter scripts (a cold email and a discovery framework) that had nothing to do with most teams, and no format for scripts at all. People brought their own scripts (often for a specific industry) and the assistant had no shared way to structure, preview or link them. A terms glossary had no home either.

## Decision

- **Method, not content.** The package ships no script, glossary or industry content. It ships the method: a `script` skill (`.agents/skills/script/SKILL.md`, command `/script`), AGENTS intents, an empty "Scripts, glossary and industry packs" section in `sales/system.md`, and `sales/scripts/README.md`. The assistant asks one question at a time, drafts, previews with `clc-brain view --draft`, and saves only after a yes. The two starters are removed from the templates.
- **Markdown source, generated HTML.** A script is `sales/scripts/<slug>.md` in a small markdown grammar (frontmatter plus heading levels: `##` conversation, `###` step, `####` answer; keys `play:`, `goal:`, `note:`, `branch:`, `tag:`, `say:`, `detail:`, `tip:`, `tone:`, `when:`, `next:`). `clc-brain view` renders it to `sales/scripts/<slug>.html`, one offline page per script with no scripts and no network. The grammar is parsed without dependencies and never throws: problems become diagnostics.
- **Generator marker.** Generated pages carry `<meta name="generator" content="clc-brain">`. A page without it (made by hand) is never overwritten, and a script with errors gets no page.
- **Stable English names.** File names, slugs and anchors are English and stable (`<play>-<branch>` for steps, a slug of the title for conversations), so links from play Guion cells (`../scripts/<slug>.html#<anchor>`) survive translation. Visible text follows the brain language.
- **Glossary as a page section.** `sales/glossary.md` (`## group` sections with a term, meaning, example table) is rendered as the Glossary section of the sales page, not as a separate page. `./glossary.md` links on the page become `#glossary`.
- **Legacy handling.** Existing brains keep the old starters. `doctor` recognises them by sha256 of every version this package ever shipped (`LEGACY_STARTER_SCRIPT_HASHES`), warns only, and never flags an edited copy. The assistant removes them, and fixes the links that pointed to them, only after the person says yes. `upgrade` never touches `sales/scripts/`.
- **Doctor.** `checkSalesLibrary` adds warnings only: script diagnostics, a play or branch that does not exist, an unresolved `next:`, a script or glossary not linked from `system.md`, a Guion link to a missing file or anchor, a page that is missing or older than its script, a malformed glossary, and legacy starters. A fresh brain, English or Spanish, stays at zero warnings.

## Consequences

- Teams get scripts for any industry without the package carrying industry opinions; the quality bar is the skill and the validator, not shipped text.
- Older brains are updated lazily: `upgrade` adds the skill and refreshed AGENTS rules, and the skill adds the missing `system.md` section on the first save.
- The grammar is a contract: new keys need a parser, renderer and TECHNICAL.md update together. Unknown lines are warnings, so extensions degrade gracefully.
- Hand-made pages stay safe, at the cost that a person must delete one to let `view` generate its replacement.
- Rejected: embedding scripts inside play files, hand-written HTML as the source, a separate glossary page, shipping industry packs, and deleting the old starters automatically.
