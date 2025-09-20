import { renderMarkdown } from './markdown.js';

const STORAGE_ENABLED = 'lumora_canvas_enabled';
const STORAGE_MODE = 'lumora_canvas_mode';

const TYPE_LABEL = {
  html: 'HTML',
  markdown: 'Markdown',
  text: 'Text'
};
const TYPE_EXTENSION = {
  html: 'html',
  markdown: 'md',
  text: 'txt'
};

let backdrop;
let panel;
let editor;
let previewArea;
let metaLabel;
let previewLabel;
let downloadBtn;
let closeBtn;
let copyBtn;
let preferences = { enabled: true, mode: 'auto' };
let current = { type: 'html', content: '', origin: '' };
let previewTimer = null;

function updateCanvasUI() {
  // Update canvas UI based on current preferences
  const prefs = getCanvasPreferences();
  // If mode is 'off', ensure canvas is closed
  if (prefs.mode === 'off') {
    closeCanvas();
  }
  // Additional UI updates if needed
}

export function initCanvas() {
  backdrop = document.getElementById('canvasBackdrop');
  panel = document.getElementById('canvasPanel');
  editor = document.getElementById('canvasEditor');
  previewArea = document.getElementById('canvasPreviewArea');
  metaLabel = document.getElementById('canvasMeta');
  previewLabel = document.getElementById('canvasPreviewLabel');
  downloadBtn = document.getElementById('canvasDownloadBtn');
  closeBtn = document.getElementById('canvasCloseBtn');
  copyBtn = document.getElementById('canvasCopyBtn');

  loadPreferences();

  editor?.addEventListener('input', () => {
    if (!panel?.classList.contains('open')) return;
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      current.content = editor.value;
      updatePreview();
    }, 220);
  });

  downloadBtn?.addEventListener('click', handleDownload);
  closeBtn?.addEventListener('click', closeCanvas);
  copyBtn?.addEventListener('click', handleCopy);
  backdrop?.addEventListener('click', closeCanvas);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.classList.contains('open')) {
      closeCanvas();
    }
  });

  // Sync when preferences change (same-tab)
  try {
    window.addEventListener('canvas-prefs-changed', () => {
      try { refreshCanvasPreferences(); } catch (_) {}
      updateCanvasUI();
    });
  } catch (_) {}

  updateCanvasUI();
}

function loadPreferences() {
  try {
    const enabled = localStorage.getItem(STORAGE_ENABLED);
    const mode = localStorage.getItem(STORAGE_MODE);
    preferences.enabled = enabled === null ? true : enabled === 'on';
    preferences.mode = ['auto', 'manual', 'off'].includes(mode) ? mode : 'auto';
  } catch (_) {
    preferences = { enabled: true, mode: 'auto' };
  }
}

export function getCanvasPreferences() {
  const mode = preferences.enabled ? preferences.mode : 'off';
  return { enabled: preferences.enabled, mode, storedMode: preferences.mode };
}

export function setCanvasEnabled(on) {
  preferences.enabled = on;
  try { localStorage.setItem(STORAGE_ENABLED, on ? 'on' : 'off'); } catch (_) {}
  if (!on) closeCanvas();
  try { window.dispatchEvent(new CustomEvent('canvas-prefs-changed')); } catch (_) {}
}

export function setCanvasMode(mode) {
  if (!['auto', 'manual', 'off'].includes(mode)) return;
  preferences.mode = mode;
  try { localStorage.setItem(STORAGE_MODE, mode); } catch (_) {}
  try { window.dispatchEvent(new CustomEvent('canvas-prefs-changed')); } catch (_) {}
}

export function refreshCanvasPreferences() {
  loadPreferences();
}

export function processCanvasMessage({ node, raw }) {
  const extraction = extractCanvasDirectives(raw);
  if (extraction.directives.length === 0) {
    return { raw };
  }
  const prefs = getCanvasPreferences();
  if (prefs.mode === 'off') {
    let replaced = raw;
    extraction.directives.forEach((directive) => {
      replaced = replaced.replace(directive.raw, `\n${directive.content}\n`);
    });
    return { raw: replaced.trim() };
  }
  const contentEl = node.querySelector('.content');
  if (!contentEl) return { raw };
  if (extraction.sanitized !== raw) {
    contentEl.dataset.raw = extraction.sanitized;
    try {
      contentEl.innerHTML = renderMarkdown(extraction.sanitized);
    } catch (_) {
      contentEl.textContent = extraction.sanitized;
    }
  }
  attachCanvasCallout(node, extraction.directives);
  maybeAutoOpen(extraction.directives[0]);
  return { raw: extraction.sanitized, canvas: extraction.directives };
}

