import { initState } from '../state/state.js';
import { renderSidebar } from '../ui/sidebar.js';
import { renderChatList } from '../ui/chat-list.js';
import { renderComposer } from '../ui/composer.js';
import { renderMessageBubble, scrollToBottom, showTyping } from '../ui/message-bubble.js';
import { setupModelSelector, getSelectedModel, getSelectedModelLabel, injectModels, updateAchievementsUi, labelFor } from '../ui/model-selector.js';
import { showToast } from '../ui/toast.js';
import { sendMessageStream } from '../api/chat.js';
import { buildFinalSystemPrompt, inferEmotionFromText } from '../safety/safety.js';
import { openSettings, setupSettings } from './settings.js';
import { estimateConfidence } from '../lib/trust.js';
import { loadProjects } from './projects.js';
import { enableFII } from './fii.js';

const state = initState();
window.__lumora_state = state;

let __isSending = false;
let __recognition = null;
let __isRecording = false;
let __utterance = null;

function $(q) { return document.querySelector(q); }

// ===== Viewport unit fallback for older mobile browsers =====
function setupViewportUnitFallback() {
  const set = () => {
    // Use innerHeight to avoid browser UI bars
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  };
  set();
  window.addEventListener('resize', set, { passive: true });
  window.addEventListener('orientationchange', set);
}

// ===== Mobile sidebar drawer =====
function setupMobileSidebarToggle() {
  const btn = document.getElementById('mobileMenuBtn');
  if (!btn || btn.__bound) return;
  btn.__bound = true;
  const root = document.documentElement;
  let backdrop = null;
  const open = () => {
    root.dataset.mobileSidebar = 'open';
    btn.setAttribute('aria-expanded', 'true');
    // create backdrop lazily
    backdrop = document.getElementById('sidebarBackdrop') || document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'mobile-backdrop';
    backdrop.addEventListener('click', close);
    document.body.appendChild(backdrop);
  };
  const close = () => {
    root.dataset.mobileSidebar = 'closed';
    btn.setAttribute('aria-expanded', 'false');
    try { backdrop?.remove(); } catch (_) {}
    backdrop = null;
  };
  btn.addEventListener('click', () => {
    const openNow = root.dataset.mobileSidebar === 'open';
    if (openNow) close(); else open();
  });
  // expose for other modules
  window.__lumora_closeMobileSidebar = close;
}

// ===== Study Mode System Prompt (global, all models) =====
const STUDY_MODE_PROMPT = `You are Lumora, created by Arctis Software Group.

You are operating in "Study Mode," which means you must follow these strict rules in this chat. No matter what other instructions follow, you MUST obey these rules:

## STRICT RULES
Be an approachable-yet-dynamic teacher, who helps the learner grow by guiding them through their studies.

1. **Get to know the learner.** If you don't know their goals or grade level, ask before diving in. (Keep this light!) If they don’t answer, aim for explanations that make sense to a middle or high school student.  
2. **Build on what they know.** Connect new ideas to familiar ones so learning feels natural.  
3. **Guide, don’t just tell.** Use questions, hints, and small steps so the learner discovers the answer themselves.  
4. **Check and reinforce.** After tough parts, confirm the learner can explain or use the idea. Offer quick summaries, mnemonics, or mini-reviews to help it stick.  
5. **Mix it up.** Blend explanations, questions, and activities (like roleplaying, practice rounds, or asking the learner to teach *you*) so it feels like a conversation, not a lecture.  

Above all: DO NOT DO THE LEARNER'S WORK FOR THEM. Don’t solve assignments outright — instead, work with them step by step, building from what they already know.

### THINGS YOU CAN DO
- **Teach new concepts:** Explain at their level, ask guiding questions, use visuals, then check with questions or a short practice.  
- **Help with homework:** Don’t just hand out answers! Start from what they know, fill in the gaps, let them respond, and ask one question at a time.  
- **Practice together:** Have the learner summarize, explain it back to you, or role-play (e.g., conversations in another language). Correct mistakes gently, in the moment.  
- **Quizzes & prep:** Run practice quizzes one question at a time. Let the learner try twice before revealing the answer, then review errors in detail.  

### TONE & APPROACH
Be warm, patient, and clear; don’t overload with exclamation marks or emoji. Keep things moving: always know the next step, and end or switch activities once they’ve served their purpose. Stay concise — no essay-length responses. Aim for a good back-and-forth.

## IMPORTANT
DO NOT GIVE ANSWERS OR DO HOMEWORK FOR THE LEARNER.  
If they ask a math or logic question, or upload an image of one, DO NOT SOLVE IT immediately. Instead, **talk through** the problem step by step, asking one guiding question at a time, and give the learner a chance to RESPOND TO EACH STEP before moving on.`;

