import { renderChatList } from '../ui/chat-list.js';
import { showToast } from '../ui/toast.js';
import { validateSystemPromptForSave } from '../safety/safety.js';

export function setupSettings(state) {
  const btn = document.getElementById('settingsBtn');
  const modal = document.getElementById('settingsModal');
  const closeBtn = document.getElementById('settingsClose');
  const cancelBtn = document.getElementById('settingsCancel');
  const saveBtn = document.getElementById('settingsSave');
  const range = document.getElementById('widthRange');
  const valueLabel = document.getElementById('widthValue');
  const themeSel = document.getElementById('themeSelect');
  const newUiToggle = document.getElementById('newUiToggle');
  const asobiToggle = document.getElementById('asobiToggle');
  const glassToggle = document.getElementById('glassToggle');
  // Labs (Beta/Alpha/Research)
  const labsBetaToggle = document.getElementById('labsBetaToggle');
  const labsAlphaToggle = document.getElementById('labsAlphaToggle');
  const labsResearchToggle = document.getElementById('labsResearchToggle');
  const emotionUiToggle = document.getElementById('emotionUiToggle');
  const trustLayerToggle = document.getElementById('trustLayerToggle');
  const confidenceToggle = document.getElementById('confidenceToggle');
  const userNameInput = document.getElementById('usernameInput');
  const userImageInput = document.getElementById('userImageInput');
  const userImagePreview = document.getElementById('userImagePreview');
  const userImageName = document.getElementById('userImageName');
  const delCurrent = document.getElementById('deleteCurrentBtn');
  const delAll = document.getElementById('deleteAllBtn');
  const ttsVoiceSelect = document.getElementById('ttsVoiceSelect');
  const ttsRateRange = document.getElementById('ttsRateRange');
  const ttsRateValue = document.getElementById('ttsRateValue');
  const exportCurrentBtn = document.getElementById('exportCurrentBtn');
  const exportCurrentMdBtn = document.getElementById('exportCurrentMdBtn');
  const exportAllBtn = document.getElementById('exportAllBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');
  // System Prompt / Emotion Guard
  const systemPromptInput = document.getElementById('systemPromptInput');
  const systemPromptWarning = document.getElementById('systemPromptWarning');
  const emotionModeOff = document.getElementById('emotionModeOff');
  const emotionModeAuto = document.getElementById('emotionModeAuto');
  const emotionModeManual = document.getElementById('emotionModeManual');
  const emotionStyleSelect = document.getElementById('emotionStyleSelect');
  // APIキー関連のUIは撤去済み（環境変数等の既存設定を使用）
  // 念のため、過去バージョンで保存されたキーを読み出していた場合はクリア
  try {
    localStorage.removeItem('lumora_openrouter_key');
    localStorage.removeItem('lumora_groq_key');
  } catch (_) {}

  // 初期値
  valueLabel.textContent = localStorage.getItem('lumora_width') || '760';
  range.value = valueLabel.textContent;
  themeSel.value = localStorage.getItem('lumora_theme') || 'system';
  const newUi = localStorage.getItem('lumora_newui') || 'off';
  if (newUiToggle) newUiToggle.checked = newUi === 'on';
  const asobi = localStorage.getItem('lumora_asobi') || 'off';
  if (asobiToggle) asobiToggle.checked = asobi === 'on';
  const glass = localStorage.getItem('lumora_glass') || 'off';
  if (glassToggle) glassToggle.checked = glass === 'on';
  const savedName = localStorage.getItem('lumora_user_name') || '';
  if (userNameInput) userNameInput.value = savedName;
  const savedAvatar = localStorage.getItem('lumora_user_avatar') || '';
  if (savedAvatar && userImagePreview) {
    userImagePreview.src = savedAvatar;
    userImagePreview.style.display = 'block';
    if (userImageName) userImageName.textContent = '現在の画像';
  }
  applyWidth(parseInt(range.value, 10));
  applyTheme(themeSel.value);
  applyNewUi(newUi);
  applyAsobi(asobi);
  applyGlass(glass);
  try { import('../ui/model-selector.js').then(({ updateAchievementsUi }) => updateAchievementsUi()).catch(() => {}); } catch (_) {}
  // Labs initial apply
  try {
    const labsBeta = localStorage.getItem('lumora_labs_beta') || 'off';
    const labsAlpha = localStorage.getItem('lumora_labs_alpha') || 'off';
    const labsResearch = localStorage.getItem('lumora_labs_research') || 'off';
    if (labsBetaToggle) labsBetaToggle.checked = labsBeta === 'on';
    if (labsAlphaToggle) labsAlphaToggle.checked = labsAlpha === 'on';
    if (labsResearchToggle) labsResearchToggle.checked = labsResearch === 'on';
    document.documentElement.dataset.labsBeta = labsBeta;
    document.documentElement.dataset.labsAlpha = labsAlpha;
    document.documentElement.dataset.labsResearch = labsResearch;
  } catch (_) {}
  try {
    const emoUi = localStorage.getItem('lumora_beta_emotion_ui') || 'off';
    const trust = localStorage.getItem('lumora_beta_trust_layer') || 'off';
    const conf = localStorage.getItem('lumora_beta_confidence') || 'off';
    if (emotionUiToggle) emotionUiToggle.checked = emoUi === 'on';
    if (trustLayerToggle) trustLayerToggle.checked = trust === 'on';
    if (confidenceToggle) confidenceToggle.checked = conf === 'on';
    document.documentElement.dataset.betaEmotionUi = emoUi;
    document.documentElement.dataset.betaTrust = trust;
    document.documentElement.dataset.betaConfidence = conf;
    syncLabsScopesVisibility();
  } catch (_) {}
  // 既存の設定を使用するため、何もしない

  // TTS 初期化
  initVoices(ttsVoiceSelect);
  const savedVoice = localStorage.getItem('lumora_tts_voice') || '';
  if (savedVoice) ttsVoiceSelect.value = savedVoice;
  const savedRate = localStorage.getItem('lumora_tts_rate') || '1';
  ttsRateRange.value = savedRate;
  ttsRateValue.textContent = parseFloat(savedRate).toFixed(1);

  // System Prompt 初期化
  try {
    const sp = localStorage.getItem('lumora_system_prompt') || '';
    if (systemPromptInput) systemPromptInput.value = sp;
  } catch (_) {}
  // Emotion Guard 初期化
  try {
    const mode = localStorage.getItem('lumora_emotion_mode') || 'off';
    if (mode === 'auto' && emotionModeAuto) emotionModeAuto.checked = true;
    else if (mode === 'manual' && emotionModeManual) emotionModeManual.checked = true;
    else if (emotionModeOff) emotionModeOff.checked = true;
    const style = localStorage.getItem('lumora_emotion_style') || 'neutral';
    if (emotionStyleSelect) emotionStyleSelect.value = style;
    syncEmotionSelectDisabled();
  } catch (_) {}

  const open = () => {
    modal.classList.remove('hidden');
    // Add opening animation
    requestAnimationFrame(() => {
      modal.classList.add('opening');
    });
  };
  
  const close = () => {
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('opening', 'closing');
    }, 200);
  };
  
  btn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });

  range.addEventListener('input', () => {
    valueLabel.textContent = range.value;
    applyWidth(parseInt(range.value, 10));
    // Add visual feedback
    range.style.background = `linear-gradient(to right, var(--brand) 0%, var(--brand) ${((range.value - range.min) / (range.max - range.min)) * 100}%, #e5e7eb ${((range.value - range.min) / (range.max - range.min)) * 100}%, #e5e7eb 100%)`;
  });
  
  themeSel.addEventListener('change', () => {
    applyTheme(themeSel.value);
    // Add visual feedback for theme change
    const wrapper = themeSel.closest('.custom-select-wrapper');
    wrapper.classList.add('changed');
    setTimeout(() => wrapper.classList.remove('changed'), 300);
  });

  asobiToggle?.addEventListener('change', () => {
    const flag = asobiToggle.checked ? 'on' : 'off';
    applyAsobi(flag);
  });
  glassToggle?.addEventListener('change', () => {
    const flag = glassToggle.checked ? 'on' : 'off';
    applyGlass(flag);
  });
  // Labs toggles
  labsBetaToggle?.addEventListener('change', () => {
    const v = labsBetaToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.labsBeta = v;
    syncLabsScopesVisibility();
  });
  labsAlphaToggle?.addEventListener('change', () => {
    const v = labsAlphaToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.labsAlpha = v;
    syncLabsScopesVisibility();
  });
  labsResearchToggle?.addEventListener('change', () => {
    const v = labsResearchToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.labsResearch = v;
    syncLabsScopesVisibility();
  });
  emotionUiToggle?.addEventListener('change', () => {
    const v = emotionUiToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.betaEmotionUi = v;
  });
  trustLayerToggle?.addEventListener('change', () => {
    const v = trustLayerToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.betaTrust = v;
  });
  confidenceToggle?.addEventListener('change', () => {
    const v = confidenceToggle.checked ? 'on' : 'off';
    document.documentElement.dataset.betaConfidence = v;
  });

  // プロフィール: 画像プレビュー
  userImageInput?.addEventListener('change', async () => {
    const f = userImageInput.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    if (userImagePreview) {
      userImagePreview.src = url;
      userImagePreview.style.display = 'block';
    }
    if (userImageName) userImageName.textContent = f.name;
  });

  ttsVoiceSelect.addEventListener('change', () => {
    localStorage.setItem('lumora_tts_voice', ttsVoiceSelect.value);
  });
  ttsRateRange.addEventListener('input', () => {
    ttsRateValue.textContent = parseFloat(ttsRateRange.value).toFixed(1);
  });

  // Emotion Guard UI state
  emotionModeOff?.addEventListener('change', syncEmotionSelectDisabled);
  emotionModeAuto?.addEventListener('change', syncEmotionSelectDisabled);
  emotionModeManual?.addEventListener('change', syncEmotionSelectDisabled);

  saveBtn.addEventListener('click', () => {
    // Add saving animation
    saveBtn.classList.add('saving');
    saveBtn.disabled = true;
    
    setTimeout(() => {
      // System Prompt 保存前に検証
      try {
        if (systemPromptWarning) systemPromptWarning.style.display = 'none';
        const validation = validateSystemPromptForSave(systemPromptInput?.value || '');
        if (!validation.ok) {
          if (systemPromptWarning) systemPromptWarning.style.display = 'block';
          showToast(validation.message);
          saveBtn.classList.remove('saving');
          saveBtn.disabled = false;
          return;
        }
      } catch (_) {}

      localStorage.setItem('lumora_width', range.value);
      localStorage.setItem('lumora_theme', themeSel.value);
      localStorage.setItem('lumora_newui', newUiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_asobi', asobiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_glass', glassToggle?.checked ? 'on' : 'off');
      // Labs save
      localStorage.setItem('lumora_labs_beta', labsBetaToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_labs_alpha', labsAlphaToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_labs_research', labsResearchToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_emotion_ui', emotionUiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_trust_layer', trustLayerToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_confidence', confidenceToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_tts_voice', ttsVoiceSelect.value);
      localStorage.setItem('lumora_tts_rate', ttsRateRange.value);
      if (userNameInput) localStorage.setItem('lumora_user_name', userNameInput.value.trim());
      if (userImagePreview?.src) localStorage.setItem('lumora_user_avatar', userImagePreview.src);
      // System Prompt / Emotion Guard 保存
      if (systemPromptInput) localStorage.setItem('lumora_system_prompt', systemPromptInput.value);
      const emotionMode = emotionModeManual?.checked ? 'manual' : emotionModeAuto?.checked ? 'auto' : 'off';
      localStorage.setItem('lumora_emotion_mode', emotionMode);
      if (emotionMode === 'manual' && emotionStyleSelect) {
        localStorage.setItem('lumora_emotion_style', emotionStyleSelect.value || 'neutral');
      }
      // ヘッダーのトーンバッジを即時反映
      try {
        const badge = document.getElementById('toneBadge');
        if (badge) {
          if (emotionMode === 'off') { badge.style.display = 'none'; }
          else {
            const style = (emotionMode === 'manual' ? (emotionStyleSelect?.value || 'neutral') : 'neutral');
            const label = { neutral:'Neutral', empathetic:'Empathetic', cheerful:'Cheerful', professional:'Professional' }[style] || 'Neutral';
            badge.textContent = 'Tone: ' + label;
            badge.style.display = '';
          }
        }
      } catch (_) {}
      // APIキーは保存しない
      showToast('設定を保存しました');
      
      saveBtn.classList.remove('saving');
      saveBtn.disabled = false;
      close();
    }, 500);
  });

  delCurrent.addEventListener('click', () => {
    if (!state.currentChatId) {
      showToast('削除する会話がありません');
      return;
    }
    
    if (!confirm('この会話を削除しますか？この操作は取り消せません。')) return;
    
    delCurrent.classList.add('deleting');
    delCurrent.disabled = true;
    
    setTimeout(() => {
      const id = state.currentChatId;
      state.remove(id);
      renderChatList(state);
      showToast('会話を削除しました');
      location.reload();
    }, 300);
  });
  
  delAll.addEventListener('click', () => {
    if (!confirm('全ての会話履歴を削除しますか？この操作は取り消せません。')) return;
    
    delAll.classList.add('deleting');
    delAll.disabled = true;
    
    setTimeout(() => {
      localStorage.removeItem('lumora_state_v1');
      showToast('全履歴を削除しました');
      location.reload();
    }, 500);
  });

  // Export / Import
  exportCurrentBtn?.addEventListener('click', () => {
    if (!state.currentChatId) { showToast('エクスポートする会話がありません'); return; }
    const chat = state.chats[state.currentChatId];
    const data = { title: chat.title, createdAt: chat.createdAt, messages: chat.messages };
    downloadJson(data, `lumora-chat-${safeName(chat.title)}-${dateStamp()}.json`);
    showToast('現在の会話をエクスポートしました');
  });
  exportCurrentMdBtn?.addEventListener('click', () => {
    if (!state.currentChatId) { showToast('エクスポートする会話がありません'); return; }
    const chat = state.chats[state.currentChatId];
    const md = chatToMarkdown(chat);
    downloadText(md, `lumora-chat-${safeName(chat.title)}-${dateStamp()}.md`, 'text/markdown');
    showToast('現在の会話(Markdown)をエクスポートしました');
  });
  exportAllBtn?.addEventListener('click', () => {
    const data = { chats: state.chats, order: state.order, currentChatId: state.currentChatId };
    downloadJson(data, `lumora-all-${dateStamp()}.json`);
    showToast('全会話をエクスポートしました');
  });
  importBtn?.addEventListener('click', () => { importFileInput?.click(); });
  importFileInput?.addEventListener('change', async () => {
    const f = importFileInput.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const merged = importData(json, state);
      renderChatList(state);
      showToast(`インポートしました（${merged}件）`);
      location.reload();
    } catch (e) {
      showToast('インポートに失敗しました');
    } finally {
      importFileInput.value = '';
    }
  });
}

