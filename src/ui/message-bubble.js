import { renderMarkdown } from './markdown.js';
import { restoreCanvasCallout } from './canvas.js';
import { extractRviContent, renderRviBlocks } from './rvi/viewer.js';

export function renderMessageBubble({ id, role, content, model, createdAt, confidence, meta }) {
  const wrap = document.createElement('article');
  wrap.className = `bubble ${role} entering`;
  wrap.dataset.id = id;
  // 参照用に生成時刻を保存（削除などで使用）
  try { wrap.dataset.createdAt = String(new Date(createdAt).getTime()); } catch (_) {}
  const avatarText = role === 'assistant' ? 'L' : 'U';
  const metaModel = model ? `<span class="model">${model}</span>` : '';
  const trustOn = document.documentElement.dataset.betaTrust === 'on';
  const showConf = document.documentElement.dataset.betaConfidence === 'on';
  const confText = (typeof confidence === 'number') ? `${Math.round(confidence * 100)}%` : '';
  const trustHtml = trustOn && role === 'assistant'
    ? `<span class="trust">🤖 by ${metaModel || 'Model'}${showConf && confText ? ` · <span class="confidence" title="内容の具体性・構造・曖昧表現から推定">confidence ${confText}</span>` : ''}</span>`
    : `${metaModel}`;
  let processedContent = { text: content, blocks: [] };
  if (role === 'assistant') {
    try {
      processedContent = extractRviContent(content, meta?.rvi);
    } catch (_) {
      processedContent = { text: content, blocks: [] };
    }
  }
  const safeText = processedContent.text || '';
  wrap.innerHTML = `
    <div class="avatar ${role}">${avatarText}</div>
    <div class="bubble-main">
      <div class="content markdown">${renderMarkdown(safeText)}</div>
      <div class="meta">${trustHtml} <time title="${fmtFullTime(createdAt)}">${fmtTime(createdAt)}</time></div>
  ${role === 'assistant' && document.documentElement.dataset.asobi === 'on' ? '<div class="asobi-badge" title="Asobi Mode">✨ Asobi</div>' : ''}
      <div class="actions" role="toolbar" aria-label="メッセージ操作">
        <button class="action-btn copy" title="コピー" aria-label="コピー">コピー</button>
        <button class="action-btn quote" title="引用" aria-label="引用">引用</button>
        ${role === 'user' ? '<button class="action-btn resend" title="再送" aria-label="再送">再送</button>' : ''}
        ${role === 'user' ? '<button class="action-btn edit" title="編集して再送" aria-label="編集して再送">編集</button>' : ''}
        ${role === 'user' ? '<button class="action-btn delete" title="削除" aria-label="削除">削除</button>' : ''}
        ${role === 'assistant' ? '<button class="action-btn regen" title="再生成" aria-label="再生成">再生成</button>' : ''}
        ${role === 'assistant' ? '<button class="action-btn speak" title="読み上げ" aria-label="読み上げ">読み上げ</button>' : ''}
        <button class="action-btn collapse" title="折りたたむ" aria-label="折りたたむ" hidden>折りたたむ</button>
      </div>
    </div>
  `;
  bindActions(wrap, role);
  const contentEl = wrap.querySelector('.content');
  if (contentEl) {
    contentEl.dataset.raw = safeText;
    enhanceMarkdownContent(contentEl);
    observeContentUpdates(contentEl);
  }
  if (role === 'assistant' && meta?.canvas) {
    try { restoreCanvasCallout(wrap, meta.canvas); } catch (_) {}
  }
  if (role === 'assistant' && processedContent.blocks.length) {
    try {
      const bubbleMain = wrap.querySelector('.bubble-main');
      if (bubbleMain) {
        renderRviBlocks({ hostBubble: bubbleMain, blocks: processedContent.blocks, meta });
      }
    } catch (_) {}
  }
  setupCollapseIfNeeded(wrap);
  requestAnimationFrame(() => wrap.classList.remove('entering'));
  return wrap;
}

export function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

export function showTyping(container, opts = {}) {
  const typing = document.createElement('div');
  const id = opts.modelId || localStorage.getItem('lumora_model') || '';
  const isGpt5 = id === 'openai/gpt-5' || id === 'openai/gpt-5-mini' || id === 'openai/gpt-5-nano';
  if (isGpt5) {
    let effort = null;
    try { effort = JSON.parse(localStorage.getItem('lumora_reasoning') || 'null')?.effort || null; } catch (_) {}
    const effortCls = effort ? ` effort-${effort}` : '';
    typing.className = `thinking-bubbles${effortCls}`;
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-live', 'polite');
    typing.setAttribute('aria-label', '考え中');
    typing.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span><span class="dot" aria-hidden="true"></span>';
    // Visible reasoning badge when effort is set
    if (effort) {
      const labelMap = { low: 'Low', medium: 'Medium', high: 'High' };
      const badge = document.createElement('span');
      badge.className = 'reasoning-badge';
      badge.title = `思考力: ${labelMap[effort] || String(effort)}`;
      badge.textContent = `🧠 ${labelMap[effort] || String(effort)}`;
      typing.dataset.effort = effort;
      typing.appendChild(badge);
    }
  } else {
    typing.className = 'typing';
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-live', 'polite');
    typing.setAttribute('aria-label', '入力中');
    typing.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  }
  container.appendChild(typing);
  return () => typing.remove();
}

