import { extractJsonBlocks } from './parser/json-parser.js';
import { extractTagBlocks } from './parser/tag-parser.js';
import { getRenderer } from './registry.js';
import { runBorderAnimation } from './utils/animate.js';
import { createElement } from './utils/dom.js';
import { ensureObject, sanitizeText } from './utils/sanitize.js';

const TYPE_LABEL = {
  keypoints: '要点',
  comparison: '比較',
  steps: '手順',
  checklist: 'チェック',
  timeline: 'タイムライン',
  tradeoffs: 'トレードオフ',
  'cause-effect': '因果関係',
  metrics: 'KPI',
  fallback: 'サマリー'
};

const TYPE_ICON = {
  keypoints: '📌',
  comparison: '⚖️',
  steps: '🧭',
  checklist: '☑️',
  timeline: '🗓️',
  tradeoffs: '🔁',
  'cause-effect': '🔄',
  metrics: '📊',
  fallback: '🧾'
};

const MOBILE_WIDTH = 640;

function isMobile() {
  try {
    return window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_WIDTH}px)`).matches;
  } catch (_) {
    return window.innerWidth <= MOBILE_WIDTH;
  }
}

function isRviEnabled() {
  try {
    const root = document.documentElement;
    if (root?.dataset?.rvi === 'off') return false;
    if (root?.dataset?.rvi === 'on') return true;
    const stored = localStorage.getItem('lumora_rvi');
    if (stored === 'off') return false;
    if (stored === 'on') return true;
  } catch (_) {}
  return true;
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null;
  const type = sanitizeText(block.type || 'fallback').toLowerCase() || 'fallback';
  const version = sanitizeText(block.version || '1.0') || '1.0';
  const payload = ensureObject(block.payload || {});
  return { type, version, payload };
}

function normalizeMeta(meta) {
  if (!meta) return [];
  if (Array.isArray(meta)) {
    return meta.map(normalizeBlock).filter(Boolean);
  }
  if (typeof meta === 'object') {
    if (Array.isArray(meta.blocks)) {
      return meta.blocks.map(normalizeBlock).filter(Boolean);
    }
    if (meta.type) {
      const block = normalizeBlock(meta);
      return block ? [block] : [];
    }
  }
  return [];
}

function buildBlocks(blocks) {
  const container = createElement('div', { className: 'rvi-blocks' });
  blocks.forEach((block) => {
    const renderer = getRenderer(block.type);
    const blockWrap = createElement('section', { className: 'rvi-block', dataset: { type: block.type } });
    blockWrap.appendChild(createElement('div', {
      className: 'rvi-block-label',
      text: `${TYPE_ICON[block.type] || '🔍'} ${TYPE_LABEL[block.type] || 'サマリー'}`
    }));
    try {
      const content = renderer(block);
      if (content) blockWrap.appendChild(content);
    } catch (error) {
      const fallback = getRenderer('fallback');
      blockWrap.appendChild(fallback({ type: 'fallback', version: '1.0', payload: { raw: `Render error: ${error?.message || error}` } }));
    }
    container.appendChild(blockWrap);
  });
  return container;
}

function createModal(bubble, blocks, summary) {
  const modal = createElement('div', { className: 'rvi-modal', attrs: { role: 'dialog', 'aria-modal': 'true', hidden: 'hidden' } });
  const backdrop = createElement('div', { className: 'rvi-modal-backdrop' });
  const inner = createElement('div', { className: 'rvi-modal-inner' });
  const closeBtn = createElement('button', { className: 'rvi-modal-close', text: '閉じる' });
  closeBtn.type = 'button';
  inner.appendChild(closeBtn);
  inner.appendChild(blocks);
  modal.appendChild(backdrop);
  modal.appendChild(inner);
  document.body.appendChild(modal);

  const openModal = () => {
    modal.removeAttribute('hidden');
    document.body.classList.add('rvi-modal-open');
    try { closeBtn.focus(); } catch (_) {}
  };
  const closeModal = () => {
    modal.setAttribute('hidden', 'hidden');
    document.body.classList.remove('rvi-modal-open');
    try { summary.focus(); } catch (_) {}
  };

  summary.addEventListener('click', (event) => {
    event.preventDefault();
    openModal();
  });
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeModal();
    }
  });

  return () => {
    try { document.body.classList.remove('rvi-modal-open'); } catch (_) {}
    try { modal.remove(); } catch (_) {}
  };
}

function cleanupExisting(host) {
  if (!host) return;
  const existing = host.querySelector('.rvi-bubble');
  if (existing) {
    try { existing._rviCleanup?.(); } catch (_) {}
    existing.remove();
  }
}

function applyTheme(node) {
  try {
    if ((document.documentElement.dataset.glass || 'off') === 'on') {
      node.classList.add('liquid-glass');
    }
  } catch (_) {}
}

function renderInline(bubbleEl, header, blocks) {
  bubbleEl.appendChild(header);
  bubbleEl.appendChild(blocks);
}

function renderModal(bubbleEl, header, blocks, blocksInfo) {
  bubbleEl.appendChild(header);
  const summary = createElement('button', { className: 'rvi-mobile-summary', text: '視覚サマリーを開く' });
  summary.type = 'button';
  const chips = createElement('div', { className: 'rvi-mobile-chips' });
  blocksInfo.forEach((block) => {
    chips.appendChild(createElement('span', {
      className: 'rvi-mobile-chip',
      text: TYPE_LABEL[block.type] || 'サマリー'
    }));
  });
  bubbleEl.appendChild(chips);
  bubbleEl.appendChild(summary);
  const teardown = createModal(bubbleEl, blocks, summary);
  bubbleEl._rviCleanup = teardown;
}

export function extractRviContent(raw, metaRvi = null) {
  const metaBlocks = normalizeMeta(metaRvi);
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { text: typeof raw === 'string' ? raw : '', blocks: metaBlocks };
  }

  const jsonResult = extractJsonBlocks(raw);
  let cleanedText = jsonResult.cleaned;
  const blocks = [...metaBlocks, ...jsonResult.blocks.map(normalizeBlock).filter(Boolean)];

  const tagResult = extractTagBlocks(cleanedText);
  cleanedText = tagResult.cleaned;
  blocks.push(...tagResult.blocks.map(normalizeBlock).filter(Boolean));

  return {
    text: cleanedText.trim(),
    blocks
  };
}

export function renderRviBlocks({ hostBubble, blocks, meta: _meta }) {
  cleanupExisting(hostBubble);
  if (!hostBubble || !Array.isArray(blocks) || !blocks.length) return;
  if (!isRviEnabled()) return;

  const normalizedBlocks = blocks.map(normalizeBlock).filter(Boolean);
  if (!normalizedBlocks.length) return;

  const bubble = createElement('section', { className: 'rvi-bubble', attrs: { role: 'group', 'aria-label': 'Realtime Visual Intelligence' } });
  applyTheme(bubble);
  const header = createElement('header', { className: 'rvi-header' });
  header.appendChild(createElement('span', { className: 'rvi-header-icon', text: '✨' }));
  header.appendChild(createElement('span', { className: 'rvi-header-text', text: 'Realtime Visual Intelligence' }));

  const content = buildBlocks(normalizedBlocks);
  if (isMobile()) {
    renderModal(bubble, header, content, normalizedBlocks);
  } else {
    renderInline(bubble, header, content);
    bubble._rviCleanup = () => {};
  }

  const metaEl = hostBubble.querySelector('.meta');
  if (metaEl) metaEl.insertAdjacentElement('afterend', bubble);
  else hostBubble.appendChild(bubble);

  runBorderAnimation(bubble);
}