export function openSettings() {
  document.getElementById('settingsModal')?.classList.remove('hidden');
}

function applyWidth(px) {
  const el = document.querySelector('.hero-input');
  if (el) el.style.width = `min(${px}px, 88%)`;
  const messages = document.getElementById('messages');
  if (messages) messages.style.maxWidth = `${px + 120}px`;
}

function applyTheme(mode) {
  // system はメディアクエリに追従
  const root = document.documentElement;
  root.dataset.theme = mode;
  try {
    if (applyTheme._mql) { applyTheme._mql.removeEventListener('change', applyTheme._listener); applyTheme._mql = null; }
  } catch (_) {}
  if (mode === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { root.dataset.theme = mql.matches ? 'dark' : 'light'; };
    sync();
    mql.addEventListener('change', sync);
    applyTheme._mql = mql;
    applyTheme._listener = sync;
  }
}

function applyNewUi(flag) {
  document.documentElement.dataset.newui = flag === 'on' ? 'on' : 'off';
}

function applyAsobi(flag) {
  document.documentElement.dataset.asobi = flag === 'on' ? 'on' : 'off';
  if (flag === 'on') {
    // 日替わりテーマ（軽い色変化）
    try {
      const day = new Date().toISOString().slice(0,10);
      const hash = Array.from(day).reduce((a,c)=>a + c.charCodeAt(0), 0);
      const hues = [210, 260, 280, 200, 190, 230, 300]; // 空/夜空系
      const hue = hues[hash % hues.length];
      document.documentElement.style.setProperty('--brand', `hsl(${hue} 90% 60%)`);
      document.documentElement.style.setProperty('--accent', `hsl(${(hue+40)%360} 85% 62%)`);
    } catch (_) {}
  } else {
    // 既定トークンに戻す（CSS変数は tokens.css に依存）
    try {
      document.documentElement.style.removeProperty('--brand');
      document.documentElement.style.removeProperty('--accent');
    } catch (_) {}
  }
}