export function restoreCanvasCallout(node, directives) {
  if (!Array.isArray(directives) || directives.length === 0) return;
  attachCanvasCallout(node, directives);
}

function extractCanvasDirectives(raw) {
  const result = [];
  let sanitized = raw;
  const regex = /\[\[canvasCall(HtmlSite|Markdown|TextDoc)]]([\s\S]*?)\[\[\/canvasCall\1]]/gi;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const variant = match[1];
    const payload = match[2] || '';
    const type = variant === 'HtmlSite' ? 'html' : variant === 'Markdown' ? 'markdown' : 'text';
    const content = payload.trim();
    if (!content) continue;
    result.push({ type, content, raw: match[0] });
    sanitized = sanitized.replace(match[0], '').trim();
  }
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  return { directives: result, sanitized: sanitized.trim() };
}

function attachCanvasCallout(node, directives) {
  const target = node.querySelector('.bubble-main');
  const existing = target?.querySelectorAll('.canvas-callout') || [];
  existing.forEach((el) => el.remove());
  if (!target || directives.length === 0) return;
  const { type } = directives[0];
  const callout = document.createElement('div');
  callout.className = 'canvas-callout';
  const title = document.createElement('div');
  title.className = 'canvas-callout-title';
  title.innerHTML = `🖥️ Lumora Canvas · ${TYPE_LABEL[type] || type}`;
  const desc = document.createElement('div');
  desc.className = 'canvas-callout-desc';
  desc.textContent = '生成されたコンテンツを Canvas で編集・プレビューできます。';
  const button = document.createElement('button');
  button.className = 'canvas-open-btn';
  button.type = 'button';
  button.textContent = '▶ Canvasで開く';
  button.addEventListener('click', () => openCanvas(directives[0], { origin: 'manual' }));
  callout.append(title, desc, button);
  target.appendChild(callout);
}

function maybeAutoOpen(directive) {
  const prefs = getCanvasPreferences();
  if (prefs.mode !== 'auto') return;
  openCanvas(directive, { origin: 'auto' });
}

function openCanvas(directive, { origin }) {
  if (!directive) return;
  if (getCanvasPreferences().mode === 'off') return;
  current = { type: directive.type, content: directive.content, origin: origin || 'unknown' };
  if (!panel || !editor || !previewArea) return;
  editor.value = directive.content;
  metaLabel.textContent = TYPE_LABEL[directive.type] || directive.type.toUpperCase();
  previewLabel.textContent = directive.type === 'html' ? 'ライブプレビュー' : 'プレビュー';
  updatePreview();
  panel.hidden = false;
  panel.classList.add('open');
  if (backdrop) {
    backdrop.hidden = false;
    backdrop.classList.add('show');
  }
}

function closeCanvas() {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (panel) {
    panel.classList.remove('open');
    setTimeout(() => { panel.hidden = true; }, 220);
  }
  if (backdrop) {
    backdrop.classList.remove('show');
    setTimeout(() => { backdrop.hidden = true; }, 220);
  }
}

function updatePreview() {
  if (!previewArea) return;
  previewArea.innerHTML = '';
  const { type, content } = current;
  if (type === 'html') {
    if (/eval\s*\(/i.test(content) || /document\.write\s*\(/i.test(content)) {
      const warning = document.createElement('div');
      warning.className = 'canvas-warning';
      warning.textContent = 'このプレビューでは eval や document.write は利用できません。コードから該当箇所を削除してください。';
      previewArea.appendChild(warning);
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.srcdoc = content;
    previewArea.appendChild(iframe);
  } else if (type === 'markdown') {
    const container = document.createElement('div');
    container.className = 'canvas-markdown';
    try {
      container.innerHTML = renderMarkdown(content);
    } catch (_) {
      container.textContent = content;
    }
    previewArea.appendChild(container);
  } else {
    const pre = document.createElement('pre');
    pre.textContent = content;
    previewArea.appendChild(pre);
  }
}

function handleDownload() {
  if (!current.content) return;
  const ext = TYPE_EXTENSION[current.type] || 'txt';
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `lumora_output_${date}.${ext}`;
  const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function handleCopy() {
  if (!navigator?.clipboard) return;
  navigator.clipboard.writeText(editor?.value || '').catch(() => {});
}

// For settings debug: open with sample content
export function debugOpenCanvas(type = 'html') {
  const sample = type === 'markdown'
    ? { type: 'markdown', content: '# Canvas Test\n\nこれはMarkdownのテストです。' }
    : type === 'text'
      ? { type: 'text', content: 'Canvas テキストプレビューのテスト' }
      : { type: 'html', content: '<!doctype html><html><body><h1>Lumora Canvas Test</h1><p>HTMLプレビューのテスト。</p></body></html>' };
  openCanvas(sample, { origin: 'debug' });
}
