import { createElement } from '../utils/dom.js';
import { ensureArray, ensureObject, sanitizeText } from '../utils/sanitize.js';

function formatDelta(delta) {
  if (delta === '' || delta === null || delta === undefined) return '';
  const str = String(delta).trim();
  if (!str) return '';
  if (/^[+-]?\d+(\.\d+)?%?$/.test(str)) return str;
  return str;
}

function normalizeMetrics(payload) {
  const source = payload.metrics || payload.items || payload.kpis || payload.values || [];
  return ensureArray(source).map((item) => {
    if (item === null || item === undefined) return null;
    if (typeof item === 'string') {
      return { label: sanitizeText(item), value: '', delta: '', note: '' };
    }
    if (Array.isArray(item)) {
      const [label, value, delta] = item;
      return {
        label: sanitizeText(label),
        value: sanitizeText(value),
        delta: formatDelta(delta),
        note: ''
      };
    }
    const obj = ensureObject(item);
    return {
      label: sanitizeText(obj.label || obj.name || obj.metric || ''),
      value: sanitizeText(obj.value ?? obj.score ?? obj.amount ?? ''),
      delta: formatDelta(obj.delta ?? obj.diff ?? obj.change ?? ''),
      note: sanitizeText(obj.note || obj.summary || obj.description || ''),
      target: sanitizeText(obj.target || obj.goal || '')
    };
  }).filter((metric) => metric.label || metric.value || metric.delta || metric.note);
}

export function render(block) {
  const payload = ensureObject(block?.payload);
  const wrap = createElement('div', { classes: ['rvi-card', 'rvi-metrics'] });
  const title = sanitizeText(payload.title || payload.heading || '');
  const subtitle = sanitizeText(payload.subtitle || payload.context || '');
  const metrics = normalizeMetrics(payload);

  if (title) wrap.appendChild(createElement('h3', { className: 'rvi-card-title', text: title }));
  if (subtitle) wrap.appendChild(createElement('p', { className: 'rvi-card-subtitle', text: subtitle }));

  if (!metrics.length) {
    wrap.appendChild(createElement('p', { className: 'rvi-empty', text: '指標データがありません。' }));
    return wrap;
  }

  const list = createElement('ul', { className: 'rvi-metrics-list' });
  metrics.forEach((metric) => {
    const item = createElement('li', { className: 'rvi-metric-item' });
    const header = createElement('div', { className: 'rvi-metric-header' });
    if (metric.label) {
      header.appendChild(createElement('span', { className: 'rvi-metric-label', text: metric.label }));
    }
    if (metric.delta) {
      const delta = createElement('span', { className: 'rvi-metric-delta', text: metric.delta });
      if (metric.delta.startsWith('+')) delta.dataset.trend = 'up';
      else if (metric.delta.startsWith('-')) delta.dataset.trend = 'down';
      header.appendChild(delta);
    }
    item.appendChild(header);
    if (metric.value) {
      item.appendChild(createElement('span', { className: 'rvi-metric-value', text: metric.value }));
    }
    if (metric.target) {
      item.appendChild(createElement('span', { className: 'rvi-metric-target', text: `Target: ${metric.target}` }));
    }
    if (metric.note) {
      item.appendChild(createElement('p', { className: 'rvi-metric-note', text: metric.note }));
    }
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}
