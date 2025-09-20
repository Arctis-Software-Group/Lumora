import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizeSteps(payload) {
  const source = payload.steps || payload.items || payload.flow || payload.sequence || [];
  return ensureArray(source).map((item, index) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      return { title: sanitizeText(item), detail: '', index: index + 1 };
    }
    if (Array.isArray(item)) {
      const [title, detail] = item;
      return { title: sanitizeText(title), detail: sanitizeText(detail), index: index + 1 };
    }
    const obj = ensureObject(item);
    const title = sanitizeText(obj.title || obj.label || obj.name || `ステップ ${index + 1}`);
    const detail = sanitizeText(obj.description || obj.detail || obj.summary || '');
    const duration = sanitizeText(obj.duration || obj.time || '');
    const status = sanitizeText(obj.status || obj.state || '');
    return { title, detail, duration, status, index: index + 1 };
  }).filter(Boolean);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-steps'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.goal || '');
  const steps = normalizeSteps(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!steps.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: '手順情報が見つかりませんでした。' }));
    return wrap;
  }

  const list = createElement('ol', { className: 'rvi-steps-list' });
  steps.forEach((step) => {
    const item = createElement('li', { className: 'rvi-step-item' });
    const header = createElement('div', { className: 'rvi-step-header' });
    header.appendChild(createElement('span', { className: 'rvi-step-index', text: String(step.index) }));
    header.appendChild(createElement('span', { className: 'rvi-step-title', text: step.title }));
    if (step.status) {
      header.appendChild(createElement('span', { className: 'rvi-step-status', text: step.status }));
    }
    item.appendChild(header);
    if (step.detail) {
      item.appendChild(createElement('p', { className: 'rvi-step-detail', text: step.detail }));
    }
    if (step.duration) {
      item.appendChild(createElement('p', { className: 'rvi-step-meta', text: step.duration }));
    }
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}
