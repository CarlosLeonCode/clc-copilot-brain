# 0009. Script pages open as a live call assistant (one inline script)

- Status: Accepted
- Date: 2026-10-22
- Amends: [0008](./0008-sales-scripts-and-glossary.md) ("one offline page per script with no scripts")

## Context

ADR 0008 made every script page a static diagram with no scripts. That reads well before a call, but during a live call the rep has to find the right branch on a long page while the customer is talking. Hand-made pages that people already use show the better pattern: one step at a time, the customer's possible answers as buttons, and each click shows what to say next. We want that behavior generated from the same markdown, without losing the offline and escaping guarantees.

## Decision

- **Two views, one page.** `renderScriptPage` writes the live assistant (default) and the full diagram (the existing static render) into the same page, with toggle buttons. The assistant markup ships `hidden`; the script reveals it. Without JavaScript the page is exactly the old diagram (progressive enhancement).
- **Same grammar.** Conversation = tab, step = card, buyer answer = button (`when:` as a hint). The answer's own cards are what to say back, shown after "Client answered". `next:` may jump to another conversation. An answer without `say:` is a valid routing option. New optional key `coach:` (steps and answers) adds a call-tip box to both views. Where an option leads (answer `next:`, then step `next:`, then the step below, then the end) is computed at build time by `buildAssistant`, so the page script holds no grammar logic.
- **Exactly one inline script, offline.** Script pages may contain one `<script>` with no `src`. It uses no network (no fetch, XMLHttpRequest, WebSocket, beacons), no `eval` or `new Function`, no storage. Its data is JSON embedded in that script; every text in it is HTML already escaped by the same renderer as the diagram, and `<`, `>`, U+2028 and U+2029 are written as `\u` escapes, so the data can never close the script or open a comment. The script inserts that escaped HTML with `innerHTML` and its own labels with `textContent`. No inline event attributes.
- **The sales page stays script-free.** `sales-system.html` keeps no script at all; only script pages get the assistant.
- **Accessible by default.** All controls are `<button type="button">`, the chosen option is `aria-pressed`, the stream is `aria-live="polite"`, and focus moves to the newly shown card.

## Consequences

- Reps get a live assistant from any script with no extra authoring; the diagram is one click away and is what prints or shows without JavaScript.
- The offline guard changes from "no script" to "exactly one inline script without src and no network APIs" for script pages (`tests/core/script-view.test.js`), while the sales page guard stays "no script".
- The page script is a fixed string owned by the package; brain text only ever reaches it as escaped data, so a hostile script file can still not run code.
- Rejected: a separate assistant page per script (two files to keep in sync), shipping a JS file next to the page (more files, `src` attribute), a JSON `<script type="application/json">` block (a second script tag), and rendering markup on the client from raw text.
