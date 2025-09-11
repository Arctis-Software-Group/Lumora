import { initState } from '../state/state.js';

const state = (() => {
  // main.jsですでに初期化されるが、ここでも参照できるように安全に取得
  const any = window.__lumora_state;
  return any || initState();
})();

export function renderChatList(s) {
  const st = s || state;
  window.__lumora_state = st; // 共有
  const list = document.getElementById('chatList');
  if (!list) return;
  list.innerHTML = '';
  const q = (document.getElementById('chatSearch')?.value || '').toLowerCase();
  const groupMode = localStorage.getItem('lumora_chat_group') || 'none'; // none | project
  const projectFilter = (localStorage.getItem('lumora_chat_project_filter') || '').trim();
  // 並び: お気に入り優先 → 作成日時降順（order）
  const ids = st.order.slice();
  ids.sort((a,b) => (st.chats[b]?.favorite === true) - (st.chats[a]?.favorite === true));

  if (groupMode === 'project') {
    const groups = new Map();
    for (const id of ids) {
      const chat = st.chats[id];
      if (!chat) continue;
      if (projectFilter && (String(chat.project||'').trim() !== projectFilter)) continue;
      if (q && !chat.title.toLowerCase().includes(q)) continue;
      const key = (chat.project || '').trim() || '（未分類）';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    }
    for (const [project, idsIn] of groups.entries()) {
      const header = document.createElement('div');
      header.className = 'cl-group-header';
      header.textContent = project;
      list.appendChild(header);
      for (const id of idsIn) list.appendChild(renderItem(st, id));
    }
  } else {
    // お気に入りを上部にグループ表示（検索中は混在のまま）
    const favs = [];
    const rest = [];
    for (const id of ids) {
      const chat = st.chats[id];
      if (!chat) continue;
      if (projectFilter && (String(chat.project||'').trim() !== projectFilter)) continue;
      if (q && !chat.title.toLowerCase().includes(q)) continue;
      (chat.favorite === true ? favs : rest).push(id);
    }
    if (favs.length && !q) {
      const h = document.createElement('div'); h.className = 'cl-group-header'; h.textContent = 'Favorites'; list.appendChild(h);
      favs.forEach(id => list.appendChild(renderItem(st, id)));
      const h2 = document.createElement('div'); h2.className = 'cl-group-header'; h2.textContent = 'All'; list.appendChild(h2);
      rest.forEach(id => list.appendChild(renderItem(st, id)));
    } else {
      [...favs, ...rest].forEach(id => list.appendChild(renderItem(st, id)));
    }
  }
  const search = document.getElementById('chatSearch');
  if (search && !search.__bound) {
    search.__bound = true;
    search.addEventListener('input', () => renderChatList(st));
  }
  const btn = document.getElementById('newChatBtn');
  if (btn && !btn.__bound) {
    btn.__bound = true;
    btn.addEventListener('click', async () => {
      // Optional passcode prompt for better privacy
      const title = prompt('新しいチャットのタイトルを入力', '新しいチャット');
      if (title === null) return;
      const pass = prompt('パスコードを設定（空欄でなし）', '');
      if (pass && pass.trim()) {
        try {
          const id = await st.createLockedChat({ title: title || '新しいチャット', passcode: pass.trim() });
          st.selectChat(id);
          renderChatList(st);
          // 切り替えはリロードせず安全に行う
          try { const m = await import('../app/main.js'); m.openChatById(id); } catch (_) { /* fallback */ location.reload(); }
          return;
        } catch (e) {
          try { import('./toast.js').then(({ showToast }) => showToast('このブラウザは暗号化に対応していません')); } catch (_) {}
        }
      }
      const id = st.createChat({ title: title || '新しいチャット' });
      st.selectChat(id);
      renderChatList(st);
      try { const m = await import('../app/main.js'); m.openChatById(id); } catch (_) { location.reload(); }
    });
  }
  // グループ選択
  const groupSel = document.getElementById('groupSelect');
  if (groupSel && !groupSel.__bound) {
    groupSel.__bound = true;
    try { groupSel.value = localStorage.getItem('lumora_chat_group') || 'none'; } catch (_) {}
    groupSel.addEventListener('change', () => {
      try { localStorage.setItem('lumora_chat_group', groupSel.value); } catch (_) {}
      renderChatList(st);
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderItem(st, id) {
  const chat = st.chats[id];
  const item = document.createElement('div');
  item.className = 'item' + (st.currentChatId === id ? ' active' : '');
  item.title = chat.title;
  const fav = chat.favorite === true;
  const project = (chat.project || '').trim();
  item.innerHTML = `
      <div class="icon-btn" aria-hidden="true">${chat.locked ? '🔒' : (fav ? '⭐' : '💬')}</div>
      <div class="grow">
        <div class="title">${escapeHtml(chat.title)}</div>
        <div class="meta">${new Date(chat.createdAt).toLocaleString()}${project ? ` ・ ${escapeHtml(project)}` : ''}${chat.locked ? ' ・ パスコード保護' : ''}</div>
      </div>
      <div class="tools" role="toolbar" aria-label="会話操作">
        <button class="fav-btn" title="お気に入り切替" aria-label="お気に入り切替">${fav ? '★' : '☆'}</button>
        <button class="lock-btn" title="${chat.locked ? 'ロック解除/無効化' : 'パスコードでロック'}" aria-label="${chat.locked ? 'ロック解除/無効化' : 'パスコードでロック'}">${chat.locked ? '🔓' : '🔒'}</button>
        <button class="proj-btn" title="プロジェクト設定" aria-label="プロジェクト設定">🏷️</button>
        <button class="delete-btn" title="この会話を削除" aria-label="この会話を削除">🗑️</button>
      </div>
    `;
  item.addEventListener('click', async (e) => {
    // If locked and not unlocked, prompt to unlock for viewing
    if (chat.locked && !chat.__unlocked) {
      const pass = prompt('この会話はパスコードで保護されています。パスコードを入力してください');
      if (pass === null) return; // cancel
      const ok = await st.unlockForView(id, pass);
      if (!ok) {
        try { import('./toast.js').then(({ showToast }) => showToast('パスコードが違います')); } catch (_) {}
        return;
      }
    }
    st.selectChat(id);
    renderChatList(st);
    try { const m = await import('../app/main.js'); m.openChatById(id); } catch (_) { location.reload(); }
  });
  const favBtn = item.querySelector('.fav-btn');
  favBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    st.toggleFavorite(id);
    try { import('./toast.js').then(({ showToast }) => showToast(st.chats[id].favorite ? 'お気に入りに追加' : 'お気に入りを解除')); } catch (_) {}
    renderChatList(st);
  });
  const projBtn = item.querySelector('.proj-btn');
  projBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = prompt('プロジェクト名を入力（空で未分類）', st.chats[id].project || '');
    if (name === null) return;
    st.setProject(id, name);
    try { import('./toast.js').then(({ showToast }) => showToast(name.trim() ? `「${name.trim()}」に移動` : '未分類に移動')); } catch (_) {}
    renderChatList(st);
  });
  const del = item.querySelector('.delete-btn');
  del?.addEventListener('click', (e) => {
    e.stopPropagation();
    const ok = confirm('この会話を削除しますか？この操作は取り消せません。');
    if (!ok) return;
    const isCurrent = st.currentChatId === id;
    st.remove(id);
    renderChatList(st);
    try { import('./toast.js').then(({ showToast }) => showToast('会話を削除しました')); } catch (_) {}
    if (isCurrent) location.reload();
  });
  const lockBtn = item.querySelector('.lock-btn');
  lockBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!chat.locked) {
      const pass = prompt('この会話に設定するパスコードを入力');
      if (!pass || !pass.trim()) return;
      await st.lockChat(id, pass.trim());
      try { import('./toast.js').then(({ showToast }) => showToast('パスコードを設定しました')); } catch (_) {}
      renderChatList(st);
      return;
    }
    // Already locked → disable or unlock for viewing
    const mode = confirm('この会話のロックを無効化しますか？（OK: 無効化 / キャンセル: 閲覧用に一時解除）');
    if (mode) {
      const pass = prompt('確認のためパスコードを入力');
      if (pass === null) return;
      const ok = await st.disableLock(id, pass);
      if (!ok) { try { import('./toast.js').then(({ showToast }) => showToast('パスコードが違います')); } catch (_) {} }
      else { try { import('./toast.js').then(({ showToast }) => showToast('ロックを無効化しました')); } catch (_) {} }
      renderChatList(st);
    } else {
      const pass = prompt('パスコードを入力（正しければ閲覧できます）');
      if (pass === null) return;
      const ok = await st.unlockForView(id, pass);
      if (!ok) { try { import('./toast.js').then(({ showToast }) => showToast('パスコードが違います')); } catch (_) {} }
      else { try { import('./toast.js').then(({ showToast }) => showToast('閲覧用に解除しました（保存時は暗号化されます）')); } catch (_) {} }
    }
  });
  return item;
}
