# 0002. Single schema validation via ajv in src/core

- Status: Accepted
- Date: 2026-10-16

## Context

Schema validation existed in several hand-written variants (CLI doctor, MCP capture, a test helper), each supporting a different subset of JSON Schema keywords. They drifted from `schemas/*.schema.json` (for example, `minLength` on `suggestedNextStep` was not enforced by MCP).

## Decision

- `src/core/schema-validator.js` is the only runtime validator: ajv (Draft 2020-12) + ajv-formats, schemas compiled lazily and cached, errors normalized to short dotted-path messages.
- CLI doctor, MCP `brain_capture_objection`, and tests all call `validateAgainstSchema(name, data)`.
- Governance guards in `tools/` (e.g. `check_schema_usage.js`) intentionally keep their own minimal, built-ins-only validator so they run in any repository without `npm install`.

## Consequences

- Runtime behavior matches the published schemas exactly; adding a keyword to a schema needs no code change.
- ajv and ajv-formats become runtime dependencies.
- Two validators exist by design (runtime vs. guard). The guard covers only the keywords our schemas use; if schemas adopt new keywords, the guard must be extended.
