import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function normalizeEvents(payload) {
  const source = payload.events || payload.timeline || payload.milestones || payload.items || [];
  return ensureArray(source).map((item, index) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      return { title: sanitizeText(item), timestamp: '', detail: '', index };
    }
    if (Array.isArray(item)) {
      const [timestamp, title, detail] = item;
      return { title: sanitizeText(title), timestamp: sanitizeText(timestamp), detail: sanitizeText(detail), index };
    }
    const obj = ensureObject(item);
    return {
      title: sanitizeText(obj.title || obj.event || obj.name || ''),
      timestamp: sanitizeText(obj.timestamp || obj.time || obj.date || ''),
      detail: sanitizeText(obj.detail || obj.description || obj.summary || ''),
      status: sanitizeText(obj.status || obj.state || ''),
      index
    };
  }).filter((item) => item.title || item.timestamp || item.detail);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-timeline'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const events = normalizeEvents(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!events.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: 'タイムライン情報がありません。' }));
    return wrap;
  }

  const list = createElement('ol', { className: 'rvi-timeline-list' });
  events.forEach((event, idx) => {
    const item = createElement('li', { className: 'rvi-timeline-item' });
    item.dataset.index = String(idx);
    if (event.timestamp) {
      item.appendChild(createElement('time', { className: 'rvi-timeline-time', text: event.timestamp }));
    }
    if (event.title) {
      item.appendChild(createElement('h4', { className: 'rvi-timeline-title', text: event.title }));
    }
    if (event.status) {
      item.appendChild(createElement('span', { className: 'rvi-timeline-status', text: event.status }));
    }
    if (event.detail) {
      item.appendChild(createElement('p', { className: 'rvi-timeline-detail', text: event.detail }));
    }
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}
