# 0010. Generated pages use precompiled Tailwind CSS, inlined

- Status: Accepted
- Date: 2026-10-22
- Amends: [0008](./0008-sales-scripts-and-glossary.md) and [0009](./0009-live-script-assistant.md) (how pages are styled; their offline and script rules are unchanged)

## Context

The sales page, script pages and draft previews were styled with hand-written CSS strings spread over four modules (`STYLE` in `sales-view.js`, `DASHBOARD_CSS`, `FLOWCHART_CSS`, `SCRIPT_CSS`), with two copies of the palette and class names that only those strings knew. Every visual change meant editing selectors by hand, and nothing checked that a class in the markup had a rule. We want one design vocabulary (Tailwind) without giving up what matters for these pages: they open from disk, offline, with nothing installed beyond `clc-brain`.

## Decision

- **Tailwind utilities in the markup, CSS compiled at release time.** Renderers write Tailwind classes. `npm run build:css` (`tools/build-css.js`) runs the Tailwind v4 CLI on `src/core/styles/brain.css`, which scans only the renderer modules (`@source`), and writes the minified CSS to `src/core/styles/compiled.js` (`PAGE_CSS`). That file is checked in and shipped; each page inlines it in its one `<style>` tag.
- **Build-time only.** `tailwindcss` and `@tailwindcss/cli` are exact-pinned devDependencies. Nothing in `src/` imports them, installs never run them, and pages never reference a CDN, `<link>` or URL. The build rejects CSS with a URL, `url(`, `@import`, a style tag or an HTML comment, and drops the URL from Tailwind's license banner.
- **One theme, no preflight.** `@theme` holds the shared tokens (one palette for both page kinds, dark values under `prefers-color-scheme: dark`). Tailwind's preflight is left out because the pages render markdown as bare elements that rely on browser defaults; a tiny base layer keeps `box-sizing` and `[hidden]`. The inline SVG diagrams keep their eight `fc-*` classes in `@layer components`, since SVG paint is not a utility concern.
- **Classes are literal and checked.** Class lists live as whole string literals in `@source` files (`page-classes.js`, the tables in `script-view.js`). State uses attributes and variants (`aria-pressed:`, `in-data-current:`, `in-data-past:`) instead of marker classes, and the live assistant receives its class lists as data. Semantic hooks are `data-*` attributes, so tests no longer depend on styling class names.
- **Guards.** `tests/page-css.test.js` renders representative en/es pages and fails when any class token has no compiled rule, when an input changed without a rebuild (sha256 of the Tailwind version and every input, stored in `compiled.js`), when a rebuild with the installed CLI differs from the shipped CSS, or when the CSS could reach the network. The existing offline guards are unchanged: the sales page has no script, script pages exactly one inline script.

## Consequences

- Styling changes are class edits next to the markup, and an unknown or misspelled class fails CI instead of silently rendering unstyled.
- Contributors who change a renderer's classes must run `npm run build:css` and commit `compiled.js`; CI tells them when they forget.
- Pages are larger: the shared CSS (about 18 KB) is inlined in every page and class lists repeat per element, most visibly in the script page's embedded assistant data. They remain single offline files.
- `@tailwindcss/cli` brings a dev-only dependency chain (`@parcel/watcher`) that `npm audit` currently flags; it never ships to users.
- Rejected: the Tailwind Play CDN (needs the network and runs a compiler in the page), a runtime Tailwind dependency (heavier installs, compiling on users' machines), a separate CSS file next to each page (more files, a `<link>`), and `@apply`-based semantic classes (keeps the hand-written vocabulary we wanted to drop).

## Addendum: design base of script pages

The first real users preferred their hand-made live script pages (Tailwind 3, Inter, slate ink, blue brand) to the generated ones. Script pages now reproduce that base style and its elements from the same markdown grammar, with no new keys:

| Hand-made element | Generated from |
| :--- | :--- |
| Sticky nav: brand, live/diagram switch, conversation links | company and script `title`, conversations |
| Top bar with flow tabs, Undo, Restart (sidebar from 1200px) | conversations |
| Kicker, title, "Goal: **…**" subtitle | conversation number, `##` heading, `goal:` |
| Card with a coloured top stripe | `tone:` (`yes`, `no`, `action`, `follow`) |
| Small uppercase step/tag label | `###` step title, or a `tag:` that already names it |
| Words to say behind a blue bar ("🗣️ Script" live) | `say:` |
| Script lines, smaller bold-condition lines | `detail:` (`**If …:**` prefix) |
| Amber "What to do" box | `tip:` |
| Violet advice box | `coach:`; `note:` and rules close the conversation |
| Answer pills, lanes, pair, close-row | `####` answers (unchanged layouts) |
| Numbered answer buttons, keys 1-9, Backspace | answers of the step in progress |
| "↳ Client answered" chip on the next card, green end banner | the picked answer, `next: end` / last step |

Tokens move to that palette (`ink` slate, `accent` #356ae6, emerald/rose/amber stripes, amber `tip*`, violet `coach*`) with dark values kept, and the sales page shares them. The hand-made page's call summary panel (JSON copy for call logging) is not part of the base and stays out.
