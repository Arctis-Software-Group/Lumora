import { fetchMicroPauseSuggestions } from '../api/micro-pause.js';

export function renderComposer() {
  // 既に index.html で用意済み
  try { setupMicroPause(); } catch (_) {}
  try { setupMicroPauseHero(); } catch (_) {}
}

function setupMicroPause() {
  const root = document.getElementById('composer');
  const input = document.getElementById('input');
  if (!root || !input) return;
  if (root.__mpBound) return; // bind once per page
  root.__mpBound = true;

  // Settings: enable flag + model selection
  let modelKey = localStorage.getItem('lumora_micro_pause_model') || 'lfm-7b';

  // Container for suggestion bubbles
  const row = document.createElement('div');
  row.className = 'mp-suggest-row';
  row.setAttribute('aria-live', 'polite');
  row.hidden = true;
  root.appendChild(row);

  // State
  let timer = null;
  let inFlight = false;
  let lastText = '';
  let lastShownAt = 0;
  let nudgeTimer = null;
  let nudgeShown = false;

  const COOLDOWN_MS = 6000; // avoid overly frequent triggers while keeping UX responsive
  const MIN_LEN = 6;
  const MIN_WAIT_MS = 550; // 500ms〜の範囲内でランダマイズ
  const MAX_WAIT_MS = 1600; // 上限 2s 未満で反応を軽やかに

  const isSending = () => {
    const send = document.getElementById('sendBtn');
    return !!send?.classList.contains('stop');
  };

  const clearRow = () => { try { row.innerHTML = ''; row.hidden = true; nudgeShown = false; } catch (_) {} };

  const hideNudge = () => {
    try {
      const n = row.querySelector('.mp-nudge');
      if (n) n.remove();
      nudgeShown = false;
    } catch (_) {}
  };

  const showNudge = () => {
    if (nudgeShown) return;
    // Do not nudge while sending or if row already has suggestions
    if (isSending()) return;
    try {
      const text = input.value;
      if (!text || text.trim().length < MIN_LEN) return;
      row.hidden = false;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mp-suggest-bubble mp-nudge';
      btn.textContent = '悩んでますか？プロンプトの続きを魔法のようにかいてみましょう！（Lumora にかかせる）';
      btn.addEventListener('click', () => {
        hideNudge();
        // Trigger suggestion fetch immediately
        try { if (timer) { clearTimeout(timer); timer = null; } } catch(_){}
        run();
      });
      // remove any previous nudge just in case
      hideNudge();
      row.prepend(btn);
      nudgeShown = true;
    } catch (_) {}
  };

  const schedule = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; }
    if (isSending()) return; // don't distract during streaming
    // Check if feature was toggled off after binding
    const enabled = (localStorage.getItem('lumora_micro_pause') || 'on') === 'on';
    if (!enabled) { clearRow(); return; }
    const text = input.value;
    if (!text || text.trim().length < MIN_LEN) { clearRow(); return; }
    // respect cooldown window
    if (Date.now() - lastShownAt < COOLDOWN_MS) return;
    const jitter = MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS));
    timer = setTimeout(run, jitter);
    // Schedule a nudge bubble at ~MAX_WAIT_MS to encourage suggestion usage
    nudgeTimer = setTimeout(() => { showNudge(); }, MAX_WAIT_MS);
  };

  const run = async () => {
    timer = null;
    if (nudgeTimer) { try { clearTimeout(nudgeTimer); } catch(_){} nudgeTimer = null; }
    if (inFlight) return;
    if (isSending()) return;
    const enabled = (localStorage.getItem('lumora_micro_pause') || 'on') === 'on';
    if (!enabled) { clearRow(); return; }
    const text = input.value;
    if (!text || text.trim().length < MIN_LEN) return;
    // Avoid fetching if the last prefix hasn't changed much
    const current = text.trim();
    if (current === lastText) return;
    inFlight = true;
    let aborted = false;
    const guard = setTimeout(() => { aborted = true; inFlight = false; }, 4500);
    try {
      const currentModel = localStorage.getItem('lumora_micro_pause_model') || modelKey;
      const suggestions = await fetchMicroPauseSuggestions({ text: current, model: currentModel });
      if (aborted) return;
      if (!Array.isArray(suggestions) || suggestions.length === 0) { hideNudge(); clearRow(); return; }
      // Drop if user typed since request started
      if ((input.value || '').trim() !== current) return;
      hideNudge();
      renderSuggestions(row, suggestions, { input });
      try {
        const stats = JSON.parse(localStorage.getItem('lumora_micro_pause_stats') || '{}');
        stats.shows = (stats.shows || 0) + 1;
        localStorage.setItem('lumora_micro_pause_stats', JSON.stringify(stats));
      } catch (_) {}
      lastShownAt = Date.now();
      lastText = current;
    } catch (err) {
      console.warn('[micro-pause] suggest error', err);
      try {
        const stats = JSON.parse(localStorage.getItem('lumora_micro_pause_stats') || '{}');
        stats.errors = (stats.errors || 0) + 1;
        localStorage.setItem('lumora_micro_pause_stats', JSON.stringify(stats));
      } catch (_) {}
    } finally {
      clearTimeout(guard);
      inFlight = false;
    }
  };

  // Hide on user action
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearRow();
  });
  input.addEventListener('input', () => {
    // Any new input cancels pending timers and hides nudge/suggestions
    if (timer) { try { clearTimeout(timer); } catch(_){} timer = null; }
    if (nudgeTimer) { try { clearTimeout(nudgeTimer); } catch(_){} nudgeTimer = null; }
    hideNudge();
    schedule();
    if (!input.value) clearRow();
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) clearRow(); });

  // Track model changes from settings without rebind
  window.addEventListener('storage', (e) => {
    if (e.key === 'lumora_micro_pause_model') modelKey = e.newValue || modelKey;
  });
}

