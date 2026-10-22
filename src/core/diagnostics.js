// Problems found by the script, glossary and call guide parsers: { level, line, code, vars, message }.
// `message` is always English (tools, MCP, --json); people read diagnosticText in their language.
import { hasText, t } from './i18n.js';

/** Build a diagnostic whose English message comes from the `diag.<code>` text. */
export function makeDiagnostic(level, line, code, vars = {}) {
  return { level, line, code, vars, message: t('en', `diag.${code}`, vars) };
}

/** A diagnostic (or play problem) worded in `lang`; its English message when it has no code or no translation. */
export function diagnosticText(lang, diagnostic) {
  const key = `diag.${diagnostic?.code}`;
  return diagnostic?.code && hasText(lang, key) ? t(lang, key, diagnostic.vars ?? {}) : diagnostic?.message ?? '';
}
