// Text for people in the brain's language. Pure: dictionaries plus Intl formatting, no I/O.
// Values may be a string or { one, other } (picked by vars.count); `{name}` placeholders are filled from vars.

export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'es']);
export const DEFAULT_LANGUAGE = 'en';

const en = {
  // counts
  'count.calls': { one: '{count} call', other: '{count} calls' },
  'count.times': { one: '{count} time', other: '{count} times' },
  'count.records': { one: '{count} record', other: '{count} records' },
  'count.callsOrDeals': { one: '{count} call or deal', other: '{count} calls or deals' },
  'rate.calls': '{count} of {of} calls',
  'rate.deals': '{count} of {of} deals',
  'rate.withPercent': '{base} ({percent})',
  'rate.tooEarly': '{base} ({percent}, too early to tell)',
  // default types of sale
  'motion.cold-outbound': 'Cold outreach',
  'motion.inbound': 'Inbound',
  'motion.referral': 'Referral',
  'motion.expansion': 'Existing customers',
  'motion.partner': 'Partner',
  // labels computed with the numbers
  'metrics.unclassified': 'Not classified yet',
  'metrics.noBranch': 'No branch recorded',
  'metrics.unknownBranch': 'A situation not in the call guide',
  'metrics.noRep': 'Not recorded',
  'metrics.noPlay': 'Not tied to a call guide',
  'metrics.step': 'Step {number}',
  // page
  'view.companyFallback': 'Your company',
  'view.title': '{company} · Sales system',
  'view.previewSuffix': ' (Preview)',
  'view.updated': 'Updated {date}',
  'view.previewNote': 'This is a preview. Parts marked as drafts are not saved yet.',
  'view.navLabel': 'Call guides',
  'view.system.title': 'How your sales system works',
  'view.pipeline.title': 'Your pipeline',
  'view.pipeline.empty': 'No pipeline diagram yet. Ask your assistant to draw one.',
  'view.guides.title': 'Your call guides',
  'view.footer': 'Want a change? Ask your assistant, for example: "Improve the cold call guide".',
  'view.draftBadge': 'Draft — not saved yet',
  'play.usedIn': 'Used in:',
  'play.goal': 'Goal:',
  'play.version': 'Version {version}',
  'play.whatToSay': 'What to say',
  'play.learned': "What we've learned",
  'play.treeTitle': '{title}: decision tree',
  'diagram.if': 'If {label}',
  'diagram.then': 'Then',
  'diagram.stepsNote': 'This diagram could not be drawn, so here are its steps. Ask your assistant to fix the diagram.',
  'diagram.cannotDraw': 'This diagram could not be drawn. Ask your assistant to fix it.',
  // "How it's going"
  'dash.title': "How it's going",
  'dash.soFar': '{month} (so far)',
  'dash.noCalls': 'No calls logged yet.',
  'dash.callsLogged': 'Calls logged',
  'dash.goalReached': 'Goal reached',
  'dash.goalReachedValue': 'Goal reached: {value}',
  'dash.notRecorded': 'not recorded yet',
  'dash.movedNext': 'Moved to the next step',
  'dash.leftOutNote': { one: '{count} call without a goal result is left out of the goal numbers.', other: '{count} calls without a goal result are left out of the goal numbers.' },
  'dash.byMotion': 'By type of sale',
  'dash.byPlay': 'By call guide',
  'dash.byRep': 'By person',
  'dash.dealsWon': 'Deals won: {value}',
  'dash.misses': 'Where calls miss their goal',
  'dash.successMeans': 'Success means: {text}',
  'dash.successUndefined': 'Success not defined yet',
  'dash.successGoalIs': ' (the goal is: {text})',
  'dash.journeys': 'How deals start',
  'dash.startsAt': 'Starts at {name}. ',
  'dash.guides': 'Call guides: {list}.',
  'notes.unclassified': 'Not classified yet: {records}. Ask your assistant to classify your older calls.',
  'notes.sample': 'Sample records are left out of these numbers.',
  'notes.skipped': { one: '{count} record could not be read and was left out.', other: '{count} records could not be read and were left out.' },
  'compare.tooEarly': 'Comparison with the month before: too early to tell (it needs at least 10 calls in both months).',
  'compare.with': 'Compared with {month}: {parts}.',
  'compare.more': { one: '{count} call more', other: '{count} calls more' },
  'compare.fewer': { one: '{count} call fewer', other: '{count} calls fewer' },
  'compare.points': '{sign}{count} points',
  'compare.goal': 'goal reached {points}',
  'compare.moved': 'moved to the next step {points}',
  // `clc-brain stats` text
  'report.leftOut': { one: '({count} call without a goal result is left out)', other: '({count} calls without a goal result are left out)' },
  'report.goalReached': 'goal reached {value}',
  'report.dealsWon': 'deals won {won} of {total}',
  'report.successUndefined': '(success is not defined for this guide yet)',
  'report.missed': 'Goal missed {times} when: {when}',
  'report.unclassified': 'Not classified yet: {records}. Ask your assistant to classify your older calls and deals by type of sale.',
  'report.sample': 'Sample records are left out of these numbers ({count}).'
};

