import { renderChatList } from '../ui/chat-list.js';
import { showToast } from '../ui/toast.js';
import { validateSystemPromptForSave } from '../safety/safety.js';
import { attachProjectsSettings } from './projects.js';
import { enableFII } from './fii.js';
import { allUiModels } from '../ui/model-selector.js';
import { getCanvasPreferences, setCanvasEnabled as persistCanvasEnabled, setCanvasMode as persistCanvasMode, debugOpenCanvas } from '../ui/canvas.js';
import { extractRviContent, renderRviBlocks } from '../ui/rvi/viewer.js';
import { renderMarkdown } from '../ui/markdown.js';

export function setupSettings(state) {
  const btn = document.getElementById('settingsBtn');
  const modal = document.getElementById('settingsModal');
  const closeBtn = document.getElementById('settingsClose');
  const cancelBtn = document.getElementById('settingsCancel');
  const saveBtn = document.getElementById('settingsSave');
  const range = document.getElementById('widthRange');
  const valueLabel = document.getElementById('widthValue');
  const themeSel = document.getElementById('themeSelect');
  const densitySel = document.getElementById('densitySelect');
  const contrastToggle = document.getElementById('contrastToggle');
  const simpleModeToggle = document.getElementById('simpleModeToggle');
  const newUiToggle = document.getElementById('newUiToggle');
  const fiiToggle = document.getElementById('fiiToggle');
  const rviToggle = document.getElementById('rviToggle');
  const asobiToggle = document.getElementById('asobiToggle');
  const glassToggle = document.getElementById('glassToggle');
  // Experiments: Micro-Pause Insight
  const microPauseToggle = document.getElementById('microPauseToggle');
  const microPauseModelSelect = document.getElementById('microPauseModelSelect');
  // Experiments: Lumora Canvas
  const canvasEnableGlobal = document.getElementById('canvasSettingsEnable');
  const canvasModeGroupGlobal = document.getElementById('canvasSettingsModeGroup');
  const canvasTestHtml = document.getElementById('canvasTestHtml');
  const canvasTestMd = document.getElementById('canvasTestMarkdown');
  const canvasTestText = document.getElementById('canvasTestText');
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
  // Pro (multi-model)
  const proModelList = document.getElementById('proModelList');
  const proModelCount = document.getElementById('proModelCount');
  const proIntegrateSelect = document.getElementById('proIntegrateSelect');
  const proEvoToggle = document.getElementById('proEvoToggle');
  const proEvoRoundsSelect = document.getElementById('proEvoRoundsSelect');
  // RVI Test controls
  const rviTestInput = document.getElementById('rviTestInput');
  const rviTestParseBtn = document.getElementById('rviTestParseBtn');
  const rviTestClearBtn = document.getElementById('rviTestClearBtn');
  const rviTestSampleJsonBtn = document.getElementById('rviTestSampleJsonBtn');
  const rviTestSampleTagBtn = document.getElementById('rviTestSampleTagBtn');
  const rviDemoKeypointsBtn = document.getElementById('rviDemoKeypointsBtn');
  const rviDemoStepsBtn = document.getElementById('rviDemoStepsBtn');
  const rviDemoChecklistBtn = document.getElementById('rviDemoChecklistBtn');
  const rviDemoTimelineBtn = document.getElementById('rviDemoTimelineBtn');
  const rviDemoComparisonBtn = document.getElementById('rviDemoComparisonBtn');
  const rviDemoTradeoffsBtn = document.getElementById('rviDemoTradeoffsBtn');
  const rviDemoCauseEffectBtn = document.getElementById('rviDemoCauseEffectBtn');
  const rviDemoMetricsBtn = document.getElementById('rviDemoMetricsBtn');
  const rviTestBubbleHost = document.getElementById('rviTestBubbleHost');
  const rviTestContent = document.getElementById('rviTestContent');
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
  valueLabel.textContent = localStorage.getItem('lumora_width') || '840';
  range.value = valueLabel.textContent;
  themeSel.value = localStorage.getItem('lumora_theme') || 'system';
  const newUi = localStorage.getItem('lumora_newui') || 'off';
  if (newUiToggle) newUiToggle.checked = newUi === 'on';
  const fii = localStorage.getItem('lumora_fii') || 'off';
  if (fiiToggle) fiiToggle.checked = fii === 'on';
  // RVI (default ON)
  const rvi = localStorage.getItem('lumora_rvi') || 'on';
  if (rviToggle) rviToggle.checked = rvi === 'on';
  try { document.documentElement.dataset.rvi = rvi; } catch (_) {}
  const asobi = localStorage.getItem('lumora_asobi') || 'off';
  if (asobiToggle) asobiToggle.checked = asobi === 'on';
  const glass = localStorage.getItem('lumora_glass') || 'off';
  if (glassToggle) glassToggle.checked = glass === 'on';
  // Micro-Pause Insight defaults (experimental: enabled by default)
  const mp = localStorage.getItem('lumora_micro_pause') || 'on';
  if (microPauseToggle) microPauseToggle.checked = mp === 'on';
  const mpModel = localStorage.getItem('lumora_micro_pause_model') || 'lfm-7b';
  if (microPauseModelSelect) microPauseModelSelect.value = mpModel;
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
  // Simple Mode 初期化
  const simpleMode = localStorage.getItem('lumora_simple') || 'off';
  if (simpleModeToggle) simpleModeToggle.checked = simpleMode === 'on';
  applySimple(simpleMode);
  // Density / Contrast 初期化
  const savedDensity = localStorage.getItem('lumora_density') || 'comfortable';
  if (densitySel) densitySel.value = savedDensity;
  applyDensity(savedDensity);
  const savedContrast = localStorage.getItem('lumora_contrast') || 'off';
  if (contrastToggle) contrastToggle.checked = savedContrast === 'on';
  applyContrast(savedContrast);
  applyNewUi(newUi);
  applyAsobi(asobi);
  applyGlass(glass);
  // Restore last RVI test input (if any)
  try {
    const last = localStorage.getItem('lumora_rvi_test_input') || '';
    if (rviTestInput && last) rviTestInput.value = last;
  } catch (_) {}
  try { import('../ui/model-selector.js').then(({ updateAchievementsUi }) => updateAchievementsUi()).catch(() => {}); } catch (_) {}
  // Projects manager UI
  try { attachProjectsSettings(state); } catch (_) {}
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
  // Canvas settings init
  try {
    const prefs = getCanvasPreferences();
    if (canvasEnableGlobal) canvasEnableGlobal.checked = !!prefs.enabled;
    const radios = canvasModeGroupGlobal ? Array.from(canvasModeGroupGlobal.querySelectorAll('input[name="canvasSettingsMode"]')) : [];
    const activeMode = prefs.enabled ? (prefs.storedMode || 'auto') : 'off';
    radios.forEach(r => {
      r.checked = (r.value === activeMode);
      r.disabled = !prefs.enabled;
    });
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

  // Pro: Multi-model settings init (model selection + integrate model)
  try {
    const selected = (() => { try { return JSON.parse(localStorage.getItem('lumora_pro_models') || '[]'); } catch (_) { return []; } })();
    // Render model checkboxes
    if (proModelList) {
      // Exclude pseudo entries that are not real provider endpoints
      const models = allUiModels().filter(m => m.id !== 'lumora/pro' && m.id !== 'auto');
      proModelList.innerHTML = '';
      const mkItem = (m) => {
        const id = `pro_${m.id.replace(/[^a-z0-9]+/gi, '_')}`;
        const wrap = document.createElement('label');
        wrap.className = 'pro-item';
        wrap.innerHTML = `<input type="checkbox" id="${id}" value="${m.id}" ${selected.includes(m.id) ? 'checked' : ''} /> <span class="pro-name">${m.label}</span>`;
        if (selected.includes(m.id)) wrap.classList.add('selected');
        return wrap;
      };
      models.forEach(m => proModelList.appendChild(mkItem(m)));
      // Limit selection to 4
      const enforce = () => {
        const checks = Array.from(proModelList.querySelectorAll('input[type="checkbox"]'));
        const chosen = checks.filter(c => c.checked).map(c => c.value);
        const count = chosen.length;
        if (proModelCount) proModelCount.textContent = `${count} / 4 選択中`;
        // Disable unchecked if >=4
        checks.forEach(c => { c.disabled = !c.checked && count >= 4; });
        // Selected state style
        checks.forEach(c => { const label = c.closest('label.pro-item'); if (label) label.classList.toggle('selected', c.checked); });
      };
      proModelList.addEventListener('change', enforce);
      enforce();
    }

    // Populate integrate model dropdown
    if (proIntegrateSelect) {
      // Exclude pseudo entries from integration candidates as well
      const models = allUiModels().filter(m => m.id !== 'lumora/pro' && m.id !== 'auto');
      const saved = localStorage.getItem('lumora_pro_integrate_model') || 'openai/gpt-5-nano';
      proIntegrateSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
      proIntegrateSelect.value = models.some(m => m.id === saved) ? saved : 'openai/gpt-5-nano';
    }
    // Evolution loop: initialize defaults (default ON)
    try {
      const evoStored = localStorage.getItem('lumora_pro_evo');
      const evoOn = (evoStored === null) ? true : evoStored === 'on';
      if (proEvoToggle) proEvoToggle.checked = evoOn;
    } catch (_) {}
    try {
      const roundsStored = localStorage.getItem('lumora_pro_evo_rounds') || '4';
      if (proEvoRoundsSelect) proEvoRoundsSelect.value = roundsStored;
    } catch (_) {}
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

  // ===== Admin: Secret hotkey to disable rate limit =====
  // While settings modal is open, press Meta(Command) + A + B + C simultaneously
  // Prompts for password and unlocks rate-limit for current session if correct.
  try {
    if (!setupSettings.__adminKeyBound) {
      setupSettings.__adminKeyBound = true;
      const down = new Set();
      const isOpen = () => !modal.classList.contains('hidden');
      const resetSoon = () => setTimeout(() => down.clear(), 800);
      document.addEventListener('keydown', async (e) => {
        // Track pressed keys
        down.add(String(e.key || '').toLowerCase());
        // Only act when settings is open
        if (!isOpen()) return;
        const hasMeta = e.metaKey || down.has('meta');
        const need = ['a','b','c'];
        if (hasMeta && need.every(k => down.has(k))) {
          e.preventDefault();
          down.clear();
          resetSoon();
          const pw = prompt('管理者パスワードを入力（Rate Limit 無効化）');
          if (pw === null) return;
          try {
            const resp = await fetch('/api/admin/unlock-rate-limit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pass: pw })
            });
            if (!resp.ok) {
              const msg = await resp.text().catch(()=>'');
              showToast('パスワードが違います', { ms: 2200, type: 'error' });
              return;
            }
            showToast('Rate Limit を無効化しました（この端末の現在のセッション）', { ms: 2600, type: 'success' });
            try { document.documentElement.dataset.rateLimit = 'off'; } catch (_) {}
          } catch (_) {
            showToast('通信エラー', { ms: 2000, type: 'error' });
          }
        }
      });
      document.addEventListener('keyup', (e) => {
        down.delete(String(e.key || '').toLowerCase());
      });
    }
  } catch (_) {}

  // Tabs: Accessible tab switching for settings categories
  try {
    const tabList = modal?.querySelector('.settings-tabs');
    const tabs = tabList ? Array.from(tabList.querySelectorAll('[role="tab"]')) : [];
    const panels = modal ? Array.from(modal.querySelectorAll('[role="tabpanel"]')) : [];
    const activate = (panelId) => {
      if (!panelId) return;
      tabs.forEach(t => {
        const sel = t.getAttribute('aria-controls') === panelId;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.classList.toggle('active', sel);
        t.tabIndex = sel ? 0 : -1;
      });
      panels.forEach(p => {
        const sel = p.id === panelId;
        if (sel) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
        p.classList.toggle('active', sel);
      });
      try { localStorage.setItem('lumora_settings_tab', panelId); } catch (_) {}
    };
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => activate(tab.getAttribute('aria-controls')));
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(tab.getAttribute('aria-controls')); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = (idx + dir + tabs.length) % tabs.length;
          tabs[next].focus();
        }
      });
    });
    // Initialize selected tab
    let initial = null;
    try { initial = localStorage.getItem('lumora_settings_tab'); } catch (_) {}
    if (!initial || !panels.some(p => p.id === initial)) initial = panels[0]?.id || null;
    if (initial) activate(initial);
  } catch (_) {}

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
  densitySel?.addEventListener('change', () => {
    applyDensity(densitySel.value);
    const wrapper = densitySel.closest('.custom-select-wrapper');
    if (wrapper) { wrapper.classList.add('changed'); setTimeout(() => wrapper.classList.remove('changed'), 300); }
  });
  contrastToggle?.addEventListener('change', () => {
    applyContrast(contrastToggle.checked ? 'on' : 'off');
  });
  simpleModeToggle?.addEventListener('change', () => {
    const flag = simpleModeToggle.checked ? 'on' : 'off';
    applySimple(flag);
  });
  fiiToggle?.addEventListener('change', () => {
    const flag = fiiToggle.checked ? 'on' : 'off';
    try { enableFII(flag === 'on'); } catch (_) {}
  });
  rviToggle?.addEventListener('change', () => {
    const flag = rviToggle.checked ? 'on' : 'off';
    try { localStorage.setItem('lumora_rvi', flag); } catch (_) {}
    try {
      document.documentElement.dataset.rvi = flag;
      // Hide/show existing RVI bubbles immediately
      document.querySelectorAll('.rvi-bubble').forEach(el => { el.style.display = (flag === 'off') ? 'none' : ''; });
    } catch (_) {}
  });

  // ===== RVI Test: parse and render into the host bubble =====
  function runRviTestPreview(srcText) {
    if (!rviTestBubbleHost || !rviTestContent) return;
    // Keep original RVI setting, but ensure rendering is possible in preview
    const prevRvi = document.documentElement.dataset.rvi || '';
    if ((prevRvi || 'on') === 'off') {
      // Temporarily enable for preview only (do not persist)
      try { document.documentElement.dataset.rvi = 'on'; } catch (_) {}
    }
    try {
      const { text, blocks } = extractRviContent(String(srcText || ''));
      // Render cleaned markdown text in the content area (like a normal assistant reply body)
      rviTestContent.innerHTML = renderMarkdown(text || '');
      // Render RVI blocks after the meta inside our pseudo bubble-main
      renderRviBlocks({ hostBubble: rviTestBubbleHost, blocks, meta: {} });
      try { localStorage.setItem('lumora_rvi_test_input', String(srcText || '')); } catch (_) {}
      showToast(`RVI 解析完了（${Array.isArray(blocks) ? blocks.length : 0} ブロック）`);
    } catch (e) {
      showToast('RVI 解析に失敗しました');
    } finally {
      // Restore original RVI state (do not forcibly keep on)
      try { if (prevRvi) document.documentElement.dataset.rvi = prevRvi; } catch (_) {}
    }
  }

  // Bind buttons if present
  rviTestParseBtn?.addEventListener('click', () => {
    const src = rviTestInput?.value || '';
    if (!src.trim()) { showToast('テスト入力が空です'); return; }
    runRviTestPreview(src);
  });
  rviTestClearBtn?.addEventListener('click', () => {
    if (rviTestInput) rviTestInput.value = '';
    if (rviTestContent) rviTestContent.innerHTML = '';
    try { const exist = rviTestBubbleHost?.querySelector('.rvi-bubble'); exist?.remove(); } catch (_) {}
    try { localStorage.removeItem('lumora_rvi_test_input'); } catch (_) {}
  });
  rviTestSampleJsonBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `ここに視覚サマリーを表示します。\n\n【RVI-JSON】\n{\n  "type": "keypoints",\n  "version": "1.0",\n  "payload": {\n    "title": "本日の要点",\n    "items": [\n      { "title": "設計", "detail": "RVI の構成と責務を分離" },\n      ["実装", "JSON/タグの両対応"],\n      "動作確認 (Settings > 実験)"\n    ]\n  }\n}\n【/RVI-JSON】\n\n【RVI-JSON】\n{\n  "type": "steps",\n  "payload": {\n    "title": "次のステップ",\n    "steps": [\n      { "title": "UIを整える", "status": "done" },\n      { "title": "パーサ調整", "detail": "境界ケース対応", "status": "wip" },\n      { "title": "結合テスト", "duration": "~10m" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviTestSampleTagBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `タグベースの記法: \n\n[rviKeypoints title="検討項目"]\n- デザイン調整\n- パフォーマンス\n- アクセシビリティ\n[/rviKeypoints]\n\n[rviComparison title="候補の比較" subtitle="A vs B" criteria='速度|品質|コスト']\n{ "options": [\n  { "title": "A案", "summary": "高速", "pros": ["スループット高"], "cons": ["品質ばらつき"] },\n  { "title": "B案", "summary": "安定", "pros": ["品質が高い"], "cons": ["やや遅い"] }\n]}\n[/rviComparison]`;
  });

  // RVI Demo Buttons (8 types)
  rviDemoKeypointsBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `要点のデモです。\n\n【RVI-JSON】\n{\n  "type": "keypoints",\n  "payload": {\n    "title": "会議の要点",\n    "subtitle": "Sprint 15",\n    "items": [\n      { "title": "進捗", "detail": "80% 完了" },\n      ["課題", "パフォーマンス最適化"],\n      "次のアクションを明確化"
    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoStepsBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `手順のデモです。\n\n【RVI-JSON】\n{\n  "type": "steps",\n  "payload": {\n    "title": "リリース手順",\n    "subtitle": "v1.2.0",\n    "steps": [\n      { "title": "コードフリーズ", "status": "done" },\n      { "title": "結合テスト", "detail": "主要フロー", "duration": "~30m", "status": "wip" },\n      { "title": "本番デプロイ", "duration": "~10m" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoChecklistBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `チェックリストのデモです。\n\n【RVI-JSON】\n{\n  "type": "checklist",\n  "payload": {\n    "title": "出荷前チェック",\n    "items": [\n      { "label": "README 更新", "done": true },\n      { "label": "CHANGELOG 追加", "done": true },\n      { "label": "エラー監視設定", "done": false, "note": "Sentry DSN" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoTimelineBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `タイムラインのデモです。\n\n【RVI-JSON】\n{\n  "type": "timeline",\n  "payload": {\n    "title": "プロジェクトの里程標",\n    "events": [\n      { "timestamp": "Q1", "title": "要件定義", "status": "done" },\n      { "timestamp": "Q2", "title": "実装", "status": "wip", "detail": "主要機能" },\n      { "timestamp": "Q3", "title": "公開", "status": "next" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoComparisonBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `比較のデモです。\n\n【RVI-JSON】\n{\n  "type": "comparison",\n  "payload": {\n    "title": "DB の比較",\n    "subtitle": "選定基準",\n    "criteria": ["性能", "可用性", "コスト"],\n    "options": [\n      { "title": "Postgres", "summary": "万能", "pros": ["成熟"], "cons": ["運用手間"], "attributes": { "性能": "高", "可用性": "中", "コスト": "中" } },\n      { "title": "DynamoDB", "summary": "マネージド", "pros": ["スケール"], "cons": ["設計のクセ"], "attributes": { "性能": "中", "可用性": "高", "コスト": "中〜高" } }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoTradeoffsBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `トレードオフのデモです。\n\n【RVI-JSON】\n{\n  "type": "tradeoffs",\n  "payload": {\n    "title": "API 設計の選択",\n    "options": [\n      { "title": "REST", "gains": ["広く普及", "キャッシュしやすい"], "costs": ["柔軟性に限界"] },\n      { "title": "GraphQL", "gains": ["柔軟", "過不足ない取得"], "costs": ["ゲートウェイ複雑化"] }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoCauseEffectBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `因果関係のデモです。\n\n【RVI-JSON】\n{\n  "type": "cause-effect",\n  "payload": {\n    "title": "パフォーマンス要因",\n    "pairs": [\n      "DBインデックス不足 -> クエリ遅延",\n      ["大きな画像", "初期表示が遅い", "LCP に影響"],\n      { "cause": "メモリ不足", "effect": "スロットリング", "strength": "+強" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });
  rviDemoMetricsBtn?.addEventListener('click', () => {
    if (!rviTestInput) return;
    rviTestInput.value = `指標カードのデモです。\n\n【RVI-JSON】\n{\n  "type": "metrics",\n  "payload": {\n    "title": "今週の KPI",\n    "metrics": [\n      { "label": "CVR", "value": "3.4%", "delta": "+0.4pp", "target": "4.0%" },\n      ["DAU", "12,340", "+3%"],\n      { "label": "エラー率", "value": "0.12%", "delta": "-0.03pp", "note": "SLO 0.2%" }\n    ]\n  }\n}\n【/RVI-JSON】`;
  });

  // Micro-Pause Insight (Experimental)
  microPauseToggle?.addEventListener('change', () => {
    const flag = microPauseToggle.checked ? 'on' : 'off';
    localStorage.setItem('lumora_micro_pause', flag);
  });
  microPauseModelSelect?.addEventListener('change', () => {
    const v = microPauseModelSelect.value;
    localStorage.setItem('lumora_micro_pause_model', v);
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
  // Canvas settings interactions
  canvasEnableGlobal?.addEventListener('change', () => {
    const enabled = !!canvasEnableGlobal.checked;
    try { persistCanvasEnabled(enabled); } catch (_) {}
    // Enable/disable radios visually
    try {
      const radios = canvasModeGroupGlobal ? Array.from(canvasModeGroupGlobal.querySelectorAll('input[name="canvasSettingsMode"]')) : [];
      radios.forEach(r => { r.disabled = !enabled; });
      if (!enabled) {
        const off = canvasModeGroupGlobal?.querySelector('#canvasSettingsModeOff');
        if (off) off.checked = true;
      }
    } catch (_) {}
  });
  canvasModeGroupGlobal?.addEventListener('change', (e) => {
    const t = e.target;
    if (!t || t.name !== 'canvasSettingsMode') return;
    const mode = t.value;
    try { persistCanvasMode(mode); } catch (_) {}
    if (!canvasEnableGlobal?.checked && mode !== 'off') {
      canvasEnableGlobal.checked = true;
      try { persistCanvasEnabled(true); } catch (_) {}
    }
  });
  canvasTestHtml?.addEventListener('click', () => { try { debugOpenCanvas('html'); } catch (_) {} });
  canvasTestMd?.addEventListener('click', () => { try { debugOpenCanvas('markdown'); } catch (_) {} });
  canvasTestText?.addEventListener('click', () => { try { debugOpenCanvas('text'); } catch (_) {} });

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
      localStorage.setItem('lumora_simple', simpleModeToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_newui', newUiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_fii', fiiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_rvi', rviToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_asobi', asobiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_glass', glassToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_density', densitySel?.value || 'comfortable');
      localStorage.setItem('lumora_contrast', contrastToggle?.checked ? 'on' : 'off');
      // Labs save
      localStorage.setItem('lumora_labs_beta', labsBetaToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_labs_alpha', labsAlphaToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_labs_research', labsResearchToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_emotion_ui', emotionUiToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_trust_layer', trustLayerToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_beta_confidence', confidenceToggle?.checked ? 'on' : 'off');
      localStorage.setItem('lumora_tts_voice', ttsVoiceSelect.value);
      localStorage.setItem('lumora_tts_rate', ttsRateRange.value);
      // Pro: multi-model selected models only
      try {
        const selected = Array.from(proModelList?.querySelectorAll('input[type="checkbox"]') || []).filter(c => c.checked).slice(0, 4).map(c => c.value);
        localStorage.setItem('lumora_pro_models', JSON.stringify(selected));
        if (proIntegrateSelect) localStorage.setItem('lumora_pro_integrate_model', proIntegrateSelect.value);
        if (proEvoToggle) localStorage.setItem('lumora_pro_evo', proEvoToggle.checked ? 'on' : 'off');
        if (proEvoRoundsSelect) localStorage.setItem('lumora_pro_evo_rounds', proEvoRoundsSelect.value || '4');
      } catch (_) {}
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

// Expose a quick helper to open Settings > Experiments and run a sample RVI preview
export function testRviFunctionality(opts = {}) {
  const mode = (opts && opts.sample) || 'json';
  try { openSettings(); } catch (_) {}
  // Focus Experiments tab and scroll to the RVI test field, then auto-fill and parse
  setTimeout(() => {
    try { document.getElementById('tab-experiments')?.click(); } catch (_) {}
    const area = document.getElementById('rviTestField');
    if (area) area.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const fillBtn = mode === 'tag' ? document.getElementById('rviTestSampleTagBtn') : document.getElementById('rviTestSampleJsonBtn');
    fillBtn?.click();
    setTimeout(() => { try { document.getElementById('rviTestParseBtn')?.click(); } catch (_) {} }, 30);
  }, 30);
}

function applyWidth(px) {
  const heroInput = document.querySelector('.hero-input');
  if (heroInput) heroInput.style.maxWidth = `min(${px}px, 100%)`;
  try {
    // Expose as a CSS variable for consistent layout centering
    document.documentElement.style.setProperty('--message-width', `${px}px`);
  } catch (_) {}
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

function applyDensity(mode) {
  const root = document.documentElement;
  root.dataset.density = (mode === 'compact') ? 'compact' : 'comfortable';
}

function applyContrast(flag) {
  const root = document.documentElement;
  root.dataset.contrast = flag === 'on' ? 'high' : 'normal';
}

function applySimple(flag) {
  const root = document.documentElement;
  const on = flag === 'on' ? 'on' : 'off';
  root.dataset.simple = on;
  try {
    const h = document.querySelector('#emptyState h1');
    if (h) h.textContent = on === 'on' ? '今日は何をしましょうか？' : "Hello I’m Lumora.";
    const p = document.querySelector('#emptyState p');
    if (p) p.textContent = on === 'on' ? '' : 'Is there anything I can help you with?';
  } catch (_) {}
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
