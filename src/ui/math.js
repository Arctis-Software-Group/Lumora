// KaTeX auto-render helper
// 動的に KaTeX (CSS/JS) をCDNから読み込み、与えられた要素内の $..$, $$..$$, \( .. \), \[ .. \] を描画

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist';

let katexLoaded = false;
let loadingPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

function ensureCss(href) {
  if ([...document.styleSheets].some(ss => ss.href && ss.href.includes('katex.min.css'))) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  document.head.appendChild(l);
}

async function ensureKaTeX() {
  if (katexLoaded) return;
  if (loadingPromise) return loadingPromise;
  ensureCss(`${CDN_BASE}/katex.min.css`);
  loadingPromise = (async () => {
    try {
      await loadScript(`${CDN_BASE}/katex.min.js`);
      await loadScript(`${CDN_BASE}/contrib/auto-render.min.js`);
      katexLoaded = true;
    } catch (e) {
      // 失敗時は黙ってスキップ（ネットワークなし等）
      console.warn('KaTeX load skipped:', e && e.message);
    }
  })();
  return loadingPromise;
}

export async function renderMathIn(root) {
  if (!root) return;
  await ensureKaTeX();
  try {
    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      });
    }
  } catch (_) { /* no-op */ }
}