// sanitize は markdown レンダリングに統合

function fmtTime(date) {
  try {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function fmtFullTime(date) {
  try {
    return new Date(date).toLocaleString();
  } catch (_) {
    return '';
  }
}

function bindActions(wrap, role) {
  const contentEl = wrap.querySelector('.content');
  const copyBtn = wrap.querySelector('.action-btn.copy');
  const quoteBtn = wrap.querySelector('.action-btn.quote');
  copyBtn?.addEventListener('click', async () => {
    const raw = contentEl.dataset.raw || contentEl.innerText || '';
    try {
      await navigator.clipboard.writeText(raw);
      toast('コピーしました');
    } catch (_) {
      toast('コピーに失敗しました');
    }
  });
  quoteBtn?.addEventListener('click', () => {
    const raw = contentEl.dataset.raw || contentEl.innerText || '';
    const input = document.getElementById('input');
    if (!input) return;
    const prefix = input.value ? input.value + '\n\n' : '';
    input.value = `${prefix}> ${raw.replaceAll('\n', '\n> ')}\n\n`;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new Event('input'));
  });
  if (role === 'user') {
    const resendBtn = wrap.querySelector('.action-btn.resend');
    resendBtn?.addEventListener('click', () => {
      const text = contentEl.innerText || '';
      if (!text.trim()) return;
      const input = document.getElementById('input');
      if (input) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        document.getElementById('sendBtn')?.click();
      }
    });
    const editBtn = wrap.querySelector('.action-btn.edit');
    editBtn?.addEventListener('click', () => {
      const raw = contentEl.dataset.raw || contentEl.innerText || '';
      const input = document.getElementById('input');
      if (!input) return;
      input.value = raw;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event('input'));
      toast('編集して送信できます');
    });
    const delBtn = wrap.querySelector('.action-btn.delete');
    delBtn?.addEventListener('click', () => {
      const ok = confirm('このメッセージを削除しますか？');
      if (!ok) return;
      try {
        const st = window.__lumora_state;
        const chatId = st?.currentChatId;
        if (!chatId) { wrap.remove(); return; }
        const createdAt = Number(wrap.dataset.createdAt || 0);
        const raw = contentEl.dataset.raw || contentEl.innerText || '';
        const msgs = st.getMessages(chatId);
        const idx = msgs.findIndex(m => m.role === 'user' && Math.abs(Number(m.createdAt || 0) - createdAt) < 1000 && String(m.content || '') === raw);
        if (idx >= 0) {
          msgs.splice(idx, 1);
          st.save();
        }
      } catch (_) {}
      wrap.remove();
      toast('メッセージを削除しました');
    });
  }
  if (role === 'assistant') {
    const speakBtn = wrap.querySelector('.action-btn.speak');
    speakBtn?.addEventListener('click', () => {
      const raw = contentEl.dataset.raw || contentEl.innerText || '';
      import('../app/main.js').then(({ speakText }) => speakText(raw));
    });
    const regenBtn = wrap.querySelector('.action-btn.regen');
    regenBtn?.addEventListener('click', () => {
      try {
        const st = window.__lumora_state;
        const chatId = st?.currentChatId;
        const msgs = chatId ? st.getMessages(chatId) : [];
        const prevUser = Array.isArray(msgs) ? [...msgs].reverse().find(m => m.role === 'user') : null;
        const text = prevUser?.content || '';
        if (text) {
          const input = document.getElementById('input');
          if (input) { input.value = text; input.dispatchEvent(new Event('input')); }
          import('../app/main.js').then(({ appendAndSend }) => appendAndSend(text));
        }
      } catch (_) {}
    });
  }
}

function toast(msg) {
  try {
    import('./toast.js').then(({ showToast }) => showToast(msg));
  } catch (_) {
    // no-op
  }
}

function observeContentUpdates(contentEl) {
  const mo = new MutationObserver(() => {
    enhanceMarkdownContent(contentEl);
  });
  mo.observe(contentEl, { childList: true, subtree: true });
}