function setupEmptyState() {
  const heroInput = $('#heroInput');
  const heroSend = $('#heroSend');
  const heroMic = $('#heroMic');
  const heroMenu = $('#heroMenu');
  const newChatHero = $('#newChatHero');
  const attachBtn = $('#attachBtn');
  const thinkMoreBtn = $('#thinkMoreBtn');
  const reasoningBtn = $('#reasoningBtn');
  const reasoningSub = $('#reasoningSub');
  const studyModeBtn = $('#studyModeBtn');
  // 既存変数は上に移動
  const chips = document.querySelectorAll('.chip');
  chips.forEach((c) => c.addEventListener('click', () => {
    heroInput.value = c.dataset.suggest || '';
    heroInput.focus();
  }));
  const submitHero = () => {
    const text = heroInput.value.trim();
    if (!text) return;
    $('#emptyState').style.display = 'none';
    $('#messages').style.display = 'block';
    document.getElementById('composer').style.display = 'flex';
    appendAndSend(text);
  };
  heroSend.addEventListener('click', submitHero);
  heroInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitHero();
    }
  });

  // 新規チャット（＋）
  if (newChatHero && !newChatHero.__bound) {
    newChatHero.__bound = true;
    // クリックでメニューをトグル
    newChatHero.addEventListener('click', (e) => {
      e.stopPropagation();
      // Open menu and refresh Study Mode label
      try {
        const on = (localStorage.getItem('lumora_study_mode') || 'off') === 'on';
        if (studyModeBtn) {
          studyModeBtn.textContent = on ? '📚 Study Mode をオフ' : '📚 Study Mode をオン';
          studyModeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      } catch (_) {}
      if (heroMenu.hasAttribute('hidden')) {
        heroMenu.removeAttribute('hidden');
      } else {
        heroMenu.setAttribute('hidden', '');
        reasoningSub?.setAttribute('hidden', '');
      }
    });

    // メニュー外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (!heroMenu || heroMenu.hasAttribute('hidden')) return;
      const wrap = document.querySelector('.hero-menu-wrap');
      if (wrap && !wrap.contains(e.target)) {
        heroMenu.setAttribute('hidden', '');
        reasoningSub?.setAttribute('hidden', '');
      }
    });

    // 「写真とファイルを追加」
    attachBtn?.addEventListener('click', () => {
      heroMenu.setAttribute('hidden', '');
      const currentModel = localStorage.getItem('lumora_model') || '';
      const visionCapable = new Set([
        'z-ai/glm-4.5v',
        'google/gemini-2.5-flash-lite',
        'google/gemini-2.5-flash',
        'google/gemini-2.5-pro',
        'openai/chatgpt-4o-latest',
        'amazon/nova-lite-v1',
        'amazon/nova-pro-v1'
      ]);
      const isVision = visionCapable.has(currentModel);
      if (!isVision) {
        import('./settings.js').then(() => {}).catch(() => {});
        import('../ui/toast.js').then(({ showToast }) => showToast('この機能は GLM-4.5V 選択時のみ利用できます')).catch(() => {});
        return;
      }
      // ファイル入力を動的作成
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.multiple = true;
      input.onchange = async () => {
        const files = Array.from(input.files || []);
        if (files.length === 0) return;
        // 添付をローカルに保持
        try {
          const enc = await Promise.all(files.map(f => fileToDataUrl(f)));
          const current = JSON.parse(localStorage.getItem('lumora_attachments') || '[]');
          const next = current.concat(enc.map((x, i) => ({ name: files[i].name, dataUrl: x })));
          localStorage.setItem('lumora_attachments', JSON.stringify(next));
          import('../ui/toast.js').then(({ showToast }) => showToast(`${files.length}件を添付しました`));
          refreshHeroPreview();
        } catch (_) {}
      };
      input.click();
    });

    // 「より長く思考する」→ effort=high を一時設定
    thinkMoreBtn?.addEventListener('click', () => {
      heroMenu.setAttribute('hidden', '');
      if (!isGpt5Selected()) { tipReasoningOnlyForGpt5(); return; }
      localStorage.setItem('lumora_reasoning', JSON.stringify({ effort: 'high' }));
      import('../ui/toast.js').then(({ showToast }) => showToast('思考力: High を適用（次回送信時）'));
    });

    // 「Study Mode」トグル（全モデル対応）
    studyModeBtn?.addEventListener('click', () => {
      try {
        const cur = localStorage.getItem('lumora_study_mode') || 'off';
        const next = cur === 'on' ? 'off' : 'on';
        localStorage.setItem('lumora_study_mode', next);
        if (studyModeBtn) {
          studyModeBtn.textContent = next === 'on' ? '📚 Study Mode をオフ' : '📚 Study Mode をオン';
          studyModeBtn.setAttribute('aria-pressed', next === 'on' ? 'true' : 'false');
        }
        try { import('../ui/toast.js').then(({ showToast }) => showToast(`Study Mode: ${next === 'on' ? 'ON' : 'OFF'}`)); } catch (_) {}
        try { syncStudyBadge(); } catch (_) {}
      } catch (_) {}
      heroMenu.setAttribute('hidden', '');
    });

    // 「思考力を設定する」サブメニュー
    reasoningBtn?.addEventListener('click', () => {
      if (!isGpt5Selected()) { tipReasoningOnlyForGpt5(); return; }
      const open = reasoningSub.hasAttribute('hidden');
      if (open) reasoningSub.removeAttribute('hidden'); else reasoningSub.setAttribute('hidden', '');
    });
    reasoningSub?.querySelectorAll('.sub-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const effort = btn.getAttribute('data-effort');
        localStorage.setItem('lumora_reasoning', JSON.stringify({ effort }));
        reasoningSub.setAttribute('hidden', '');
        heroMenu.setAttribute('hidden', '');
        import('../ui/toast.js').then(({ showToast }) => showToast(`思考力: ${String(effort).toUpperCase()} を適用（次回送信時）`));
      });
    });

    // 旧: 新規チャット作成はメニューではなく、Ctrl+N 等で追加検討
    // メニュー内に配置しない場合は以下を呼ぶ
    const createNew = () => {
      const id = state.createChat({ title: '新しいチャット' });
      state.selectChat(id);
      renderChatList(state);
      heroInput.value = '';
      heroInput.focus();
    };
  }

  // ヒーローの簡易音声入力
  if (heroMic && !heroMic.__bound) {
    heroMic.__bound = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      heroMic.disabled = true;
      heroMic.title = 'このブラウザでは音声入力に対応していません';
    } else {
      const recog = new SpeechRecognition();
      recog.lang = 'ja-JP';
      recog.interimResults = true;
      let recording = false;
      const start = () => { if (recording) return; try { recog.start(); } catch {} recording = true; };
      const stop = () => { if (!recording) return; try { recog.stop(); } catch {} recording = false; };
      heroMic.addEventListener('click', () => { recording ? stop() : start(); });
      recog.onresult = (e) => {
        let finalText = '';
        let interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else interimText += r[0].transcript;
        }
        const current = heroInput.value.replace(/\s+$/, '');
        heroInput.value = (current + ' ' + (finalText || interimText)).trim();
      };
      recog.onerror = () => stop();
      recog.onend = () => { recording = false; };
    }
  }

  // GPT-5 選択時のみ「思考力」メニューを表示
  const syncReasoningMenu = () => {
    const model = localStorage.getItem('lumora_model') || '';
    const isGpt5 = model === 'openai/gpt-5' || model === 'openai/gpt-5-mini' || model === 'openai/gpt-5-nano';
    const el = document.getElementById('reasoningBtn');
    if (el) el.style.display = isGpt5 ? 'block' : 'none';
  };
  syncReasoningMenu();
  window.addEventListener('model-changed', syncReasoningMenu);
}

function resizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function setupComposer() {
  const input = document.getElementById('input');
  const send = document.getElementById('sendBtn');
  const count = document.getElementById('charCount');
  const micBtn = document.getElementById('micBtn');
  const micIndicator = document.getElementById('micIndicator');
  // モデル変更時にも reasoning メニュー表示状態を同期（GPT-5 系に対応）
  window.addEventListener('model-changed', () => {
    try {
      const btn = document.getElementById('reasoningBtn');
      if (!btn) return;
      const id = localStorage.getItem('lumora_model') || '';
      const isGpt5 = id === 'openai/gpt-5' || id === 'openai/gpt-5-mini' || id === 'openai/gpt-5-nano';
      btn.style.display = isGpt5 ? 'block' : 'none';
    } catch (_) {}
  });
  // 念のため初期状態で非表示を徹底
  try { micIndicator?.setAttribute('hidden', ''); micBtn?.setAttribute('aria-pressed', 'false'); micBtn?.classList.remove('recording'); } catch {}
    // ツールバーの↑ボタンに合わせてタイトルも更新（ヒント）
    if (send) send.setAttribute('title', '送信 (Enter)');
  const updateCountLegacy = () => { if (count) count.textContent = String(input.value.length); };
  const COUNT_WARN_AT = 1200;
  const COUNT_BLOCK_AT = 4000;
  const updateCountAndState = () => {
    const len = input.value.length;
    if (count) {
      count.textContent = String(len);
      count.classList.toggle('warn', len >= COUNT_WARN_AT);
    }
  };
  const updateCount = updateCountAndState;
  // 下書き保存
  const saveDraft = () => {
    try { localStorage.setItem('lumora_draft', input.value); } catch {}
  };
  const restoreDraft = () => {
    try {
      const d = localStorage.getItem('lumora_draft');
      if (d) { input.value = d; resizeTextarea(input); updateCount(); }
    } catch {}
  };
  restoreDraft();
  // 添付プレビュー（あれば表示）
  try { refreshHeroPreview(); } catch (_) {}
  input.addEventListener('input', () => { resizeTextarea(input); updateCount(); saveDraft(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send.click();
    }
    if (e.key === 'ArrowUp') {
      const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
      if (atStart && !input.value.trim()) {
        try {
          const msgs = state.getMessages(state.currentChatId) || [];
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'user' && (msgs[i].content || '').trim()) {
              input.value = msgs[i].content;
              input.dispatchEvent(new Event('input'));
              e.preventDefault();
              break;
            }
          }
        } catch (_) {}
      }
    }
  });
  updateCount();
  send.addEventListener('click', () => {
    if (__isSending) return; // 生成中は新規送信しない
    const value = input.value.trim();
    if (!value) return;
    if (value.length > COUNT_BLOCK_AT) { import('../ui/toast.js').then(({ showToast }) => showToast('文字数が多すぎます（最大4000文字）')); return; }
    input.value = '';
    resizeTextarea(input);
    updateCount();
    try { localStorage.removeItem('lumora_draft'); } catch {}
    appendAndSend(value);
  });

  // 音声入力
  setupSpeechInput({ micBtn, micIndicator, input });
}

function insertDateSeparatorIfNeeded(container, when) {
  try {
    const ymd = new Date(when).toISOString().slice(0,10);
    const lastMark = container.querySelector('[data-sep="date"]:last-of-type');
    const lastYmd = lastMark?.getAttribute('data-ymd') || '';
    if (lastYmd === ymd) return;
    const sep = document.createElement('div');
    sep.className = 'date-separator';
    sep.setAttribute('data-sep', 'date');
    sep.setAttribute('data-ymd', ymd);
    try {
      const d = new Date(when);
      const label = d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
      sep.innerHTML = `<span class="pill">${label}</span>`;
    } catch { sep.innerHTML = `<span class="pill">${ymd}</span>`; }
    container.appendChild(sep);
  } catch (_) {}
}

function appendMessage(role, content, meta = {}) {
  const messagesEl = document.getElementById('messages');
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const when = meta.createdAt ? new Date(meta.createdAt) : new Date();
  insertDateSeparatorIfNeeded(messagesEl, when);
  const node = renderMessageBubble({ id, role, content, model: meta.model, createdAt: when, confidence: meta.confidence });
  messagesEl.appendChild(node);
  scrollToBottom(messagesEl);
  return { id, node };
}