const es = {
  'count.calls': { one: '{count} llamada', other: '{count} llamadas' },
  'count.times': { one: '{count} vez', other: '{count} veces' },
  'count.records': { one: '{count} registro', other: '{count} registros' },
  'count.callsOrDeals': { one: '{count} llamada o negocio', other: '{count} llamadas o negocios' },
  'rate.calls': '{count} de {of} llamadas',
  'rate.deals': '{count} de {of} negocios',
  'rate.withPercent': '{base} ({percent})',
  'rate.tooEarly': '{base} ({percent}, todavía es pronto para sacar conclusiones)',
  'motion.cold-outbound': 'Venta en frío',
  'motion.inbound': 'Inbound',
  'motion.referral': 'Referidos',
  'motion.expansion': 'Clientes actuales',
  'motion.partner': 'Socios',
  'metrics.unclassified': 'Sin clasificar todavía',
  'metrics.noBranch': 'Situación sin registrar',
  'metrics.unknownBranch': 'Una situación que no está en la guía de llamada',
  'metrics.noRep': 'Sin registrar',
  'metrics.noPlay': 'Sin guía de llamada',
  'metrics.step': 'Paso {number}',
  'view.companyFallback': 'Tu empresa',
  'view.title': '{company} · Sistema de ventas',
  'view.previewSuffix': ' (Vista previa)',
  'view.updated': 'Actualizado el {date}',
  'view.previewNote': 'Esta es una vista previa. Las partes marcadas como borrador todavía no se guardaron.',
  'view.navLabel': 'Guías de llamada',
  'view.system.title': 'Cómo funciona tu sistema de ventas',
  'view.pipeline.title': 'Tu proceso de venta',
  'view.pipeline.empty': 'Todavía no hay un diagrama del proceso de venta. Pide a tu asistente que lo dibuje.',
  'view.guides.title': 'Tus guías de llamada',
  'view.footer': '¿Quieres cambiar algo? Pide a tu asistente, por ejemplo: "Mejora la guía de llamada en frío".',
  'view.draftBadge': 'Borrador: todavía no se guardó',
  'play.usedIn': 'Se usa en:',
  'play.goal': 'Objetivo:',
  'play.version': 'Versión {version}',
  'play.whatToSay': 'Qué decir',
  'play.learned': 'Lo que aprendimos',
  'play.treeTitle': '{title}: árbol de decisiones',
  'diagram.if': 'Si {label}',
  'diagram.then': 'Luego',
  'diagram.stepsNote': 'Este diagrama no se pudo dibujar, así que aquí están sus pasos. Pide a tu asistente que corrija el diagrama.',
  'diagram.cannotDraw': 'Este diagrama no se pudo dibujar. Pide a tu asistente que lo corrija.',
  'dash.title': 'Cómo vamos',
  'dash.soFar': '{month} (en lo que va del mes)',
  'dash.noCalls': 'Todavía no hay llamadas registradas.',
  'dash.callsLogged': 'Llamadas registradas',
  'dash.goalReached': 'Objetivo cumplido',
  'dash.goalReachedValue': 'Objetivo cumplido: {value}',
  'dash.notRecorded': 'todavía sin registrar',
  'dash.movedNext': 'Avanzaron al siguiente paso',
  'dash.leftOutNote': { one: '{count} llamada sin resultado del objetivo queda fuera de las cifras del objetivo.', other: '{count} llamadas sin resultado del objetivo quedan fuera de las cifras del objetivo.' },
  'dash.byMotion': 'Por tipo de venta',
  'dash.byPlay': 'Por guía de llamada',
  'dash.byRep': 'Por persona',
  'dash.dealsWon': 'Negocios ganados: {value}',
  'dash.misses': 'Dónde no se cumple el objetivo',
  'dash.successMeans': 'Éxito significa: {text}',
  'dash.successUndefined': 'Éxito sin definir todavía',
  'dash.successGoalIs': ' (el objetivo es: {text})',
  'dash.journeys': 'Cómo empiezan los negocios',
  'dash.startsAt': 'Empieza en {name}. ',
  'dash.guides': 'Guías de llamada: {list}.',
  'notes.unclassified': 'Sin clasificar todavía: {records}. Pide a tu asistente que clasifique tus llamadas anteriores.',
  'notes.sample': 'Los registros de ejemplo quedan fuera de estas cifras.',
  'notes.skipped': { one: '{count} registro no se pudo leer y quedó fuera.', other: '{count} registros no se pudieron leer y quedaron fuera.' },
  'compare.tooEarly': 'Comparación con el mes anterior: todavía es pronto para sacar conclusiones (se necesitan al menos 10 llamadas en ambos meses).',
  'compare.with': 'Comparado con {month}: {parts}.',
  'compare.more': { one: '{count} llamada más', other: '{count} llamadas más' },
  'compare.fewer': { one: '{count} llamada menos', other: '{count} llamadas menos' },
  'compare.points': '{sign}{count} puntos',
  'compare.goal': 'objetivo cumplido {points}',
  'compare.moved': 'avance al siguiente paso {points}',
  'report.leftOut': { one: '({count} llamada sin resultado del objetivo queda fuera)', other: '({count} llamadas sin resultado del objetivo quedan fuera)' },
  'report.goalReached': 'objetivo cumplido {value}',
  'report.dealsWon': 'negocios ganados {won} de {total}',
  'report.successUndefined': '(el éxito de esta guía todavía no está definido)',
  'report.missed': 'Objetivo no cumplido {times} cuando: {when}',
  'report.unclassified': 'Sin clasificar todavía: {records}. Pide a tu asistente que clasifique tus llamadas y negocios anteriores por tipo de venta.',
  'report.sample': 'Los registros de ejemplo quedan fuera de estas cifras ({count}).'
};

