import { ensureArray } from './sanitize.js';

export function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  const { className, classes, attrs, dataset, text, html } = options;
  const classList = [];
  if (className) classList.push(className);
  if (classes) classList.push(...ensureArray(classes));
  if (classList.length) el.className = classList.join(' ');
  if (attrs && typeof attrs === 'object') {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      el.setAttribute(key, String(value));
    });
  }
  if (dataset && typeof dataset === 'object') {
    Object.entries(dataset).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      el.dataset[key] = String(value);
    });
  }
  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  } else if (html !== undefined && html !== null) {
    el.innerHTML = String(html);
  }
  return el;
}

export function appendChildren(parent, children) {
  if (!parent) return parent;
  ensureArray(children).forEach((child) => {
    if (!child) return;
    parent.appendChild(child);
  });
  return parent;
}

export function createFragment(children = []) {
  const fragment = document.createDocumentFragment();
  ensureArray(children).forEach((child) => {
    if (!child) return;
    fragment.appendChild(child);
  });
  return fragment;
}
