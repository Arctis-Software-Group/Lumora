import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeBoolean, sanitizeText } from '../utils/sanitize.js';

function normalizeItems(payload) {
  const source = payload.items || payload.checklist || payload.tasks || payload.points || [];
  return ensureArray(source).map((item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      return { label: sanitizeText(item), checked: false, note: '' };
    }
    if (Array.isArray(item)) {
      const [label, checked] = item;
      return { label: sanitizeText(label), checked: sanitizeBoolean(checked), note: '' };
    }
    const obj = ensureObject(item);
    const label = sanitizeText(obj.label || obj.title || obj.name || '');
    const checked = sanitizeBoolean(obj.checked ?? obj.done ?? obj.complete ?? false);
    const note = sanitizeText(obj.note || obj.detail || obj.description || '');
    return { label, checked, note };
  }).filter((item) => item.label);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-checklist'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const items = normalizeItems(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!items.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: 'チェックリストが見つかりませんでした。' }));
    return wrap;
  }

  const list = createElement('ul', { className: 'rvi-checklist-list' });
  items.forEach((item) => {
    const li = createElement('li', { className: 'rvi-checklist-item' });
    const checkbox = createElement('span', { className: item.checked ? 'rvi-check checked' : 'rvi-check' });
    checkbox.setAttribute('role', 'presentation');
    const label = createElement('span', { className: 'rvi-check-label', text: item.label });
    li.appendChild(checkbox);
    li.appendChild(label);
    if (item.note) {
      li.appendChild(createElement('span', { className: 'rvi-check-note', text: item.note }));
    }
    list.appendChild(li);
  });
  wrap.appendChild(list);
  return wrap;
}