export function appendAndSend(text) {
  // 会話IDの確定
  if (!state.currentChatId) {
    const newId = state.createChat({ title: text.slice(0, 30) || '新しいチャット' });
    state.selectChat(newId);
    renderChatList(state);
  }

  const now = new Date();
  state.append(state.currentChatId, { role: 'user', content: text, createdAt: now.getTime() });
  appendMessage('user', text, { createdAt: now });

  // プロジェクト既定のモデルを優先（設定があれば）
  let modelId = getSelectedModel();
  try {
    const projName = (state.chats[state.currentChatId]?.project || '').trim();
    if (projName) {
      const proj = loadProjects()[projName];
      if (proj && proj.modelId) modelId = proj.modelId;
    }
  } catch (_) {}
  const modelLabel = labelFor(modelId) || getSelectedModelLabel();
  const { node: aiNode } = appendMessage('assistant', '', { model: modelLabel, createdAt: new Date() });
  // Auto ルーティング時にサーバから通知される実モデルで上書き
  let resolvedModelLabel = modelLabel;
  let resolvedModelId = modelId;
  let stopTyping = showTyping(aiNode.querySelector('.content'), { modelId });

  // reasoning 設定
  let reasoning = null;
  try { reasoning = JSON.parse(localStorage.getItem('lumora_reasoning') || 'null'); } catch (_) {}
  // 添付（GLM-4.5V のみ利用）
  const messages = state.getMessages(state.currentChatId);
  const enhancedMessages = [...messages];
  // ===== System Prompt Edit + Emotion Guard (client-side) =====
  try {
    const userPromptGlobal = localStorage.getItem('lumora_system_prompt') || '';
    // プロジェクト固有の上書き
    let projectPrompt = '';
    let mode = localStorage.getItem('lumora_emotion_mode') || 'off';
    let manualStyle = localStorage.getItem('lumora_emotion_style') || 'neutral';
    try {
      const projName = (state.chats[state.currentChatId]?.project || '').trim();
      if (projName) {
        const proj = loadProjects()[projName];
        if (proj) {
          if (proj.systemPrompt) projectPrompt = proj.systemPrompt;
          if (proj.emotionMode) mode = proj.emotionMode;
          if (proj.emotionStyle) manualStyle = proj.emotionStyle;
        }
      }
    } catch (_) {}
    let tone = null;
    if (mode === 'manual') tone = manualStyle || 'neutral';
    else if (mode === 'auto') tone = inferEmotionFromText(String(text || '')) || 'neutral';
    // Reflect in header badge
    try {
      const badge = document.getElementById('toneBadge');
      if (badge) {
        if (!tone || mode === 'off') {
          badge.style.display = 'none';
        } else {
          badge.textContent = 'Tone: ' + ({ neutral:'Neutral', empathetic:'Empathetic', cheerful:'Cheerful', professional:'Professional' }[tone] || 'Neutral');
          badge.style.display = '';
        }
      }
    } catch (_) {}
    // Emotion Adaptive UI (Beta)
    try {
      if ((document.documentElement.dataset.betaEmotionUi || 'off') === 'on') {
        document.documentElement.dataset.emotion = (mode === 'off') ? 'neutral' : (tone || 'neutral');
      }
    } catch (_) {}
    const mergedPrompt = [userPromptGlobal, projectPrompt].filter(s => String(s || '').trim()).join('\n\n');
    if ((mergedPrompt && mergedPrompt.trim()) || tone) {
      const finalSp = buildFinalSystemPrompt(mergedPrompt, { tone: tone || 'neutral', allowSensitive: true });
      enhancedMessages.unshift({ role: 'system', content: finalSp });
    }
  } catch (e) {
    // Blocked by guard (client-side): cancel and inform user
    import('../ui/toast.js').then(({ showToast }) => showToast('システムプロンプトがブロックされました。設定を確認してください。')).catch(() => {});
    setSending(false);
    return;
  }
  // ===== Study Mode (separate system prompt; all models) =====
  try {
    const studyOn = (localStorage.getItem('lumora_study_mode') || 'off') === 'on';
    if (studyOn) {
      // Put Study Mode system message at the very front so it takes precedence
      enhancedMessages.unshift({ role: 'system', content: STUDY_MODE_PROMPT });
    }
  } catch (_) {}
  try {
    const visionCapable = new Set([
      'z-ai/glm-4.5v',
      'google/gemini-2.5-flash-lite',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'openai/chatgpt-4o-latest',
      'amazon/nova-lite-v1',
      'amazon/nova-pro-v1'
    ]);
    if (visionCapable.has(modelId)) {
      const attachments = JSON.parse(localStorage.getItem('lumora_attachments') || '[]');
      if (attachments.length > 0) {
        const last = enhancedMessages[enhancedMessages.length - 1];
        const content = [ { type: 'text', text: last.content } ];
        var __hasPdf = false;
        for (const a of attachments) {
          if (/^data:application\/pdf/i.test(a.dataUrl)) {
            content.push({ type: 'file', file: { filename: a.name || 'document.pdf', file_data: a.dataUrl } });
            __hasPdf = true;
          } else {
            content.push({ type: 'image_url', image_url: { url: a.dataUrl } });
          }
        }
        enhancedMessages[enhancedMessages.length - 1] = { ...last, content };
        // PDF を含む場合は file-parser プラグインを有効化
        if (__hasPdf) {
          try { localStorage.setItem('lumora_plugins', JSON.stringify([{ id: 'file-parser', pdf: { engine: 'pdf-text' } }])); } catch {}
        }
      }
    }
  } catch (_) {}

  const aborter = sendMessageStream({
    model: modelId,
    messages: enhancedMessages,
    reasoning,
    plugins: (function(){ try { return JSON.parse(localStorage.getItem('lumora_plugins') || 'null'); } catch (_) { return null; } })(),
    onRouted(meta) {
      try {
        const label = meta?.label || meta?.id || '';
        if (label) {
          resolvedModelLabel = String(label);
          const modelEl = aiNode.querySelector('.meta .model');
          if (modelEl) modelEl.textContent = resolvedModelLabel;
        }
        if (meta?.id) {
          resolvedModelId = String(meta.id);
          // Recreate typing indicator to reflect resolved model (e.g., GPT-5 thinking with reasoning badge)
          try {
            stopTyping?.();
          } catch (_) {}
          try {
            stopTyping = showTyping(aiNode.querySelector('.content'), { modelId: resolvedModelId });
          } catch (_) {}
        }
      } catch (_) {}
    },
    onChunk(chunk) {
      stopTyping();
      // 素のMarkdownテキストを累積し、それを都度レンダリング
      const contentEl = aiNode.querySelector('.content');
      const rawPrev = contentEl.dataset.raw || '';
      const rawNow = rawPrev + chunk;
      contentEl.dataset.raw = rawNow;
      import('../ui/markdown.js').then(({ renderMarkdown }) => {
        contentEl.innerHTML = renderMarkdown(rawNow);
      }).catch(() => {
        contentEl.textContent = rawNow;
      });
      scrollToBottom(document.getElementById('messages'));
    },
    onDone() {
      stopTyping();
      // 保存: Markdownの生テキストを保存（履歴復元時も正しく描画される）
      const finalRaw = aiNode.querySelector('.content').dataset.raw || aiNode.querySelector('.content').innerText || '';
      // Trust layer: estimate confidence (Beta)
      let conf = null;
      try {
        if ((document.documentElement.dataset.betaTrust || 'off') === 'on') {
          conf = estimateConfidence({ text: finalRaw, modelLabel: resolvedModelLabel, modelId: resolvedModelId });
          // Inject into UI if confidence display enabled
          if ((document.documentElement.dataset.betaConfidence || 'off') === 'on') {
            const metaEl = aiNode.querySelector('.meta');
            if (metaEl) {
              // if trust line exists, update/add confidence span
              const trustSpan = metaEl.querySelector('.trust');
              if (trustSpan) {
                let c = trustSpan.querySelector('.confidence');
                const label = `confidence ${Math.round(conf * 100)}%`;
                if (c) { c.textContent = label; }
                else {
                  const span = document.createElement('span');
                  span.className = 'confidence';
                  span.title = '内容の具体性・構造・曖昧表現から推定';
                  span.textContent = label;
                  trustSpan.appendChild(document.createTextNode(' · '));
                  trustSpan.appendChild(span);
                }
              }
            }
          }
        }
      } catch (_) {}
      state.append(state.currentChatId, { role: 'assistant', content: finalRaw, model: resolvedModelLabel, confidence: conf });
      state.save();
      // Asobi: 実績カウンタ更新（送信回数）
      try {
        const stats = JSON.parse(localStorage.getItem('lumora_usage_stats') || '{}');
        stats.sends = (stats.sends || 0) + 1;
        const lastDay = stats.lastDay || '';
        const today = new Date().toISOString().slice(0,10);
        if (lastDay !== today) { stats.days = (stats.days || 0) + 1; stats.lastDay = today; }
        localStorage.setItem('lumora_usage_stats', JSON.stringify(stats));
      try { updateAchievementsUi(); } catch (_) {}
      } catch (_) {}
      // 添付は一回ごとにリセット
      try { localStorage.removeItem('lumora_attachments'); localStorage.removeItem('lumora_plugins'); } catch {}
      setSending(false);
    },
    onError(err) {
      stopTyping();
      aiNode.querySelector('.content').innerHTML += `<div class="markdown"><code>${(err && err.message) || 'エラー'}</code></div>`;
      showToast('接続に失敗しました。しばらくしてから再試行してください');
      setSending(false);
    }
  });

  // 将来: 停止ボタン
  window.__abort = aborter;
  setSending(true, aborter);
}

