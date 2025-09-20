import { createElement } from '../utils/dom.js';
import { ensureObject, sanitizeText } from '../utils/sanitize.js';

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-fallback'] });
  const title = sanitizeText(payload.title || '構造化サマリー');
  const raw = sanitizeText(payload.raw || JSON.stringify(payload, null, 2));
  wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  wrap.appendChild(createElement('pre', { className: 'rvi-fallback-pre', text: raw }));
  return wrap;
}