function enhanceMarkdownContent(container) {
  if (!container) return;
  // コードブロックの装飾と言語ラベル/コピー
  const pres = container.querySelectorAll('pre');
  pres.forEach((pre) => {
    if (pre.closest('.code-block')) return; // 二重適用防止
    const code = pre.querySelector('code');
    if (!code) return;
    const raw = code.textContent || '';
    // 言語とタイトル（pre data-* 優先）
    const lang = (pre.dataset.lang || (code.className || '').replace('language-', '') || 'text').trim();
    const title = (pre.dataset.title || '').trim();
    code.dataset.raw = raw; // 行番号切替のため保持
    // ラッパーとヘッダー
    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    const header = document.createElement('div');
    header.className = 'code-header';
    const label = document.createElement('span');
    label.className = 'code-lang';
    label.textContent = title ? title : (lang || 'text').toUpperCase();
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy';
    copyBtn.type = 'button';
    copyBtn.textContent = 'コピー';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(code.dataset.raw || code.innerText || '');
        toast('コードをコピーしました');
      } catch (_) {
        toast('コピーに失敗しました');
      }
    });
    const wrapBtn = document.createElement('button');
    wrapBtn.className = 'code-copy';
    wrapBtn.type = 'button';
    let wrapOn = false;
    wrapBtn.textContent = '折返し: OFF';
    wrapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapOn = !wrapOn;
      pre.classList.toggle('wrap', wrapOn);
      wrapBtn.textContent = wrapOn ? '折返し: ON' : '折返し: OFF';
    });
    const lineBtn = document.createElement('button');
    lineBtn.className = 'code-copy';
    lineBtn.type = 'button';
    let linesOn = false;
    lineBtn.textContent = '行番号: OFF';
    const applyLines = (on) => {
      if (!on) {
        // 元のテキストに戻す
        code.innerText = code.dataset.raw || '';
        pre.classList.remove('has-lines');
        return;
      }
      const rawText = (code.dataset.raw || '').replace(/\n$/,'');
      const parts = rawText.split('\n');
      const html = parts.map((ln) => `<span class="code-line">${ln || '\u00A0'}</span>`).join('\n');
      code.innerHTML = html;
      pre.classList.add('has-lines');
    };
    lineBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      linesOn = !linesOn;
      applyLines(linesOn);
      lineBtn.textContent = linesOn ? '行番号: ON' : '行番号: OFF';
    });
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'code-copy';
    collapseBtn.type = 'button';
    collapseBtn.textContent = '折りたたむ';
    let collapsed = false;
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collapsed = !collapsed;
      pre.style.display = collapsed ? 'none' : 'block';
      collapseBtn.textContent = collapsed ? '展開する' : '折りたたむ';
    });
    header.appendChild(label);
    header.appendChild(copyBtn);
    header.appendChild(wrapBtn);
    header.appendChild(lineBtn);
    header.appendChild(collapseBtn);
    pre.parentNode?.insertBefore(wrap, pre);
    wrap.appendChild(header);
    wrap.appendChild(pre);
  });
  // 目次（見出しが複数ある場合）
  try {
    if (!container.querySelector('.md-toc')) {
      const hs = container.querySelectorAll('h1, h2, h3');
      const items = Array.from(hs).filter(h => h.id && (h.tagName === 'H1' || h.tagName === 'H2' || h.tagName === 'H3'));
      if (items.length >= 3) {
        const nav = document.createElement('nav');
        nav.className = 'md-toc';
        nav.setAttribute('aria-label', '目次');
        nav.innerHTML = items.map(h => {
          const level = Number(h.tagName.slice(1));
          const pad = level === 1 ? 0 : level === 2 ? 12 : 24;
          return `<a href="#${h.id}" style="padding-left:${pad}px">${h.textContent || ''}</a>`;
        }).join('');
        container.insertBefore(nav, container.firstChild);
      }
    }
  } catch (_) {}
  // 数式（KaTeX auto-render）
  try {
    import('./math.js').then(({ renderMathIn }) => renderMathIn(container)).catch(() => {});
  } catch (_) {}
}

function setupCollapseIfNeeded(wrap) {
  try {
    const content = wrap.querySelector('.content');
    const btn = wrap.querySelector('.action-btn.collapse');
    if (!content || !btn) return;
    const MAX = 900; // px
    const check = () => {
      const tooLong = content.scrollHeight > MAX * 1.1;
      btn.hidden = !tooLong;
      if (tooLong) {
        content.classList.add('collapsible');
        if (!content.classList.contains('expanded')) content.classList.add('collapsed');
      }
    };
    check();
    btn.addEventListener('click', () => {
      const expanded = content.classList.toggle('expanded');
      content.classList.toggle('collapsed', !expanded);
      btn.textContent = expanded ? '折りたたむ' : 'すべて表示';
    });
    new ResizeObserver(() => check()).observe(content);
  } catch (_) {}
}