function applyGlass(flag) {
  document.documentElement.dataset.glass = flag === 'on' ? 'on' : 'off';
}

function syncEmotionSelectDisabled() {
  const manual = document.getElementById('emotionModeManual');
  const select = document.getElementById('emotionStyleSelect');
  if (!select || !manual) return;
  select.disabled = !manual.checked;
  select.style.opacity = manual.checked ? '1' : '0.6';
}

function syncLabsScopesVisibility() {
  try {
    const betaOn = (document.documentElement.dataset.labsBeta || 'off') === 'on';
    const alphaOn = (document.documentElement.dataset.labsAlpha || 'off') === 'on';
    const researchOn = (document.documentElement.dataset.labsResearch || 'off') === 'on';
    document.querySelectorAll('[data-labs-scope="beta"]').forEach(el => {
      el.style.display = betaOn ? '' : 'none';
    });
    document.querySelectorAll('[data-labs-scope="alpha"]').forEach(el => {
      el.style.display = alphaOn ? '' : 'none';
    });
    document.querySelectorAll('[data-labs-scope="research"]').forEach(el => {
      el.style.display = researchOn ? '' : 'none';
    });
  } catch (_) {}
}

//

function initVoices(selectEl) {
  if (!selectEl) return;
  const fill = () => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const options = voices
      .filter(v => /ja|Japanese/i.test(v.lang) || voices.length < 20) // 日本語優先、少ない環境では全て
      .map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`) // voiceURI を保存キーに
      .join('');
    selectEl.innerHTML = `<option value="">自動（ブラウザ既定）</option>${options}`;
  };
  try {
    fill();
    window.speechSynthesis?.addEventListener?.('voiceschanged', fill);
  } catch (_) {}
}

// ===== Export/Import helpers =====
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function dateStamp() {
  try { return new Date().toISOString().slice(0,19).replace(/[:T]/g,'-'); } catch { return 'export'; }
}
function safeName(s) { return String(s || 'chat').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0,50); }
function chatToMarkdown(chat) {
  const lines = [];
  lines.push(`# ${chat.title || 'Untitled'}`);
  lines.push('');
  for (const m of (chat.messages || [])) {
    const role = m.role === 'assistant' ? 'Assistant' : 'User';
    const model = m.model ? ` (${m.model})` : '';
    lines.push(`## ${role}${model}`);
    lines.push('');
    lines.push(String(m.content || ''));
    lines.push('');
  }
  return lines.join('\n');
}
function importData(json, state) {
  let imported = 0;
  if (json && json.chats && json.order) {
    // 全体状態のインポート（マージ）
    for (const id of json.order) {
      const c = json.chats[id];
      if (!c) continue;
      const newId = state.createChat({ title: c.title || 'Imported chat' });
      try {
        if (c.favorite) state.toggleFavorite(newId);
        if (c.project) state.setProject(newId, c.project);
      } catch (_) {}
      for (const m of (c.messages || [])) state.append(newId, m);
      imported++;
    }
    state.save();
    return imported;
  }
  if (json && json.title && Array.isArray(json.messages)) {
    const newId = state.createChat({ title: json.title });
    for (const m of (json.messages || [])) state.append(newId, m);
    state.save();
    return 1;
  }
  if (Array.isArray(json)) {
    // 配列で複数チャット
    for (const c of json) {
      if (!c || !Array.isArray(c.messages)) continue;
      const newId = state.createChat({ title: c.title || 'Imported chat' });
      for (const m of c.messages) state.append(newId, m);
      imported++;
    }
    state.save();
    return imported;
  }
  throw new Error('invalid import format');
}