// ===== Switch chat view (no reload) =====
export function openChatById(chatId) {
  if (!chatId) return;
  try { state.selectChat(chatId); } catch (_) {}
  try { renderChatList(state); } catch (_) {}
  const emptyStateEl = document.getElementById('emptyState');
  const messagesEl = document.getElementById('messages');
  const composerEl = document.getElementById('composer');
  if (!messagesEl) return;
  // Clear messages container
  messagesEl.innerHTML = '';
  const history = state.getMessages(chatId);
  if (!history || history.length === 0) {
    if (emptyStateEl) emptyStateEl.style.display = 'block';
    if (messagesEl) messagesEl.style.display = 'none';
    if (composerEl) composerEl.style.display = 'none';
  } else {
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (messagesEl) messagesEl.style.display = 'block';
    if (composerEl) composerEl.style.display = 'flex';
    for (const m of history) {
      appendMessage(m.role, m.content, { model: m.model, createdAt: m.createdAt });
    }
  }
  // Close mobile sidebar if open
  try { window.__lumora_closeMobileSidebar?.(); } catch (_) {}
}

function isGpt5Selected() {
  const id = localStorage.getItem('lumora_model') || '';
  return id === 'openai/gpt-5' || id === 'openai/gpt-5-mini' || id === 'openai/gpt-5-nano';
}

function tipReasoningOnlyForGpt5() {
  import('../ui/toast.js').then(({ showToast }) => showToast('思考力設定は GPT-5 選択時のみ利用できます'));
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function refreshHeroPreview() {
  const box = document.getElementById('heroPreview');
  if (!box) return;
  let items = [];
  try { items = JSON.parse(localStorage.getItem('lumora_attachments') || '[]'); } catch (_) { items = []; }
  box.innerHTML = '';
  if (!items.length) { box.setAttribute('hidden', ''); return; }
  box.removeAttribute('hidden');
  items.forEach((a, idx) => {
    const chip = document.createElement('div');
    chip.className = 'attach-chip';
    if (/^data:application\/pdf/i.test(a.dataUrl)) {
      const pdf = document.createElement('div');
      pdf.className = 'pdf';
      pdf.textContent = 'PDF';
      chip.appendChild(pdf);
    } else {
      const img = document.createElement('img');
      img.alt = a.name || 'image';
      img.src = a.dataUrl;
      chip.appendChild(img);
    }
    const tools = document.createElement('div');
    tools.className = 'tools';
    const remove = document.createElement('button');
    remove.textContent = '✕';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = items.slice(0, idx).concat(items.slice(idx + 1));
      localStorage.setItem('lumora_attachments', JSON.stringify(next));
      refreshHeroPreview();
    });
    const reattach = document.createElement('button');
    reattach.textContent = '📎';
    reattach.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('attachBtn')?.click();
    });
    tools.appendChild(reattach);
    tools.appendChild(remove);
    chip.appendChild(tools);
    box.appendChild(chip);
  });
}

// ===== Study Mode Badge =====
function syncStudyBadge() {
  try {
    const on = (localStorage.getItem('lumora_study_mode') || 'off') === 'on';
    const badge = document.getElementById('studyBadge');
    if (badge) badge.style.display = on ? '' : 'none';
  } catch (_) {}
}

// ===== Bookmark Bubble (お気に入り) =====
function setupBookmarkBubble() {
  const btn = document.getElementById('bookmarkBubble');
  if (!btn) return;
  const sync = () => {
    const hasChat = !!state.currentChatId && !!state.chats[state.currentChatId];
    if (!hasChat) { btn.setAttribute('hidden', ''); btn.classList.remove('show', 'fav'); return; }
    btn.removeAttribute('hidden');
    btn.classList.add('show');
    const fav = state.chats[state.currentChatId].favorite === true;
    btn.textContent = fav ? '★' : '☆';
    btn.title = fav ? 'お気に入りを解除' : 'このチャットをお気に入り';
    btn.classList.toggle('fav', fav);
  };
  if (!btn.__bound) {
    btn.__bound = true;
    btn.addEventListener('click', () => {
      if (!state.currentChatId) return;
      state.toggleFavorite(state.currentChatId);
      try { import('../ui/toast.js').then(({ showToast }) => showToast(state.chats[state.currentChatId].favorite ? 'お気に入りに追加' : 'お気に入りを解除')); } catch (_) {}
      sync();
      try { import('../ui/chat-list.js').then(({ renderChatList }) => renderChatList(state)); } catch (_) {}
    });
  }
  sync();
}

