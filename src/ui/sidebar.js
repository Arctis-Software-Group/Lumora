import { listProjectNames, upsertProject } from '../app/projects.js';
import { renderChatList } from './chat-list.js';

export function renderSidebar() {
  // 既存HTMLの動作強化（新UIトグル時）
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const el = document.getElementById('sidebar');
  const container = document.querySelector('.container');
  if (toggleBtn && el && !toggleBtn.__bound) {
    toggleBtn.__bound = true;
    toggleBtn.addEventListener('click', () => {
      const on = document.documentElement.dataset.newui === 'on' || document.documentElement.dataset.simple === 'on';
      if (!on) return; // 新UIまたはシンプルモード時のみ動作
      container?.classList.toggle('sidebar-collapsed');
      const collapsed = container?.classList.contains('sidebar-collapsed');
      if (collapsed) document.documentElement.dataset.sidebar = 'collapsed';
      else document.documentElement.dataset.sidebar = 'expanded';
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  }

  // プロフィール領域の初期反映
  try {
    const name = localStorage.getItem('lumora_user_name') || '';
    const avatar = localStorage.getItem('lumora_user_avatar') || '';
    const nameEl = document.getElementById('userNameDisplay');
    const img = document.getElementById('userAvatar');
    const fallback = document.getElementById('userAvatarFallback');
    if (nameEl) nameEl.textContent = name || 'ユーザー';
    const initial = (name || 'U').trim().slice(0,1).toUpperCase();
    if (avatar && img) { img.src = avatar; img.style.display = 'block'; if (fallback) fallback.style.display = 'none'; }
    else { if (img) img.style.display = 'none'; if (fallback) { fallback.textContent = initial; fallback.style.display = 'grid'; } }
  } catch (_) {}

  // プロジェクトNavの描画
  try { renderProjectsNav(); } catch (_) {}

  // 設定/他タブでの変更を反映
  try {
    if (!renderSidebar.__boundStorage) {
      renderSidebar.__boundStorage = true;
      window.addEventListener('storage', (e) => {
        if (e.key === 'lumora_projects_v1') {
          try { renderProjectsNav(); } catch (_) {}
        }
      });
    }
  } catch (_) {}

  // グループ切替時にNavの表示/非表示を同期
  try {
    const groupSel = document.getElementById('groupSelect');
    if (groupSel && !groupSel.__projBound) {
      groupSel.__projBound = true;
      groupSel.addEventListener('change', () => { try { renderProjectsNav(); } catch (_) {} });
    }
  } catch (_) {}
}

function renderProjectsNav() {
  const host = document.getElementById('projectNav');
  if (!host) return;
  // 既存の保存済みプロジェクト + チャット上で使われているプロジェクト名を統合
  const namesSaved = new Set(listProjectNames());
  try {
    const st = window.__lumora_state;
    Object.values(st?.chats || {}).forEach(c => {
      const n = String(c?.project || '').trim();
      if (n) namesSaved.add(n);
    });
  } catch (_) {}
  const names = Array.from(namesSaved).sort((a,b) => a.localeCompare(b));
  const counts = projectCounts();
  const currentFilter = (localStorage.getItem('lumora_chat_project_filter') || '').trim();
  const groupMode = localStorage.getItem('lumora_chat_group') || 'none';

  const showChips = groupMode === 'project';
  host.innerHTML = `
    <div class="proj-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
      <div style="font-weight:700; font-size:12px; opacity:.8; letter-spacing:.2px;">プロジェクト</div>
      <button id="projAdd" class="icon-btn" title="プロジェクトを追加">＋</button>
    </div>
    ${showChips ? `<div class="proj-list" role="list" aria-label="プロジェクトで絞り込み"></div>` : ''}
    <div class="proj-assign" style="margin-top:8px; display:flex; gap:6px; align-items:center;">
      <select id="projAssignSelect" class="enhanced-select" style="flex:1; min-width:0;">
        <option value="">（未分類）</option>
        ${names.map(n => `<option value=\"${escapeAttr(n)}\">${escapeHtml(n)}</option>`).join('')}
      </select>
      <button id="projAssignBtn" class="secondary-btn" title="現在の会話に割り当て">割当</button>
    </div>
  `;

  const list = host.querySelector('.proj-list');
  if (list) {
    const chips = [];
    chips.push(allChipHtml(!currentFilter, counts.__all || 0));
    chips.push(unfiledChipHtml(currentFilter === '（未分類）', counts.__none || 0));
    chips.push(...names.map(n => projectChipHtml(n, currentFilter === n, counts[n] || 0)));
    list.innerHTML = `<div class="proj-chips-row">${chips.join('')}</div>`;
  }

  // クリックでフィルタ
  (list || host).querySelectorAll('[data-proj]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-proj');
      const cur = (localStorage.getItem('lumora_chat_project_filter') || '').trim();
      const next = (cur && cur === name) ? '' : name; // 同じチップを再クリックで解除
      try {
        if (next) localStorage.setItem('lumora_chat_project_filter', next); else localStorage.removeItem('lumora_chat_project_filter');
        localStorage.setItem('lumora_chat_group', 'project');
      } catch (_) {}
      try { const sel = document.getElementById('groupSelect'); if (sel) sel.value = 'project'; } catch (_) {}
      renderChatList(window.__lumora_state);
      renderProjectsNav();
    });
  });

  // 追加
  host.querySelector('#projAdd')?.addEventListener('click', () => {
    const name = prompt('新しいプロジェクト名');
    if (!name || !name.trim()) return;
    upsertProject(name.trim(), {});
    renderProjectsNav();
  });

  // キーボード移動（左右で移動、Enterで選択）
  (list || host).addEventListener('keydown', (e) => {
    const row = (list || host).querySelector('.proj-chips-row');
    const chipsEls = Array.from(row?.querySelectorAll('.proj-chip') || []);
    const idx = chipsEls.indexOf(document.activeElement);
    if (e.key === 'ArrowRight') { e.preventDefault(); const t = chipsEls[Math.min(chipsEls.length - 1, (idx < 0 ? 0 : idx + 1))]; t?.focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); const t = chipsEls[Math.max(0, (idx < 0 ? 0 : idx - 1))]; t?.focus(); }
    if (e.key === 'Enter' && document.activeElement?.hasAttribute('data-proj')) {
      e.preventDefault(); document.activeElement.click();
    }
  });

  // 現在の会話に割当（変更ですぐ適用 / ボタンでも適用）
  const doAssign = () => {
    const sel = host.querySelector('#projAssignSelect');
    const name = sel?.value || '';
    const st = window.__lumora_state;
    if (!st?.currentChatId) { toast('割り当てる会話がありません'); return; }
    st.setProject(st.currentChatId, name);
    if (name) localStorage.setItem('lumora_chat_project_filter', name); else localStorage.removeItem('lumora_chat_project_filter');
    renderChatList(st);
    renderProjectsNav();
    toast(name ? `「${name}」に割り当てました` : '未分類にしました');
  };
  host.querySelector('#projAssignBtn')?.addEventListener('click', doAssign);
  host.querySelector('#projAssignSelect')?.addEventListener('change', doAssign);
}

function projectChipHtml(name, active, count) {
  return `<button class="proj-chip${active ? ' active' : ''}" data-proj="${escapeAttr(name)}" title="${escapeAttr(name)}" tabindex="0">${escapeHtml(name)}${count ? `<span class="count">${count}</span>` : ''}</button>`;
}

function allChipHtml(active, count) {
  return `<button class="proj-chip${active ? ' active' : ''}" data-proj="" title="すべて" tabindex="0">すべて${count ? `<span class=\"count\">${count}</span>` : ''}</button>`;
}

function unfiledChipHtml(active, count) {
  const name = '（未分類）';
  return `<button class="proj-chip${active ? ' active' : ''}" data-proj="${escapeAttr(name)}" title="未分類" tabindex="0">未分類${count ? `<span class=\"count\">${count}</span>` : ''}</button>`;
}

function projectCounts() {
  const st = window.__lumora_state;
  const counts = { __all: 0, __none: 0 };
  try {
    Object.values(st?.chats || {}).forEach(c => {
      counts.__all += 1;
      const key = (String(c?.project || '').trim()) || '__none';
      counts[key] = (counts[key] || 0) + 1;
    });
  } catch (_) {}
  return counts;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escapeAttr(s) { return escapeHtml(s).replaceAll('"', '&quot;'); }
function toast(msg) { try { import('./toast.js').then(({ showToast }) => showToast(msg)); } catch (_) {} }
