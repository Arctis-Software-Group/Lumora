// サーバー側 `server/providers/model-map.js` と同じプロバイダIDを保持
// id は OpenRouter の provider/model-id を格納し、表示は label を用いる
const MODELS = [
  // Lumora Auto - 自動ルーティング（擬似プラン）
  { label: 'Lumora Auto', id: 'auto', plan: 'auto', caps: ['smart'] },
  // Free Plan - 基本的なモデルを提供
  { label: 'GPT-OSS 20B', id: 'openai/gpt-oss-20b:free', plan: 'free', caps: ['fast'] },
  { label: 'Llama 3.2 3B', id: 'meta-llama/llama-3.2-3b-instruct', plan: 'free', caps: ['fast','code'] },
  { label: 'Kimi K2', id: 'moonshotai/kimi-k2:free', plan: 'free', caps: ['fast'] },
  { label: 'DeepSeek R1', id: 'deepseek/deepseek-r1-0528:free', plan: 'free', caps: ['reasoning'] },
  { label: 'Qwen 3', id: 'qwen/qwen3-235b-a22b:free', plan: 'free', caps: ['reasoning'] },
  { label: 'Qwen 3 30B Thinking', id: 'qwen/qwen3-30b-a3b-thinking-2507:free', plan: 'free', caps: ['reasoning'] },
  { label: 'Qwen 2.5 VL 32B', id: 'qwen/qwen2.5-vl-32b-instruct:free', plan: 'free', caps: ['vision'] },
  { label: 'LFM 7B', id: 'liquid/lfm-7b', plan: 'free', caps: ['fast'] },
  { label: 'Nemotron Nano 9B v2', id: 'nvidia/nemotron-nano-9b-v2', plan: 'free', caps: ['fast','code'] },

  // Go Plan - 安定性と多様な選択肢を提供
  { label: 'GPT-OSS 20B', id: 'openai/gpt-oss-20b', plan: 'go', caps: ['fast'] },
  { label: 'GLM-4.5 Air', id: 'z-ai/glm-4.5-air:free', plan: 'go', caps: ['fast'] },
  { label: 'Hunyuan-A13B', id: 'tencent/hunyuan-a13b-instruct', plan: 'go', caps: ['reasoning'] },
  { label: 'Amazon Nova Micro 1.0', id: 'amazon/nova-micro-v1', plan: 'go', caps: ['vision'] },
  { label: 'Amazon Nova Lite 1.0', id: 'amazon/nova-lite-v1', plan: 'go', caps: ['vision'] },
  { label: 'GPT-5 Nano', id: 'openai/gpt-5-nano', plan: 'go', caps: ['reasoning','fast'] },
  { label: 'GPT-OSS 120B', id: 'openai/gpt-oss-120b', plan: 'go', caps: ['reasoning'] },
  { label: 'Llama 4 Scout', id: 'meta-llama/llama-4-scout', plan: 'go', caps: ['code','reasoning'] },
  { label: 'Gemini 2.5 Flash Lite', id: 'google/gemini-2.5-flash-lite', plan: 'go', caps: ['vision','fast'] },
  { label: 'ERNIE 4.5', id: 'baidu/ernie-4.5-vl-28b-a3b', plan: 'go', caps: ['vision','reasoning'] },
  { label: 'Hermes 4 70B', id: 'nousresearch/hermes-4-70b', plan: 'go', caps: ['code','reasoning'] },

  // Pro Plan - 高度な推論とマルチモーダル機能を提供
  { label: 'DeepSeek V3.1', id: 'deepseek/deepseek-chat-v3.1', plan: 'pro', caps: ['reasoning'] },
  { label: 'GPT-5 Mini', id: 'openai/gpt-5-mini', plan: 'pro', caps: ['reasoning','fast'] },
  { label: 'GPT-5', id: 'openai/gpt-5', plan: 'pro', caps: ['reasoning'] },
  { label: 'Gemini 2.5 Flash', id: 'google/gemini-2.5-flash', plan: 'pro', caps: ['vision','fast'] },
  { label: 'Gemini 2.5 Pro', id: 'google/gemini-2.5-pro', plan: 'pro', caps: ['vision','reasoning'] },
  { label: 'Amazon Nova Pro 1.0', id: 'amazon/nova-pro-v1', plan: 'pro', caps: ['vision'] },
  { label: 'Grok 3 Mini', id: 'x-ai/grok-3-mini', plan: 'pro', caps: ['fast'] },
  { label: 'Grok Code Fast 1', id: 'x-ai/grok-code-fast-1', plan: 'pro', caps: ['code','fast'] },
  { label: 'Hermes 4 405B', id: 'nousresearch/hermes-4-405b', plan: 'pro', caps: ['code','reasoning'] },

  // Max Plan - 高度な機能と無修正モデルを提供
  { label: 'Uncensored Model', id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', plan: 'max', caps: ['fast'] },
  { label: 'Claude Sonnet 4.0', id: 'anthropic/claude-sonnet-4', plan: 'max', caps: ['reasoning'] },
  { label: 'GPT-4o', id: 'openai/gpt-4o', plan: 'max', caps: ['vision','reasoning'] },

  // Ultra Plan - 最高性能モデルを提供
  { label: 'Grok 4', id: 'x-ai/grok-4', plan: 'ultra', caps: ['reasoning'] },
  { label: 'o3-Pro', id: 'openai/o3-pro', plan: 'ultra', caps: ['reasoning'] }
];

export function injectModels() {
  const container = document.getElementById('modelSelectorContainer');
  if (!container) return;
  
  const savedRaw = localStorage.getItem('lumora_model');
  const saved = coerceToKnownId(savedRaw);
  if (saved && saved !== savedRaw) localStorage.setItem('lumora_model', saved);
  const selectedModel = MODELS.find(x => x.id === saved) || MODELS[0];
  
  container.innerHTML = `
    <div class="custom-select" id="customModelSelect">
      <div class="select-trigger" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-controls="modelList">
        <div class="selected-model">
          <span class="model-name">${selectedModel.label}</span>
          <span class="selected-meta" aria-hidden="true">
            <span class="plan-pill" data-plan="${selectedModel.plan}">${planLabel(selectedModel.plan)}</span>
            <span class="caps">${capsIcons(selectedModel.caps)}</span>
          </span>
        </div>
        <svg class="dropdown-arrow" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
      <div class="select-dropdown" id="modelDropdown">
        <div class="dropdown-tabs" role="tablist" aria-label="プランで絞り込み">
          <button class="plan-tab" role="tab" data-plan="all" aria-selected="true">All</button>
          <button class="plan-tab" role="tab" data-plan="auto" aria-selected="false">Auto</button>
          <button class="plan-tab" role="tab" data-plan="free" aria-selected="false">Free</button>
          <button class="plan-tab" role="tab" data-plan="go" aria-selected="false">Go</button>
          <button class="plan-tab" role="tab" data-plan="pro" aria-selected="false">Pro</button>
          <button class="plan-tab" role="tab" data-plan="max" aria-selected="false">Max</button>
          <button class="plan-tab" role="tab" data-plan="ultra" aria-selected="false">Ultra</button>
        </div>
        <div class="dropdown-quick">
          <button class="chip small filter-chip" data-filter="all" aria-pressed="true">すべて</button>
          <button class="chip small filter-chip" data-filter="reasoning">🧠 推論</button>
          <button class="chip small filter-chip" data-filter="vision">👁 画像</button>
          <button class="chip small filter-chip" data-filter="code">💻 コード</button>
          <button class="chip small filter-chip" data-filter="fast">⚡ 速い</button>
        </div>
        <div class="dropdown-search">
          <input type="text" placeholder="モデルを検索..." class="search-input" aria-label="モデルを検索">
          <button class="search-clear" title="クリア" aria-label="検索をクリア">×</button>
          <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </div>
        <div class="results-meta" aria-live="polite" aria-atomic="true"></div>
        <div class="model-list" id="modelList" role="listbox" aria-label="モデルを選択">
          ${generateFavoritesGroup()}
          ${generateRecentGroup()}
          ${generateModelGroups()}
        </div>
        <div class="empty-results" hidden>該当するモデルがありません</div>
      </div>
    </div>
  `;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('lumora_model_favs') || '[]'); } catch (_) { return []; }
}
function setFavorites(list) {
  try { localStorage.setItem('lumora_model_favs', JSON.stringify(Array.from(new Set(list)))); } catch (_) {}
}
function getRecent() {
  try { return JSON.parse(localStorage.getItem('lumora_model_recent') || '[]'); } catch (_) { return []; }
}
function pushRecent(id) {
  const next = [id].concat(getRecent().filter(x => x !== id)).slice(0, 5);
  try { localStorage.setItem('lumora_model_recent', JSON.stringify(next)); } catch (_) {}
}

