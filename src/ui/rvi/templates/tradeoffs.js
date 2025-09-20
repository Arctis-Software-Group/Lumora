import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizeOptions(payload) {
  const source = payload.options || payload.tradeoffs || payload.choices || payload.items || [];
  return ensureArray(source).map((item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      return { title: sanitizeText(item), gains: [], costs: [], note: '' };
    }
    if (Array.isArray(item)) {
      const [title, gains, costs] = item;
      return {
        title: sanitizeText(title),
        gains: ensureArray(gains).map((gain) => sanitizeText(gain)),
        costs: ensureArray(costs).map((cost) => sanitizeText(cost)),
        note: ''
      };
    }
    const obj = ensureObject(item);
    return {
      title: sanitizeText(obj.title || obj.option || obj.name || ''),
      gains: ensureArray(obj.pros || obj.gains || obj.benefits).map((gain) => sanitizeText(gain)),
      costs: ensureArray(obj.cons || obj.costs || obj.risks).map((cost) => sanitizeText(cost)),
      note: sanitizeText(obj.note || obj.detail || obj.summary || '')
    };
  }).filter((item) => item.title || item.gains.length || item.costs.length || item.note);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-tradeoffs'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const options = normalizeOptions(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!options.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: 'トレードオフ情報がありません。' }));
    return wrap;
  }

  const list = createElement('ul', { className: 'rvi-tradeoffs-list' });
  options.forEach((option) => {
    const item = createElement('li', { className: 'rvi-tradeoff-item' });
    if (option.title) {
      item.appendChild(createElement('h4', { className: 'rvi-tradeoff-title', text: option.title }));
    }
    if (option.note) {
      item.appendChild(createElement('p', { className: 'rvi-tradeoff-note', text: option.note }));
    }
    if (option.gains.length) {
      const gainsTitle = createElement('div', { className: 'rvi-tradeoff-section gains', text: '得られるもの' });
      const gainsList = createElement('ul', { className: 'rvi-tradeoff-gains' });
      option.gains.forEach((gain) => gainsList.appendChild(createElement('li', { text: gain })));
      item.appendChild(gainsTitle);
      item.appendChild(gainsList);
    }
    if (option.costs.length) {
      const costsTitle = createElement('div', { className: 'rvi-tradeoff-section costs', text: '失うもの / リスク' });
      const costsList = createElement('ul', { className: 'rvi-tradeoff-costs' });
      option.costs.forEach((cost) => costsList.appendChild(createElement('li', { text: cost })));
      item.appendChild(costsTitle);
      item.appendChild(costsList);
    }
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}
