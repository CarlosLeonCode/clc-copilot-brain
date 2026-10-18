// Text for people in the brain's language. Pure: dictionaries plus Intl formatting, no I/O.
// Values may be a string or { one, other } (picked by vars.count); `{name}` placeholders are filled from vars.
import { DEFAULT_LANGUAGE } from './brain-language.js';

const en = {
  'count.calls': { one: '{count} call', other: '{count} calls' },
  'view.pipeline.title': 'Your pipeline',
  'view.updated': 'Updated {date}'
};

const es = {
  'count.calls': { one: '{count} llamada', other: '{count} llamadas' },
  'view.pipeline.title': 'Tu proceso de venta',
  'view.updated': 'Actualizado el {date}'
};

export const DICTIONARIES = Object.freeze({ en, es });

const LOCALES = Object.freeze({ en: 'en-US', es: 'es' });
const localeOf = (lang) => LOCALES[lang] ?? LOCALES[DEFAULT_LANGUAGE];

function pick(value, lang, count) {
  if (value == null || typeof value === 'string') return value;
  const form = typeof count === 'number' ? new Intl.PluralRules(localeOf(lang)).select(count) : 'other';
  return value[form] ?? value.other;
}

/** Text for `key` in `lang`; falls back to English, then to the key itself. */
export function t(lang, key, vars = {}, dictionaries = DICTIONARIES) {
  const own = dictionaries[lang]?.[key];
  const chosenLang = own == null ? DEFAULT_LANGUAGE : lang;
  const raw = pick(own ?? dictionaries[DEFAULT_LANGUAGE]?.[key], chosenLang, vars.count);
  if (raw == null) return key;
  return raw.replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
}

/** "2026-10" -> "October 2026" / "Octubre de 2026". */
export function formatMonth(lang, month) {
  const [year, monthNumber] = String(month).split('-').map(Number);
  const text = new Intl.DateTimeFormat(localeOf(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 0.834 -> "83%" (whole numbers, written the way the language writes percentages). */
export function formatPercent(lang, value) {
  return new Intl.NumberFormat(localeOf(lang), { style: 'percent', maximumFractionDigits: 0 }).format(value);
}
