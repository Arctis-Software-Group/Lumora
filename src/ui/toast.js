export function showToast(text, opts = 2000) {
  const el = document.getElementById('toast');
  if (!el) return;
  const isNum = typeof opts === 'number';
  const ms = isNum ? opts : (opts?.ms ?? 2000);
  const type = isNum ? null : (opts?.type ?? null); // 'success' | 'error' | 'info'
  // バリアントのクラスを一旦除去
  el.classList.remove('success', 'error', 'info');
  if (type) el.classList.add(type);
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el.__t);
  el.__t = setTimeout(() => el.classList.remove('show'), ms);
}