function capsIcons(caps = []) {
  const icon = (c) => c === 'vision' ? '👁' : c === 'reasoning' ? '🧠' : c === 'fast' ? '⚡' : c === 'code' ? '💻' : '';
  return (caps || []).slice(0,3).map(c => `<span class="cap" title="${c}">${icon(c)}</span>`).join('');
}

function generateFavoritesGroup() {
  const favs = getFavorites();
  if (!favs.length) return '';
  const items = favs.map(id => MODELS.find(m => m.id === id)).filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="model-group is-favs" role="group" aria-labelledby="group-favs">
      <div class="group-header" id="group-favs"><span class="group-icon">⭐</span><span class="group-label">Favorites</span><span class="model-count">${items.length}</span></div>
      <div class="model-options">
        ${items.map(m => modelOptionHtml(m)).join('')}
      </div>
    </div>
  `;
}

function generateRecentGroup() {
  const rec = getRecent();
  if (!rec.length) return '';
  const items = rec.map(id => MODELS.find(m => m.id === id)).filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="model-group is-recent" role="group" aria-labelledby="group-recent">
      <div class="group-header" id="group-recent"><span class="group-icon">🕒</span><span class="group-label">Recent</span><span class="model-count">${items.length}</span></div>
      <div class="model-options">
        ${items.map(m => modelOptionHtml(m)).join('')}
      </div>
    </div>
  `;
}