function init() {
  // Ensure viewport heights are correct on mobile Safari
  setupViewportUnitFallback();
  // モデル注入
  injectModels();
  setupModelSelector();

  // UIレンダリング
  renderSidebar();
  renderChatList(state);
  renderComposer();

  setupComposer();
  setupEmptyState();
  setupSettings(state);
  try { syncUserProfileFromStorage(); } catch (_) {}
  // Initialize tone badge from stored settings
  try {
    const mode = localStorage.getItem('lumora_emotion_mode') || 'off';
    const style = localStorage.getItem('lumora_emotion_style') || 'neutral';
    const badge = document.getElementById('toneBadge');
    if (badge) {
      if (mode === 'off') { badge.style.display = 'none'; }
      else { badge.textContent = 'Tone: ' + ({ neutral:'Neutral', empathetic:'Empathetic', cheerful:'Cheerful', professional:'Professional' }[style] || 'Neutral'); badge.style.display = ''; }
    }
    if ((document.documentElement.dataset.betaEmotionUi || 'off') === 'on') {
      document.documentElement.dataset.emotion = (mode === 'manual') ? style : (mode === 'off' ? 'neutral' : 'neutral');
    }
  } catch (_) {}
  // Initialize Study Mode badge
  try { syncStudyBadge(); } catch (_) {}
  // 新UI/UXフラグ適用（起動時）
  try {
    const flag = localStorage.getItem('lumora_newui') || 'off';
    document.documentElement.dataset.newui = flag;
  } catch (_) {}
  // Liquid Glass（実験）
  try {
    const glass = localStorage.getItem('lumora_glass') || 'off';
    document.documentElement.dataset.glass = glass;
  } catch (_) {}
  // Density & Contrast
  try {
    const d = localStorage.getItem('lumora_density') || 'comfortable';
    document.documentElement.dataset.density = (d === 'compact') ? 'compact' : 'comfortable';
  } catch (_) {}
  try {
    const c = localStorage.getItem('lumora_contrast') || 'off';
    document.documentElement.dataset.contrast = (c === 'on') ? 'high' : 'normal';
  } catch (_) {}
  // FII (Fluid Intelligence Interface) — default OFF, load persisted state
  try {
    const fii = localStorage.getItem('lumora_fii') || 'off';
    enableFII(fii === 'on');
  } catch (_) {}
  setupScrollBottom();
  setupScrollShadows();
  setupTopbarShadow();
  setupShortcuts();
  setupCommandPalette();
  setupBookmarkBubble();
  setupMobileSidebarToggle();
  // Quick focus on composer for faster start
  try { document.getElementById('input')?.focus(); } catch (_) {}
  // Drag & drop attachments
  try { setupDragAndDropAttachments(); } catch (_) {}

  // 既存チャット復元（選択中の会話にメッセージがある場合のみ）
  if (state.currentChatId) {
    const history = state.getMessages(state.currentChatId);
    const empty = !history || history.length === 0;
    const emptyStateEl = document.getElementById('emptyState');
    const messagesEl = document.getElementById('messages');
    const composerEl = document.getElementById('composer');

    if (empty) {
      // 空の会話 → ヒーローを表示、本文/コンポーザーは隠す
      if (emptyStateEl) emptyStateEl.style.display = 'block';
      if (messagesEl) messagesEl.style.display = 'none';
      if (composerEl) composerEl.style.display = 'none';
    } else {
      // 履歴あり → 通常表示
      if (emptyStateEl) emptyStateEl.style.display = 'none';
      if (messagesEl) messagesEl.style.display = 'block';
      if (composerEl) composerEl.style.display = 'flex';
      for (const m of history) {
        appendMessage(m.role, m.content, { model: m.model, createdAt: m.createdAt });
      }
    }
  }

  // Usageを表示（将来UIに反映可能）
  fetch('/api/usage').then(r => r.json()).then(u => {
    window.__usage = u;
    console.log('[usage]', u);
      // プランバッジの表示（新プラン体系）
      const badge = document.getElementById('planBadge');
      if (badge && window.__plan) badge.textContent = badge.textContent || String(window.__plan).toUpperCase();
  }).catch(() => {});
}

window.addEventListener('DOMContentLoaded', init);

// ============== 追加UX機能 ==============
function setSending(isSending, aborter) {
  __isSending = !!isSending;
  const send = document.getElementById('sendBtn');
  if (!send) return;
  if (isSending) {
    send.classList.add('stop');
    send.textContent = '■';
    send.title = '停止';
    send.onclick = () => { try { aborter?.(); } catch {} finally { setSending(false); } };
  } else {
    send.classList.remove('stop');
    send.textContent = '↑';
    send.title = '送信 (Enter)';
    // 既存の click ハンドラは addEventListener なので保持される
    send.onclick = null;
  }
}

