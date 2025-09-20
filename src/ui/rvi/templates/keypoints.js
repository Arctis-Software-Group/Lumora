import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizeItems(payload) {
  const source = payload.items || payload.points || payload.keypoints || payload.list || payload.bullets || payload.entries || [];
  const asArray = Array.isArray(source)
    ? source
    : (source && typeof source === 'object' && !Array.isArray(source))
      // Treat object maps as key->value bullets
      ? Object.entries(source).map(([k, v]) => ({ title: k, detail: v }))
      : ensureArray(source);
  return ensureArray(asArray).map((item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      return { title: sanitizeText(item), detail: '' };
    }
    if (Array.isArray(item)) {
      const [title, detail] = item;
      return { title: sanitizeText(title), detail: sanitizeText(detail) };
    }
    if (typeof item === 'object') {
      const obj = ensureObject(item);
      const title = sanitizeText(obj.title || obj.label || obj.name || obj.key || obj.text || '');
      const detail = sanitizeText(obj.detail || obj.description || obj.summary || obj.value || obj.content || obj.note || '');
      if (!title && !detail) return null;
      return { title, detail };
    }
    return null;
  }).filter(Boolean);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-keypoints'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const items = normalizeItems(payload);

  if (title) {
    wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  }
  if (subtitle) {
    wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));
  }

  if (!items.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: '要点情報が見つかりませんでした。' }));
    return wrap;
  }

  const list = createElement('ul', { className: 'rvi-keypoints-list' });
  items.forEach((item) => {
    const li = createElement('li', { className: 'rvi-keypoint-item' });
    if (item.title) {
      li.appendChild(createElement('span', { className: 'rvi-keypoint-title', text: item.title }));
    }
    if (item.detail) {
      li.appendChild(createElement('span', { className: 'rvi-keypoint-detail', text: item.detail }));
    }
    list.appendChild(li);
  });
  wrap.appendChild(list);
  return wrap;
}
