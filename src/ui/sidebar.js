export function renderSidebar() {
  // 既存HTMLの動作強化（新UIトグル時）
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const el = document.getElementById('sidebar');
  const container = document.querySelector('.container');
  if (toggleBtn && el && !toggleBtn.__bound) {
    toggleBtn.__bound = true;
    toggleBtn.addEventListener('click', () => {
      const on = document.documentElement.dataset.newui === 'on';
      if (!on) return; // 新UI時のみ動作
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
}


