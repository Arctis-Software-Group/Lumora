import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizeOptions(payload) {
  const source = payload.options || payload.alternatives || payload.choices || payload.items || [];
  return ensureArray(source).map((item) => {
    if (typeof item === 'string') {
      return {
        title: sanitizeText(item),
        summary: '',
        pros: [],
        cons: [],
        attributes: []
      };
    }
    if (Array.isArray(item)) {
      const [title, summary] = item;
      return {
        title: sanitizeText(title),
        summary: sanitizeText(summary),
        pros: [],
        cons: [],
        attributes: []
      };
    }
    const obj = ensureObject(item);
    const title = sanitizeText(obj.title || obj.name || obj.label || '');
    const summary = sanitizeText(obj.summary || obj.subtitle || obj.description || '');
    const pros = ensureArray(obj.pros || obj.advantages || obj.strengths);
    const cons = ensureArray(obj.cons || obj.disadvantages || obj.risks);
    const metrics = ensureObject(obj.metrics || obj.attributes || obj.values || {});
    const attributes = Object.entries(metrics).map(([key, val]) => ({
      key: sanitizeText(key),
      value: sanitizeText(val)
    }));
    const badge = sanitizeText(obj.badge || obj.score || obj.rank || '');
    return { title, summary, pros, cons, attributes, badge };
  }).filter((item) => item.title || item.summary || item.attributes?.length);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-comparison'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || payload.comparator || '');
  const criteria = ensureArray(payload.criteria || payload.dimensions || payload.factors).map((crit) => sanitizeText(crit));
  const options = normalizeOptions(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));
  if (criteria.length) {
    const critList = createElement('ul', { className: 'rvi-comparison-criteria' });
    criteria.forEach((criterion) => {
      critList.appendChild(createElement('li', { text: criterion }));
    });
    wrap.appendChild(critList);
  }

  if (!options.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: '比較できる選択肢が見つかりませんでした。' }));
    return wrap;
  }

  const grid = createElement('div', { className: 'rvi-comparison-grid' });
  options.forEach((option) => {
    const card = createElement('div', { className: 'rvi-comparison-item' });
    if (option.badge) {
      card.appendChild(createElement('div', { className: 'rvi-comparison-badge', text: option.badge }));
    }
    if (option.title) {
      card.appendChild(createElement('h4', { className: 'rvi-comparison-title', text: option.title }));
    }
    if (option.summary) {
      card.appendChild(createElement('p', { className: 'rvi-comparison-summary', text: option.summary }));
    }
    if (option.attributes?.length) {
      const list = createElement('dl', { className: 'rvi-comparison-attributes' });
      option.attributes.forEach((attr) => {
        if (!attr.key && !attr.value) return;
        list.appendChild(createElement('dt', { text: attr.key }));
        list.appendChild(createElement('dd', { text: attr.value }));
      });
      card.appendChild(list);
    }
    if (option.pros?.length) {
      const prosList = createElement('ul', { className: 'rvi-comparison-list pros' });
      option.pros.forEach((pro) => {
        prosList.appendChild(createElement('li', { text: sanitizeText(pro) }));
      });
      card.appendChild(createElement('div', { className: 'rvi-comparison-section pros', text: 'メリット' }));
      card.appendChild(prosList);
    }
    if (option.cons?.length) {
      const consList = createElement('ul', { className: 'rvi-comparison-list cons' });
      option.cons.forEach((con) => {
        consList.appendChild(createElement('li', { text: sanitizeText(con) }));
      });
      card.appendChild(createElement('div', { className: 'rvi-comparison-section cons', text: '懸念点' }));
      card.appendChild(consList);
    }
    grid.appendChild(card);
  });

  wrap.appendChild(grid);
  return wrap;
}