function renderSuggestions(row, suggestions, { input }) {
  row.innerHTML = '';
  row.hidden = false;
  const mk = (text) => {
    const btn = document.createElement('button');
    btn.className = 'mp-suggest-bubble';
    btn.type = 'button';
    btn.title = '候補を挿入';
    btn.textContent = tidy(text);
    btn.addEventListener('click', () => {
      try {
        const prefix = input.value || '';
        const glue = prefix && !/\s$/.test(prefix) ? ' ' : '';
        input.value = prefix + glue + text;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        input.dispatchEvent(new Event('input'));
      } catch (_) {}
      // Hide suggestions after insert to stay out of the way
      try { row.innerHTML = ''; row.hidden = true; } catch (_) {}
    });
    return btn;
  };
  for (const s of suggestions.slice(0, 3)) row.appendChild(mk(String(s)));
  try {
    const stats = JSON.parse(localStorage.getItem('lumora_micro_pause_stats') || '{}');
    stats.rendered = (stats.rendered || 0) + suggestions.length;
    localStorage.setItem('lumora_micro_pause_stats', JSON.stringify(stats));
  } catch (_) {}
}

function tidy(s) {
  return String(s || '').replace(/^[-*•\d\.)\s]+/, '').trim();
}

function setupMicroPauseHero() {
  const container = document.querySelector('#emptyState .hero-input');
  const input = document.getElementById('heroInput');
  if (!container || !input) return;
  if (container.__mpBound) return;
  container.__mpBound = true;

  let modelKey = localStorage.getItem('lumora_micro_pause_model') || 'lfm-7b';

  const row = document.createElement('div');
  row.className = 'mp-suggest-row';
  row.setAttribute('aria-live', 'polite');
  row.hidden = true;
  // Insert directly after hero block for consistent layout
  container.insertAdjacentElement('afterend', row);

  let timer = null;
  let inFlight = false;
  let lastText = '';
  let lastShownAt = 0;
  let nudgeTimer = null;
  let nudgeShown = false;

  const COOLDOWN_MS = 6000;
  const MIN_LEN = 6;
  const MIN_WAIT_MS = 550;
  const MAX_WAIT_MS = 1600;

  const clearRow = () => { try { row.innerHTML = ''; row.hidden = true; nudgeShown = false; } catch (_) {} };

  const hideNudge = () => {
    try {
      const n = row.querySelector('.mp-nudge');
      if (n) n.remove();
      nudgeShown = false;
    } catch (_) {}
  };

  const showNudge = () => {
    if (nudgeShown) return;
    try {
      const text = input.value;
      if (!text || text.trim().length < MIN_LEN) return;
      row.hidden = false;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mp-suggest-bubble mp-nudge';
      btn.textContent = '悩んでますか？プロンプトの続きを魔法のようにかいてみましょう！（Lumora にかかせる）';
      btn.addEventListener('click', () => {
        hideNudge();
        try { if (timer) { clearTimeout(timer); timer = null; } } catch(_){ }
        run();
      });
      hideNudge();
      row.prepend(btn);
      nudgeShown = true;
    } catch (_) {}
  };

  const schedule = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; }
    const enabledNow = (localStorage.getItem('lumora_micro_pause') || 'on') === 'on';
    if (!enabledNow) { clearRow(); return; }
    const text = input.value;
    if (!text || text.trim().length < MIN_LEN) { clearRow(); return; }
    if (Date.now() - lastShownAt < COOLDOWN_MS) return;
    const jitter = MIN_WAIT_MS + Math.floor(Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS));
    timer = setTimeout(run, jitter);
    nudgeTimer = setTimeout(() => { showNudge(); }, MAX_WAIT_MS);
  };

  const run = async () => {
    timer = null;
    if (inFlight) return;
    if (nudgeTimer) { try { clearTimeout(nudgeTimer); } catch(_){} nudgeTimer = null; }
    const enabledNow = (localStorage.getItem('lumora_micro_pause') || 'on') === 'on';
    if (!enabledNow) { clearRow(); return; }
    const text = input.value;
    if (!text || text.trim().length < MIN_LEN) return;
    const current = text.trim();
    if (current === lastText) return;
    inFlight = true;
    let aborted = false;
    const guard = setTimeout(() => { aborted = true; inFlight = false; }, 4500);
    try {
      const currentModel = localStorage.getItem('lumora_micro_pause_model') || modelKey;
      const suggestions = await fetchMicroPauseSuggestions({ text: current, model: currentModel });
      if (aborted) return;
      if (!Array.isArray(suggestions) || suggestions.length === 0) { hideNudge(); clearRow(); return; }
      if ((input.value || '').trim() !== current) return;
      hideNudge();
      renderSuggestions(row, suggestions, { input });
      lastShownAt = Date.now();
      lastText = current;
    } catch (err) {
      console.warn('[micro-pause][hero] suggest error', err);
    } finally {
      clearTimeout(guard);
      inFlight = false;
    }
  };

  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearRow(); });
  input.addEventListener('input', () => {
    if (timer) { try { clearTimeout(timer); } catch(_){} timer = null; }
    if (nudgeTimer) { try { clearTimeout(nudgeTimer); } catch(_){} nudgeTimer = null; }
    hideNudge();
    schedule();
  });
  document.addEventListener('click', (e) => { if (!container.contains(e.target)) clearRow(); });

  window.addEventListener('storage', (e) => {
    if (e.key === 'lumora_micro_pause_model') modelKey = e.newValue || modelKey;
  });
}