export const DICTIONARIES = Object.freeze({ en, es });

const LOCALES = Object.freeze({ en: 'en-US', es: 'es' });
const localeOf = (lang) => LOCALES[lang] ?? LOCALES[DEFAULT_LANGUAGE];

function pick(value, lang, count) {
  if (value == null || typeof value === 'string') return value;
  const form = typeof count === 'number' ? new Intl.PluralRules(localeOf(lang)).select(count) : 'other';
  return value[form] ?? value.other;
}

const lookup = (dictionaries, lang, key) => {
  const dict = Object.hasOwn(dictionaries, lang) ? dictionaries[lang] : undefined;
  return dict && Object.hasOwn(dict, key) ? dict[key] : undefined;
};

/** True when `key` has a text in `lang` or in English. */
export function hasText(lang, key, dictionaries = DICTIONARIES) {
  return lookup(dictionaries, lang, key) != null || lookup(dictionaries, DEFAULT_LANGUAGE, key) != null;
}

/** Text for `key` in `lang`; falls back to English, then to the key itself. */
export function t(lang, key, vars = {}, dictionaries = DICTIONARIES) {
  const own = lookup(dictionaries, lang, key);
  const chosenLang = own == null ? DEFAULT_LANGUAGE : lang;
  const raw = pick(own ?? lookup(dictionaries, DEFAULT_LANGUAGE, key), chosenLang, vars.count);
  if (raw == null) return key;
  return raw.replace(/\{(\w+)\}/g, (whole, name) => (Object.hasOwn(vars, name) ? String(vars[name]) : whole));
}

/** "2026-10" -> "October 2026" / "Octubre de 2026"; `{ capitalize: false }` keeps "octubre de 2026" for mid-sentence use. */
export function formatMonth(lang, month, { capitalize = true } = {}) {
  const [year, monthNumber] = String(month).split('-').map(Number);
  const text = new Intl.DateTimeFormat(localeOf(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** 0.834 -> "83%" (whole numbers, written the way the language writes percentages). */
export function formatPercent(lang, value) {
  return new Intl.NumberFormat(localeOf(lang), { style: 'percent', maximumFractionDigits: 0 }).format(value);
}
