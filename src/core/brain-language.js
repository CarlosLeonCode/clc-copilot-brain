// The brain's language (org-kernel.json `language`): "en" or "es", English when missing or invalid.
import fs from 'node:fs';
import path from 'node:path';

export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'es']);
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_HELP = 'The language must be "en" (English) or "es" (Spanish), for example: --language es';

/** "en" or "es" (case and spaces ignored), else null. */
export function parseLanguage(value) {
  if (typeof value !== 'string') return null;
  const lower = value.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lower) ? lower : null;
}

/** Language of the computer from LC_ALL, then LANG: Spanish locales give "es", anything else "en". */
export function detectLanguage(env = {}) {
  const locale = String(env.LC_ALL || env.LANG || '').toLowerCase();
  return /^es(?:[_.@-]|$)/.test(locale) ? 'es' : DEFAULT_LANGUAGE;
}

/** Language stored in the brain's org-kernel.json; English when the file or field is missing or invalid. */
export function getBrainLanguage(rootDir) {
  try {
    const kernel = JSON.parse(fs.readFileSync(path.join(rootDir, 'org-kernel.json'), 'utf8'));
    return parseLanguage(kernel?.language) ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}
