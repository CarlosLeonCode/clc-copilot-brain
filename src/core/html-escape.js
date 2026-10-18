// One HTML escaper for every generated page: text from brain files never reaches HTML unescaped.
const HTML_ESCAPES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' });

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}
