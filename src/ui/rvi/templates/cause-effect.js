import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizePairs(payload) {
  const source = payload.pairs || payload.links || payload.flows || payload.items || [];
  return ensureArray(source).map((item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      const arrowIndex = item.indexOf('->');
      if (arrowIndex >= 0) {
        const cause = sanitizeText(item.slice(0, arrowIndex));
        const effect = sanitizeText(item.slice(arrowIndex + 2));
        return { cause, effect, note: '' };
      }
      return { cause: sanitizeText(item), effect: '', note: '' };
    }
    if (Array.isArray(item)) {
      const [cause, effect, note] = item;
      return { cause: sanitizeText(cause), effect: sanitizeText(effect), note: sanitizeText(note) };
    }
    const obj = ensureObject(item);
    return {
      cause: sanitizeText(obj.cause || obj.input || obj.source || ''),
      effect: sanitizeText(obj.effect || obj.output || obj.result || ''),
      note: sanitizeText(obj.note || obj.explanation || obj.impact || ''),
      strength: sanitizeText(obj.strength || obj.weight || obj.confidence || '')
    };
  }).filter((pair) => pair.cause || pair.effect || pair.note);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-cause-effect'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const pairs = normalizePairs(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!pairs.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: '因果関係の情報が見つかりませんでした。' }));
    return wrap;
  }

  const list = createElement('ul', { className: 'rvi-cause-effect-list' });
  pairs.forEach((pair) => {
    const item = createElement('li', { className: 'rvi-cause-effect-item' });
    const cause = createElement('div', { className: 'rvi-cause', text: pair.cause || 'Cause' });
    const arrow = createElement('div', { className: 'rvi-arrow', text: '→' });
    const effect = createElement('div', { className: 'rvi-effect', text: pair.effect || 'Effect' });
    item.appendChild(cause);
    item.appendChild(arrow);
    item.appendChild(effect);
    if (pair.strength) {
      item.appendChild(createElement('span', { className: 'rvi-strength', text: pair.strength }));
    }
    if (pair.note) {
      item.appendChild(createElement('p', { className: 'rvi-cause-effect-note', text: pair.note }));
    }
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}