function generateModelGroups() {
  const groups = [
    { label: 'Lumora', key: 'auto', icon: '✨' },
    { label: 'Free', key: 'free', icon: '🆓' },
    { label: 'Go', key: 'go', icon: '✨' },
    { label: 'Pro', key: 'pro', icon: '⚡' },
    { label: 'Max', key: 'max', icon: '🚀' },
    { label: 'Ultra', key: 'ultra', icon: '🏆' }
  ];
  
  return groups.map(group => {
    const models = MODELS.filter(m => m.plan === group.key);
    if (models.length === 0) return '';
    
    return `
      <div class="model-group" role="group" aria-labelledby="group-${group.key}">
        <div class="group-header" id="group-${group.key}">
          <span class="group-icon">${group.icon}</span>
          <span class="group-label">${group.label}</span>
          <span class="model-count">${models.length}</span>
        </div>
        <div class="model-options">
          ${models.map(model => modelOptionHtml(model)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function modelOptionHtml(model) {
  const favs = new Set(getFavorites());
  const faved = favs.has(model.id);
  const caps = capsIcons(model.caps);
  return `
    <div class="model-option" data-value="${model.id}" role="option" aria-selected="false" tabindex="0">
      <div class="model-info">
        <span class="model-name">${model.label}</span>
        <span class="model-plan" data-plan="${model.plan}">${planLabel(model.plan)} ${caps ? `<span class="caps">${caps}</span>` : ''}</span>
      </div>
      <div class="model-tools">
        <button class="fav-btn" data-fav="${faved ? 'on' : 'off'}" title="お気に入りに${faved ? '解除' : '追加'}" aria-pressed="${faved ? 'true' : 'false'}">${faved ? '★' : '☆'}</button>
        <div class="model-indicator ${model.plan}" aria-hidden="true"></div>
      </div>
    </div>`;
}

export function setupModelSelector() {
  const customSelect = document.getElementById('customModelSelect');
  const badge = document.getElementById('planBadge');
  const nameEl = document.getElementById('userNameDisplay');
  
  if (!customSelect) return;
  
  const trigger = customSelect.querySelector('.select-trigger');
  const dropdown = customSelect.querySelector('.select-dropdown');
  const searchInput = customSelect.querySelector('.search-input');
  const searchClear = customSelect.querySelector('.search-clear');
  const filterChips = customSelect.querySelectorAll('.filter-chip');
  const planTabs = customSelect.querySelectorAll('.plan-tab');
  const resultsMeta = customSelect.querySelector('.results-meta');
  const emptyResults = customSelect.querySelector('.empty-results');
  const modelList = customSelect.querySelector('.model-list');
  let modelOptions = customSelect.querySelectorAll('.model-option');

  let isOpen = false;
  let currentCapsFilter = (localStorage.getItem('lumora_model_caps_filter') || 'all');
  let currentPlanFilter = (localStorage.getItem('lumora_model_plan_filter') || 'all');
  
  // Toggle dropdown
  const toggleDropdown = () => {
    isOpen = !isOpen;
    trigger.setAttribute('aria-expanded', isOpen);
    dropdown.classList.toggle('open', isOpen);
    customSelect.classList.toggle('open', isOpen);

    if (isOpen) {
      searchInput.focus();
      requestAnimationFrame(() => {
        const selected = dropdown.querySelector('.model-option.selected');
        if (selected) {
          selected.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  };

  // Global shortcut: Ctrl/Cmd + M to toggle
  document.addEventListener('keydown', (e) => {
    const key = String(e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === 'm') {
      e.preventDefault();
      if (isOpen) closeDropdown(); else toggleDropdown();
    }
  });
  
  // Close dropdown
  const closeDropdown = () => {
    if (!isOpen) return;
    isOpen = false;
    trigger.setAttribute('aria-expanded', false);
    dropdown.classList.remove('open');
    customSelect.classList.remove('open');
    // 検索は残す（次回に活かす）
  };
  
  // Select model
  const selectModel = (modelId) => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return;
    
    // Update UI
    const selectedModel = trigger.querySelector('.selected-model');
    selectedModel.querySelector('.model-name').textContent = model.label;
    const meta = selectedModel.querySelector('.selected-meta');
    if (meta) {
      meta.innerHTML = `<span class="plan-pill" data-plan="${model.plan}">${planLabel(model.plan)}</span><span class="caps">${capsIcons(model.caps)}</span>`;
    }
    // プランバッジはUIから除去
    
    // Update selected state
  modelOptions.forEach(opt => { opt.classList.remove('selected'); opt.setAttribute('aria-selected', 'false'); });
  const active = dropdown.querySelector(`[data-value="${modelId}"]`);
  if (active) { active.classList.add('selected'); active.setAttribute('aria-selected', 'true'); }
    
    // Save to localStorage and update badge
    localStorage.setItem('lumora_model', modelId);
    const planKey = model.plan || 'free';
    if (badge) {
      badge.textContent = planLabel(planKey);
      localStorage.setItem('lumora_plan', planKey);
    }
    window.__plan = planKey;
    // 最近使ったモデルに追加
    pushRecent(modelId);
    try {
      window.dispatchEvent(new CustomEvent('model-changed', { detail: { id: modelId, plan: planKey } }));
    } catch (_) {}
    // GPT-5 選択時は thinking エフェクトが変わる旨を軽く表示（Asobi時のみ）
    try {
      if (document.documentElement.dataset.asobi === 'on' && (modelId === 'openai/gpt-5' || modelId === 'openai/gpt-5-mini' || modelId === 'openai/gpt-5-nano')) {
        import('./toast.js').then(({ showToast }) => showToast('GPT-5系の思考エフェクトを適用'));
      }
    } catch (_) {}
    
    closeDropdown();
  };
  
  // Filter models based on search
  const filterModels = (query) => {
    const groups = dropdown.querySelectorAll('.model-group');
    let totalVisible = 0;
    groups.forEach(group => {
      const options = group.querySelectorAll('.model-option');
      let visibleCount = 0;

      options.forEach(option => {
        const nameEl = option.querySelector('.model-name');
        const raw = nameEl.textContent;
        const modelName = raw.toLowerCase();
        const q = query.toLowerCase();
        // capability filter
        const id = option.getAttribute('data-value');
        const m = MODELS.find(x => x.id === id);
        const capsOk = currentCapsFilter === 'all' || (m?.caps || []).includes(currentCapsFilter);
        const planOk = currentPlanFilter === 'all' || (m?.plan || 'free') === currentPlanFilter || (currentPlanFilter === 'auto' && m?.plan === 'auto');
        const matches = modelName.includes(q) && capsOk && planOk;
        option.style.display = matches ? 'flex' : 'none';
        // 簡易ハイライト
        if (q) {
          const i = modelName.indexOf(q);
          if (i >= 0) {
            const before = raw.slice(0, i);
            const mid = raw.slice(i, i + q.length);
            const after = raw.slice(i + q.length);
            nameEl.innerHTML = `${escapeHtml(before)}<mark>${escapeHtml(mid)}</mark>${escapeHtml(after)}`;
          }
        } else {
          nameEl.textContent = raw;
        }
        if (matches) visibleCount++;
      });

      group.style.display = visibleCount > 0 ? 'block' : 'none';
      totalVisible += visibleCount;
    });
    // 結果の件数と空表示
    if (resultsMeta) resultsMeta.textContent = `${totalVisible} 件`;
    if (emptyResults) emptyResults.hidden = totalVisible !== 0;
    // 保存
    try {
      localStorage.setItem('lumora_model_caps_filter', currentCapsFilter);
      localStorage.setItem('lumora_model_plan_filter', currentPlanFilter);
      localStorage.setItem('lumora_model_search', query || '');
    } catch (_) {}
  };
  
  // Event listeners
  trigger.addEventListener('click', toggleDropdown);
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
      if (isOpen) searchInput.select();
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      toggleDropdown();
      // 最初の表示中オプションへ
      requestAnimationFrame(() => {
        const first = Array.from(dropdown.querySelectorAll('.model-option')).find(el => el.style.display !== 'none');
        if (first) first.focus();
      });
    }
  });

  searchInput.addEventListener('input', (e) => {
    filterModels(e.target.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      trigger.focus();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = Array.from(dropdown.querySelectorAll('.model-option')).find(el => el.style.display !== 'none');
      if (first) first.focus();
    }
  });

  if (searchClear) {
    searchClear.addEventListener('click', (e) => {
      e.stopPropagation();
      searchInput.value = '';
      filterModels('');
      searchInput.focus();
    });
  }
  
  const bindOptionEvents = () => {
    modelOptions = customSelect.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
      option.addEventListener('click', () => {
        selectModel(option.dataset.value);
      });
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          selectModel(option.dataset.value);
        }
      });
    });
  };
  bindOptionEvents();

  // お気に入りボタン
  dropdown.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opt = btn.closest('.model-option');
      const id = opt?.getAttribute('data-value');
      if (!id) return;
      const favs = new Set(getFavorites());
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      setFavorites(Array.from(favs));
      // 即時UI反映
      btn.textContent = favs.has(id) ? '★' : '☆';
      btn.setAttribute('data-fav', favs.has(id) ? 'on' : 'off');
      btn.setAttribute('aria-pressed', favs.has(id) ? 'true' : 'false');
    });
  });

  // クイックフィルタ
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      currentCapsFilter = chip.dataset.filter || 'all';
      filterModels(searchInput.value || '');
    });
  });

  // プランタブ
  planTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      planTabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      currentPlanFilter = tab.dataset.plan || 'all';
      filterModels(searchInput.value || '');
    });
    tab.addEventListener('keydown', (e) => {
      const tabs = Array.from(planTabs);
      const idx = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        next.focus();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        prev.focus();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tab.click();
      }
    });
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!customSelect.contains(e.target)) {
      closeDropdown();
    }
  });
  
  // Initialize selected state & filters
  const saved = localStorage.getItem('lumora_model');
  const initialModel = MODELS.find(x => x.id === coerceToKnownId(saved)) || MODELS[0];
  // 初期選択をUIに反映し、planバッジも更新
  selectModel(initialModel.id);
  // フィルタの初期適用
  try {
    // capability chips
    filterChips.forEach(c => c.setAttribute('aria-pressed', c.dataset.filter === currentCapsFilter ? 'true' : 'false'));
    // plan tabs
    planTabs.forEach(t => t.setAttribute('aria-selected', t.dataset.plan === currentPlanFilter ? 'true' : (currentPlanFilter === 'all' && t.dataset.plan === 'all' ? 'true' : 'false')));
    // search
    const savedQuery = localStorage.getItem('lumora_model_search') || '';
    if (savedQuery) searchInput.value = savedQuery;
  } catch (_) {}
  filterModels(searchInput.value || '');
  try { updateAchievementsUi(); } catch (_) {}

  // Keyboard navigation inside dropdown
  const moveFocus = (dir) => {
    const current = document.activeElement?.classList?.contains('model-option') ? document.activeElement : null;
    const visible = Array.from(dropdown.querySelectorAll('.model-option'))
      .filter(el => el.style.display !== 'none');
    if (visible.length === 0) return;
    let idx = current ? visible.indexOf(current) : -1;
    if (dir === 'home') idx = 0;
    else if (dir === 'end') idx = visible.length - 1;
    else {
      idx = idx + (dir === 'next' ? 1 : -1);
      if (idx < 0) idx = 0;
      if (idx >= visible.length) idx = visible.length - 1;
    }
    const target = visible[idx];
    if (target) { target.focus(); target.scrollIntoView({ block: 'nearest' }); }
  };

  (modelList || dropdown).addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus('next'); }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus('prev'); }
    if (e.key === 'Home') { e.preventDefault(); moveFocus('home'); }
    if (e.key === 'End') { e.preventDefault(); moveFocus('end'); }
    if (e.key === 'Enter') {
      const focused = document.activeElement;
      if (focused && focused.classList.contains('model-option')) {
        e.preventDefault();
        selectModel(focused.dataset.value);
      }
    }
  });

  // Focus trap inside dropdown
  const getFocusable = () => Array.from(dropdown.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  dropdown.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen) return;
    const focusables = getFocusable();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  });
}

// 送信用（サーバーへ渡す）: provider/model-id
export function getSelectedModel() {
  const id = localStorage.getItem('lumora_model') || MODELS[0].id;
  return id;
}

// 表示用（UIのメタにラベルを出す）
export function getSelectedModelLabel() {
  const id = localStorage.getItem('lumora_model') || MODELS[0].id;
  return MODELS.find((x) => x.id === id)?.label || MODELS[0].label;
}

// ID から表示用ラベルを取得（未知のIDは null を返す）
export function labelFor(id) {
  const hit = MODELS.find(m => m.id === id);
  return hit ? hit.label : null;
}

// プロジェクト設定等から参照できるよう、UIモデル一覧をエクスポート
export function allUiModels() {
  return MODELS.map(m => ({ label: m.label, id: m.id, plan: m.plan, caps: Array.isArray(m.caps) ? m.caps.slice() : [] }));
}

// 旧バージョンの保存形式（ラベルや簡易ID）を最新の provider/model-id に変換
function coerceToKnownId(value) {
  if (!value) return value;
  if (value.includes('/')) return value; // 既に provider/model-id
  const alias = new Map([
    // Auto 互換
    ['lumora-auto', 'auto'],
    // GPT-5シリーズ
    ['gpt-5-mini', 'openai/gpt-5-mini'],
    ['gpt-5', 'openai/gpt-5'],
    ['gpt-5-nano', 'openai/gpt-5-nano'],
    // Geminiシリーズ
    ['gemini-2.5-flash', 'google/gemini-2.5-flash'],
    ['gemini-2.5-flash-lite', 'google/gemini-2.5-flash-lite'],
    ['gemini-2.5-pro', 'google/gemini-2.5-pro'],
    // その他主要モデル
    ['claude-sonnet-4', 'anthropic/claude-sonnet-4'],
    ['grok-3-mini', 'x-ai/grok-3-mini'],
    ['grok-4', 'x-ai/grok-4'],
    ['grok-code-fast-1', 'x-ai/grok-code-fast-1'],
    ['gpt-4o', 'openai/gpt-4o'],
    ['o3-pro', 'openai/o3-pro'],
    // 旧モデル（後方互換性）
    ['chatgpt-4o-latest', 'openai/gpt-4o'],
    ['gpt-oss-20b', 'openai/gpt-oss-20b:free'],
    ['gpt-oss-120b', 'openai/gpt-oss-120b'],
    ['kimi-k2-instruct', 'moonshotai/kimi-k2:free'],
    ['kimi-k2', 'moonshotai/kimi-k2:free'],
    ['llama-4-maverick-17b-128e-instruct', 'meta-llama/llama-3.2-3b-instruct'],
    ['gpt-oss-20b-free', 'openai/gpt-oss-20b:free'],
    ['glm-4.5-air-free', 'z-ai/glm-4.5-air:free'],
    ['glm-4.5v', 'google/gemini-2.5-flash-lite'],
    ['kimi-k2-free', 'moonshotai/kimi-k2:free'],
    ['qwen3-235b-a22b-free', 'qwen/qwen3-235b-a22b:free'],
    ['qwen3', 'qwen/qwen3-235b-a22b:free'],
    ['qwen-3', 'qwen/qwen3-235b-a22b:free'],
    ['qwen3-30b-a3b-thinking-2507', 'qwen/qwen3-30b-a3b-thinking-2507:free'],
    ['qwen3-30b-thinking', 'qwen/qwen3-30b-a3b-thinking-2507:free'],
    ['qwen-3-30b-thinking', 'qwen/qwen3-30b-a3b-thinking-2507:free'],
    ['qwen2.5-vl', 'qwen/qwen2.5-vl-32b-instruct:free'],
    // Amazon Novaシリーズ
    ['amazon-nova-lite', 'amazon/nova-lite-v1'],
    ['amazon-nova-micro', 'amazon/nova-micro-v1'],
    ['amazon-nova-pro', 'amazon/nova-pro-v1'],
    // DeepSeekシリーズ
    ['deepseek-r1', 'deepseek/deepseek-r1-0528:free'],
    ['deepseek-v3.1', 'deepseek/deepseek-chat-v3.1'],
    // Meta Llamaシリーズ
    ['llama-3.2-3b', 'meta-llama/llama-3.2-3b-instruct'],
    ['llama-4-scout', 'meta-llama/llama-4-scout'],
    // Tencent Hunyuan
    ['hunyuan-a13b', 'tencent/hunyuan-a13b-instruct'],
    // Baidu ERNIE
    ['ernie-4.5', 'baidu/ernie-4.5-vl-28b-a3b'],
    // 無修正モデル
    ['uncensored', 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'],
    // Nous Hermes 4
    ['hermes-4-405b', 'nousresearch/hermes-4-405b'],
    ['hermes-4-70b', 'nousresearch/hermes-4-70b'],
    // Liquid LFM 7B（短い別名に対応）
    ['lfm-7b', 'liquid/lfm-7b'],
    // NVIDIA Nemotron Nano 9B v2（旧: :free → 新: 無印）
    ['nvidia/nemotron-nano-9b-v2:free', 'nvidia/nemotron-nano-9b-v2'],
    // 旧プラン名互換（localStorageに残存する可能性）
    ['guest', 'openai/gpt-oss-20b:free'],
    ['plus', 'openai/gpt-oss-20b:free'],
    ['pro+', 'openai/gpt-4o'],
  ]);
  // ラベル完全一致
  const byLabel = MODELS.find((m) => m.label === value)?.id;
  return byLabel || alias.get(value) || value;
}

function planLabel(key) {
  if (key === 'auto') return 'Auto';
  if (key === 'free') return 'Free';
  if (key === 'go') return 'Go';
  if (key === 'pro') return 'Pro';
  if (key === 'max') return 'Max';
  if (key === 'ultra') return 'Ultra';
  return 'Free';
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// ========== Asobi: 簡易実績 ========== 
export function updateAchievementsUi() {
  if (document.documentElement.dataset.asobi !== 'on') return;
  const box = document.getElementById('achievements');
  if (!box) return;
  const usage = (() => { try { return JSON.parse(localStorage.getItem('lumora_usage_stats') || 'null'); } catch (_) { return null; } })() || { sends: 0, days: 0, proMonth: 0 };
  const items = [];
  if (usage.sends >= 10) items.push({ key: 's10', emoji: '✨', text: '10回使いました！' });
  if (usage.sends >= 100) items.push({ key: 's100', emoji: '🎯', text: 'はじめて100回使いました！' });
  if (usage.proMonth >= 1) items.push({ key: 'pro1', emoji: '💎', text: 'Proプラン1か月ありがとう！' });
  if (usage.days >= 3) items.push({ key: 'd3', emoji: '🔥', text: '3日連続で使いました！' });
  if (usage.days >= 7) items.push({ key: 'd7', emoji: '📆', text: '7日連続で使いました！' });

  const prev = new Set((() => { try { return JSON.parse(localStorage.getItem('lumora_achieved') || '[]'); } catch (_) { return []; } })());
  const currentKeys = items.map(i => i.key);
  const newly = currentKeys.filter(k => !prev.has(k));
  localStorage.setItem('lumora_achieved', JSON.stringify(currentKeys));

  box.innerHTML = items.map(b => `<span class="achievement${newly.includes(b.key) ? ' pulse' : ''}"><span class="emoji">${b.emoji}</span>${b.text}</span>`).join('') || '<span style="font-size:12px; opacity:.7;">実績はまだありません</span>';
  if (newly.length) try { spawnConfetti(box); } catch (_) {}
}

function spawnConfetti(anchor) {
  const root = document.createElement('div');
  root.className = 'confetti-root';
  const n = 16;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    p.style.setProperty('--x', (Math.random() * 120 - 60).toFixed(1) + 'px');
    p.style.setProperty('--d', (600 + Math.random() * 600).toFixed(0) + 'ms');
    p.style.background = `hsl(${(i * 360 / n) | 0} 90% 60%)`;
    root.appendChild(p);
  }
  anchor.appendChild(root);
  setTimeout(() => root.remove(), 1200);
}