function setupScrollBottom() {
  const btn = document.getElementById('scrollBottomBtn');
  const messages = document.getElementById('messages');
  if (!btn || !messages) return;
  const TOGGLE_AT = 120;
  let unread = 0;
  let pill = null;
  const sync = () => {
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < TOGGLE_AT;
    btn.classList.toggle('show', !nearBottom);
    if (nearBottom) {
      unread = 0;
      pill?.remove();
      pill = null;
    }
  };
  messages.addEventListener('scroll', sync);
  btn.addEventListener('click', () => messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' }));
  const ro = new ResizeObserver(sync);
  ro.observe(messages);

  // 新着ピル（新UIのみ）
  const ensurePill = () => {
    if (document.documentElement.dataset.newui !== 'on') return null;
    if (!pill) {
      pill = document.createElement('button');
      pill.className = 'new-pill';
      pill.textContent = '新着メッセージ';
      pill.addEventListener('click', () => {
        messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
        unread = 0; pill?.remove(); pill = null;
      });
      messages.after(pill);
    }
    return pill;
  };

  // メッセージ追加検知: appendMessage で呼び出されるため、MutationObserverで補足
  const mo = new MutationObserver(() => {
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < TOGGLE_AT;
    if (!nearBottom) {
      unread++;
      const p = ensurePill();
      if (p) p.textContent = `新着メッセージ (${unread})`;
    }
  });
  mo.observe(messages, { childList: true });
}

// スクロールシャドウ（メッセージ/サイドバー）を付与
function setupScrollShadows() {
  const messages = document.getElementById('messages');
  const chatList = document.getElementById('chatList');
  const sync = (el, clsTop, clsBottom) => {
    if (!el) return;
    const atTop = el.scrollTop <= 0;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
    el.classList.toggle(clsTop, !atTop);
    el.classList.toggle(clsBottom, !atBottom);
  };
  const syncMessages = () => sync(messages, 'has-top-shadow', 'has-bottom-shadow');
  const syncChat = () => sync(chatList, 'has-top-shadow', 'has-bottom-shadow');
  messages?.addEventListener('scroll', syncMessages);
  chatList?.addEventListener('scroll', syncChat);
  new ResizeObserver(() => { syncMessages(); syncChat(); }).observe(document.body);
  // 初期同期
  syncMessages();
  syncChat();
}

// トップバーの影（スクロール時）
function setupTopbarShadow() {
  const topbar = document.querySelector('.topbar');
  const messages = document.getElementById('messages');
  if (!topbar) return;
  const apply = () => {
    const scrolled = (window.scrollY || 0) > 0 || (messages?.scrollTop || 0) > 0;
    topbar.classList.toggle('scrolled', scrolled);
  };
  window.addEventListener('scroll', apply, { passive: true });
  messages?.addEventListener('scroll', apply, { passive: true });
  apply();
}

// ===== Command Palette (Cmd/Ctrl + K) =====
function setupCommandPalette() {
  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.innerHTML = `
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="コマンドパレット">
      <div class="cmdk-header">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input id="cmdkInput" class="cmdk-input" type="search" placeholder="コマンドやチャットを検索…" aria-label="検索" />
      </div>
      <div class="cmdk-body">
        <div class="cmdk-section">Commands</div>
        <div id="cmdkCommands"></div>
        <div class="cmdk-section">Chats</div>
        <div id="cmdkChats"></div>
        <div id="cmdkEmpty" class="cmdk-empty" hidden>一致する項目がありません</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#cmdkInput');
  const listCmd = overlay.querySelector('#cmdkCommands');
  const listChats = overlay.querySelector('#cmdkChats');
  const empty = overlay.querySelector('#cmdkEmpty');
  let open = false;

  const commands = [
    { id: 'new', label: '新しいチャット', hint: '⌘N', run: () => { const id = state.createChat({ title: '新しいチャット' }); state.selectChat(id); renderChatList(state); showToast('新しいチャットを作成'); location.reload(); } },
    { id: 'settings', label: '設定を開く', hint: '⌘,', run: () => openSettings() },
    { id: 'theme', label: 'テーマを切り替え（ライト/ダーク）', hint: '', run: () => { const cur = (localStorage.getItem('lumora_theme') || 'system'); const next = cur === 'dark' ? 'light' : 'dark'; localStorage.setItem('lumora_theme', next); const sel = document.getElementById('themeSelect'); if (sel) { sel.value = next; sel.dispatchEvent(new Event('change')); } else { document.documentElement.dataset.theme = next; } showToast(`テーマ: ${next}`); } },
    { id: 'sidebar', label: 'サイドバーの表示/非表示', hint: '⌘B', run: () => { try { document.getElementById('toggleSidebarBtn')?.click(); } catch(_){} } },
    { id: 'model', label: 'モデルセレクタを開く', hint: '⌘M', run: () => { const trig = document.querySelector('#customModelSelect .select-trigger'); trig?.click(); } },
    { id: 'focus', label: '入力欄にフォーカス', hint: '⌘J', run: () => { document.getElementById('input')?.focus(); } },
  ];

  function render() {
    const q = (input.value || '').toLowerCase();
    // Commands
    listCmd.innerHTML = '';
    const cmdMatches = commands.filter(c => c.label.toLowerCase().includes(q));
    for (const c of cmdMatches) {
      const el = document.createElement('div');
      el.className = 'cmdk-item';
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.innerHTML = `<span>${escapeHtml(c.label)}</span>${c.hint ? `<span class="k">${c.hint}</span>` : ''}`;
      el.addEventListener('click', () => { close(); requestAnimationFrame(() => c.run()); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); close(); c.run(); } });
      listCmd.appendChild(el);
    }
    // Chats
    listChats.innerHTML = '';
    const ids = state.order.slice();
    const matches = [];
    for (const id of ids) {
      const chat = state.chats[id]; if (!chat) continue;
      const title = String(chat.title || '');
      if (!q || title.toLowerCase().includes(q)) { matches.push({ id, title, fav: chat.favorite === true }); }
      if (matches.length >= 30) break;
    }
    for (const m of matches) {
      const el = document.createElement('div');
      el.className = 'cmdk-item';
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.innerHTML = `<span>${m.fav ? '⭐ ' : ''}${escapeHtml(m.title)}</span>`;
      el.addEventListener('click', () => { close(); state.selectChat(m.id); renderChatList(state); location.reload(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); close(); state.selectChat(m.id); renderChatList(state); location.reload(); } });
      listChats.appendChild(el);
    }
    const hasAny = cmdMatches.length + matches.length > 0;
    empty.hidden = hasAny;
  }

  function openPalette() {
    if (open) return;
    open = true;
    overlay.classList.add('open');
    render();
    setTimeout(() => input.focus(), 0);
  }
  function close() {
    if (!open) return;
    open = false;
    overlay.classList.remove('open');
    input.value = '';
  }
  input.addEventListener('input', render);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    const inField = /input|textarea|select/i.test((e.target?.tagName) || '') || (e.target?.isContentEditable);
    const key = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === 'k') { e.preventDefault(); if (open) close(); else openPalette(); }
    if (key === 'escape' && open) { e.preventDefault(); close(); }
  });
}

function setupShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    // Search chats
    if (mod && e.key.toLowerCase() === 'f') {
      const t = (e.target || {});
      const inField = /input|textarea|select/i.test((t.tagName) || '') || t.isContentEditable;
      if (!inField) { e.preventDefault(); document.getElementById('chatSearch')?.focus(); }
    }
    if (mod && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      document.getElementById('input')?.focus();
    }
    if (mod && e.key.toLowerCase() === 'enter') {
      const el = document.getElementById('sendBtn');
      if (el) { e.preventDefault(); el.click(); }
    }
    // New chat
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      try {
        const id = state.createChat({ title: '新しいチャット' });
        state.selectChat(id);
        renderChatList(state);
        location.reload();
      } catch (_) {}
    }
    // Toggle sidebar
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      try { document.getElementById('toggleSidebarBtn')?.click(); } catch (_) {}
    }
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) active.blur();
    }
    // Shift+Esc: clear input
    if (e.shiftKey && e.key === 'Escape') {
      try { const inp = document.getElementById('input'); if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); } } catch (_) {}
    }
    if (e.key === 'Escape') {
      const modal = document.getElementById('settingsModal');
      if (modal && !modal.classList.contains('hidden')) {
        document.getElementById('settingsCancel')?.click();
      }
    }
    // Open Settings
    if (mod && e.key === ',') {
      e.preventDefault();
      document.getElementById('settingsBtn')?.click();
    }
    // Copy latest assistant message: Ctrl/Cmd + Shift + C
    if (mod && e.shiftKey && e.key.toLowerCase() === 'c') {
      try {
        const nodes = Array.from(document.querySelectorAll('.bubble.assistant .content'));
        const last = nodes[nodes.length - 1];
        const text = last?.dataset?.raw || last?.innerText || '';
        if (text) { navigator.clipboard.writeText(text); showToast('最新の回答をコピーしました'); }
        e.preventDefault();
      } catch (_) {}
    }
    // Toggle Asobi Mode: Ctrl/Cmd + Shift + U
    if (mod && e.shiftKey && e.key.toLowerCase() === 'u') {
      try {
        const cur = localStorage.getItem('lumora_asobi') || 'off';
        const next = cur === 'on' ? 'off' : 'on';
        localStorage.setItem('lumora_asobi', next);
        document.documentElement.dataset.asobi = next;
        showToast(`Asobi Mode: ${next === 'on' ? 'ON' : 'OFF'}`);
      } catch (_) {}
      e.preventDefault();
    }
    // Toggle Trust Layer: Ctrl/Cmd + Shift + T
    if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
      try {
        const cur = localStorage.getItem('lumora_beta_trust_layer') || (document.documentElement.dataset.betaTrust || 'off');
        const next = cur === 'on' ? 'off' : 'on';
        localStorage.setItem('lumora_beta_trust_layer', next);
        document.documentElement.dataset.betaTrust = next;
        showToast(`Trust Layer: ${next === 'on' ? 'ON' : 'OFF'}`);
      } catch (_) {}
      e.preventDefault();
    }
    // 読み上げ停止ショートカット
    if (e.key.toLowerCase() === 'x') {
      try { window.speechSynthesis.cancel(); __utterance = null; } catch {}
    }
  });

  // オンライン/オフラインの簡易トースト
  window.addEventListener('offline', () => showToast('オフラインになりました。接続待機中…'));
  window.addEventListener('online', () => showToast('オンラインに復帰しました'));
}

// ================= 音声入力/読み上げ =================
function setupSpeechInput({ micBtn, micIndicator, input }) {
  if (!micBtn) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'このブラウザでは音声入力に対応していません';
    micIndicator?.setAttribute('hidden', '');
    return;
  }

  __recognition = new SpeechRecognition();
  __recognition.lang = 'ja-JP';
  __recognition.interimResults = true;
  __recognition.continuous = true;

  const start = () => {
    if (__isRecording) return;
    try { __recognition.start(); } catch {}
    __isRecording = true;
    micBtn.setAttribute('aria-pressed', 'true');
    micBtn.classList.add('recording');
    micIndicator?.removeAttribute('hidden');
  };
  const stop = () => {
    if (!__isRecording) return;
    try { __recognition.stop(); } catch {}
    __isRecording = false;
    micBtn.setAttribute('aria-pressed', 'false');
    micBtn.classList.remove('recording');
    micIndicator?.setAttribute('hidden', '');
  };

  micBtn.addEventListener('click', () => {
    if (__isRecording) stop(); else start();
  });

  __recognition.onresult = (e) => {
    let finalText = '';
    let interimText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interimText += res[0].transcript;
    }
    const current = input.value.replace(/\s+$/, '');
    input.value = (current + ' ' + (finalText || interimText)).trim();
    input.dispatchEvent(new Event('input'));
  };
  __recognition.onerror = () => { stop(); };
  __recognition.onend = () => { stop(); };

  // モバイルでの自動停止対策: 60秒で一旦止めて再開
  let keepAliveTimer = null;
  __recognition.onstart = () => {
    clearInterval(keepAliveTimer);
    keepAliveTimer = setInterval(() => {
      if (!__isRecording) return clearInterval(keepAliveTimer);
      try { __recognition.stop(); __recognition.start(); } catch {}
    }, 60000);
  };
}

export function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  try { window.speechSynthesis.cancel(); } catch {}
  const utter = new SpeechSynthesisUtterance(text);
  __utterance = utter;
  // 設定値の適用
  const rate = parseFloat(localStorage.getItem('lumora_tts_rate') || '1');
  utter.rate = isFinite(rate) ? rate : 1;
  const voiceUri = localStorage.getItem('lumora_tts_voice') || '';
  const voices = window.speechSynthesis.getVoices();
  if (voiceUri) {
    const v = voices.find(v => v.voiceURI === voiceUri || v.name === voiceUri);
    if (v) utter.voice = v;
  }
  utter.lang = utter.voice?.lang || 'ja-JP';
  window.speechSynthesis.speak(utter);
}

// ===== Drag & Drop Attachments =====
function setupDragAndDropAttachments() {
  const zone = document.getElementById('messages') || document.body;
  if (!zone) return;
  const onDragOver = (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
      e.preventDefault();
      zone.classList.add('dragover');
    }
  };
  const onDragLeave = () => zone.classList.remove('dragover');
  const onDrop = async (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer?.files || []);
    const accepted = files.filter(f => /image\//i.test(f.type) || /application\/pdf/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (!accepted.length) return;
    try {
      const enc = await Promise.all(accepted.map(f => fileToDataUrl(f)));
      const current = JSON.parse(localStorage.getItem('lumora_attachments') || '[]');
      const next = current.concat(enc.map((x, i) => ({ name: accepted[i].name, dataUrl: x })));
      localStorage.setItem('lumora_attachments', JSON.stringify(next));
      import('../ui/toast.js').then(({ showToast }) => showToast(`${accepted.length}件を添付しました（ドラッグ&ドロップ）`));
      try { refreshHeroPreview(); } catch (_) {}
    } catch (_) {}
  };
  zone.addEventListener('dragover', onDragOver);
  zone.addEventListener('dragleave', onDragLeave);
  zone.addEventListener('drop', onDrop);
}

// ===== プロフィール適用 =====
function syncUserProfileFromStorage() {
  const name = localStorage.getItem('lumora_user_name') || '';
  const avatar = localStorage.getItem('lumora_user_avatar') || '';
  const nameEl = document.getElementById('userNameDisplay');
  const img = document.getElementById('userAvatar');
  const fallback = document.getElementById('userAvatarFallback');
  if (nameEl) nameEl.textContent = name || 'ユーザー';
  const initial = (name || 'U').trim().slice(0,1).toUpperCase();
  if (avatar && img) {
    img.src = avatar; img.style.display = 'block';
    if (fallback) { fallback.textContent = initial; fallback.style.display = 'none'; }
  } else {
    if (img) img.style.display = 'none';
    if (fallback) { fallback.textContent = initial; fallback.style.display = 'grid'; }
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'lumora_user_name' || e.key === 'lumora_user_avatar') {
    try { syncUserProfileFromStorage(); } catch (_) {}
  }
});

// Utilities
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
