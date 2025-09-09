import { sendMessageStream } from '../api/chat.js';
import { buildFinalSystemPrompt, inferEmotionFromText } from '../safety/safety.js';
import { labelFor } from '../ui/model-selector.js';
import { showToast } from '../ui/toast.js';

// Fluid Intelligence Interface (FII)
// Nonlinear graph of thinking nodes with flowing edges and multi-model responses.

// Allowed low-cost models for FII (per request)
const ALLOWED_FII_MODELS = [
  'openai/gpt-oss-20b:free',
  'google/gemini-2.5-flash-lite',
  'openai/gpt-5-nano',
  'tencent/hunyuan-a13b-instruct'
];
const DEFAULT_MODELS = ALLOWED_FII_MODELS.slice();

let _inited = false;
let _enabled = false;
let root, canvas, ctx, nodesLayer, orb, inputPanel, inputBox, sendBtn, palette, chain;
let nodes = []; // { id, el, role, x, y, w, h, text, modelId, modelLabel, done, dragging }
let edges = []; // { from, to, kind, phase }
let rafId = 0;
let animT = 0;
let activeStreams = new Map(); // nodeId -> abort

function $(q, parent = document) { return parent.querySelector(q); }
function uid() { return Math.random().toString(36).slice(2, 9); }

export function enableFII(on) {
  const want = !!on;
  if (want === _enabled && _inited) return;
  if (!_inited) init();
  _enabled = want;
  document.documentElement.dataset.fii = want ? 'on' : 'off';
  if (want) {
    root.style.display = 'block';
    startAnim();
  } else {
    root.style.display = 'none';
    stopAnim();
  }
}

function init() {
  if (_inited) return;
  // Ensure root container exists
  root = document.getElementById('fiiRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'fiiRoot';
    root.className = 'fii-root';
    document.body.appendChild(root);
  }
  // Canvas for edges
  canvas = document.createElement('canvas');
  canvas.className = 'fii-canvas';
  root.appendChild(canvas);
  ctx = canvas.getContext('2d');
  // Nodes layer
  nodesLayer = document.createElement('div');
  nodesLayer.className = 'fii-nodes';
  root.appendChild(nodesLayer);
  // Input orb
  orb = document.createElement('button');
  orb.className = 'fii-input-orb';
  orb.title = '思考を投入 (FII)';
  orb.setAttribute('aria-label', '思考を投入');
  orb.textContent = '＋';
  root.appendChild(orb);
  // Input panel
  inputPanel = document.createElement('div');
  inputPanel.className = 'fii-input-panel';
  inputPanel.innerHTML = `
    <div class="fii-input-row">
      <input id="fiiInput" class="fii-input" type="text" placeholder="問い・アイデアを入力 (Enter)" aria-label="問いを入力" />
      <button id="fiiSend" class="fii-send" aria-label="送信">送信</button>
    </div>
  `;
  root.appendChild(inputPanel);
  inputBox = $('#fiiInput', inputPanel);
  sendBtn = $('#fiiSend', inputPanel);
  // Mind Palette
  palette = document.createElement('div');
  palette.className = 'fii-palette';
  palette.setAttribute('role', 'complementary');
  root.appendChild(palette);
  // Prompt Chain
  chain = document.createElement('div');
  chain.className = 'fii-chain';
  root.appendChild(chain);

  // Events
  orb.addEventListener('click', toggleInputPanel);
  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  });
  sendBtn.addEventListener('click', () => {
    const text = inputBox.value.trim();
    if (!text) return;
    inputBox.value = '';
    inputPanel.style.display = 'none';
    focusInputOrb();
    runQuery(text);
  });
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  buildPalette();
  _inited = true;
}

function toggleInputPanel() {
  const visible = inputPanel.style.display === 'block';
  inputPanel.style.display = visible ? 'none' : 'block';
  if (!visible) setTimeout(() => inputBox?.focus(), 10);
}

function focusInputOrb() {
  try { orb?.focus(); } catch (_) {}
}

function resizeCanvas() {
  if (!canvas) return;
  const r = root.getBoundingClientRect();
  canvas.width = Math.floor(r.width * devicePixelRatio);
  canvas.height = Math.floor(r.height * devicePixelRatio);
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  draw();
}

function buildPalette() {
  const models = loadSelectedModels();
  const rhythm = localStorage.getItem('lumora_fii_rhythm') || 'balanced';
  const toneDisplay = currentToneLabel();
  const modelChips = getModelCandidates().map(id => {
    const label = labelFor(id) || id;
    const checked = models.includes(id) ? 'checked' : '';
    return `<label class="fii-chip"><input type="checkbox" data-model="${id}" ${checked}/> ${escapeHtml(label)}</label>`;
  }).join('');
  palette.innerHTML = `
    <div class="title">Mind Palette</div>
    <div class="group">
      <div class="row fii-mini">使用モデル <span style="margin-left:auto; display:inline-flex; gap:6px;">
        <button id="fiiAllOn" class="fii-gear">全ON</button>
        <button id="fiiAllOff" class="fii-gear">全OFF</button>
      </span></div>
      <div class="models">${modelChips}</div>
    </div>
    <div class="group">
      <div class="row"><span class="fii-mini">トーン</span><span class="fii-mini" style="opacity:.8;">${escapeHtml(toneDisplay)}</span><button class="fii-gear" id="fiiOpenSettings">設定</button></div>
    </div>
    <div class="group">
      <div class="row">
        <span class="fii-mini">思考リズム</span>
        <select id="fiiRhythm" class="enhanced-select" style="min-width:140px;">
          <option value="calm" ${rhythm==='calm'?'selected':''}>Calm</option>
          <option value="balanced" ${rhythm==='balanced'?'selected':''}>Balanced</option>
          <option value="rapid" ${rhythm==='rapid'?'selected':''}>Rapid</option>
        </select>
      </div>
    </div>
  `;
  // Bindings
  palette.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const list = Array.from(palette.querySelectorAll('input[type="checkbox"]'))
        .filter(el => el.checked)
        .map(el => el.getAttribute('data-model'));
      saveSelectedModels(list);
    });
  });
  // Quick all on/off
  $('#fiiAllOn', palette)?.addEventListener('click', () => {
    const all = ALLOWED_FII_MODELS.slice();
    saveSelectedModels(all);
    palette.querySelectorAll('input[type="checkbox"]').forEach(el => { el.checked = all.includes(el.getAttribute('data-model')); });
  });
  $('#fiiAllOff', palette)?.addEventListener('click', () => {
    saveSelectedModels([]);
    palette.querySelectorAll('input[type="checkbox"]').forEach(el => { el.checked = false; });
  });
  $('#fiiOpenSettings', palette)?.addEventListener('click', () => {
    import('./settings.js').then(({ openSettings }) => openSettings()).catch(() => {});
  });
  $('#fiiRhythm', palette)?.addEventListener('change', (e) => {
    localStorage.setItem('lumora_fii_rhythm', e.target.value);
  });
}

function getModelCandidates() {
  // Only allow the approved low-cost models
  return ALLOWED_FII_MODELS.slice();
}

function loadSelectedModels() {
  try {
    const json = localStorage.getItem('lumora_fii_models');
    const arr = json ? JSON.parse(json) : null;
    if (Array.isArray(arr)) {
      const filtered = arr.filter(id => ALLOWED_FII_MODELS.includes(id));
      if (filtered.length) return filtered;
    }
  } catch (_) {}
  return DEFAULT_MODELS.slice();
}

function saveSelectedModels(list) {
  try {
    const filtered = unique((list || []).filter(id => ALLOWED_FII_MODELS.includes(id)));
    localStorage.setItem('lumora_fii_models', JSON.stringify(filtered));
  } catch (_) {}
}

function currentToneLabel() {
  try {
    const mode = localStorage.getItem('lumora_emotion_mode') || 'off';
    const style = localStorage.getItem('lumora_emotion_style') || 'neutral';
    if (mode === 'off') return 'Neutral (Off)';
    const map = { neutral: 'Neutral', empathetic: 'Empathetic', cheerful: 'Cheerful', professional: 'Professional' };
    return map[style] || 'Neutral';
  } catch (_) { return 'Neutral'; }
}

function runQuery(text) {
  // Center position
  const { cx, cy } = center();
  // Selected models
  const models = loadSelectedModels();
  if (!models.length) {
    try { showToast('FII: 使用モデルを1つ以上選択してください'); } catch (_) {}
    return;
  }
  const user = createNode({ role: 'user', text, x: cx, y: cy - 40 });
  const rhythm = localStorage.getItem('lumora_fii_rhythm') || 'balanced';
  const spacing = rhythm === 'calm' ? 500 : rhythm === 'rapid' ? 0 : 180;

  // Build base messages with system prompt + tone
  let { systemPrompt, tone } = buildToneAndSystem(text);
  let messages = [{ role: 'user', content: text }];
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });
  const reasoning = loadReasoning();

  // Prompt chain visualization
  updatePromptChain({ systemPrompt, tone, reasoning });

  const R = Math.min(root.clientWidth, root.clientHeight) * 0.32;
  models.forEach((modelId, i) => {
    const theta = (i / models.length) * Math.PI * 2;
    const ax = cx + R * Math.cos(theta + Math.PI / 8);
    const ay = cy + R * Math.sin(theta + Math.PI / 8);
    const ai = createNode({ role: 'assistant', text: '', x: ax, y: ay, modelId, modelLabel: labelFor(modelId) || modelId });
    link(user, ai, 'causal');
    // Staggered start based on rhythm
    setTimeout(() => streamToNode({ node: ai, modelId, baseMessages: messages, reasoning }), i * spacing);
  });
}

function buildToneAndSystem(userText) {
  try {
    const userPromptGlobal = localStorage.getItem('lumora_system_prompt') || '';
    let mode = localStorage.getItem('lumora_emotion_mode') || 'off';
    let manual = localStorage.getItem('lumora_emotion_style') || 'neutral';
    let tone = null;
    if (mode === 'manual') tone = manual || 'neutral';
    else if (mode === 'auto') tone = inferEmotionFromText(String(userText || '')) || 'neutral';
    const merged = String(userPromptGlobal || '').trim();
    const sp = (merged || tone) ? buildFinalSystemPrompt(merged, { tone: tone || 'neutral', allowSensitive: true }) : '';
    return { systemPrompt: sp, tone: mode === 'off' ? null : (tone || 'neutral') };
  } catch (_) { return { systemPrompt: '', tone: null }; }
}

function loadReasoning() {
  try { return JSON.parse(localStorage.getItem('lumora_reasoning') || 'null'); } catch (_) { return null; }
}

function streamToNode({ node, modelId, baseMessages, reasoning }) {
  const el = node.el.querySelector('.body');
  const titleMeta = node.el.querySelector('.head .meta');
  titleMeta.textContent = labelFor(modelId) || modelId;
  const abort = sendMessageStream({
    model: modelId,
    messages: baseMessages,
    reasoning,
    plugins: (function(){ try { return JSON.parse(localStorage.getItem('lumora_plugins') || 'null'); } catch (_) { return null; } })(),
    onRouted(meta) {
      try { titleMeta.textContent = meta?.label || meta?.id || titleMeta.textContent; } catch (_) {}
    },
    onChunk(chunk) {
      node.text = (node.text || '') + chunk;
      renderMarkdownInto(el, node.text);
      draw();
    },
    onDone() {
      node.done = true;
      updateSimilarityEdges(node);
      draw();
    },
    onError(err) {
      node.done = true;
      const msg = (err && err.message) ? String(err.message) : 'エラー';
      renderMarkdownInto(el, '```' + msg + '```');
    }
  });
  activeStreams.set(node.id, abort);
}

function renderMarkdownInto(el, raw) {
  import('../ui/markdown.js').then(({ renderMarkdown }) => {
    el.innerHTML = renderMarkdown(raw);
  }).catch(() => { el.textContent = raw; });
}

function createNode({ role, text, x, y, modelId, modelLabel }) {
  const id = uid();
  const el = document.createElement('div');
  el.className = `fii-node ${role}`;
  const headLabel = role === 'user' ? 'User' : (modelLabel || (labelFor(modelId) || modelId || 'Assistant'));
  el.innerHTML = `
    <div class="head"><span class="dot"></span><strong>${escapeHtml(headLabel)}</strong><span class="meta"></span></div>
    <div class="body"><div class="markdown">${role==='user' ? escapeHtml(text || '') : '<em style="opacity:.7;">thinking…</em>'}</div></div>
  `;
  nodesLayer.appendChild(el);
  requestAnimationFrame(() => { el.classList.add('appear'); });
  const node = { id, el, role, x, y, w: 240, h: 160, text: text || '', modelId: modelId || null, modelLabel: modelLabel || null, done: role==='user', dragging: false };
  // Measure
  requestAnimationFrame(() => measureNode(node));
  // Dragging
  makeDraggable(node);
  nodes.push(node);
  positionNode(node);
  return node;
}

function measureNode(node) {
  const r = node.el.getBoundingClientRect();
  node.w = r.width; node.h = r.height;
}

function positionNode(node) {
  node.el.style.left = node.x + 'px';
  node.el.style.top = node.y + 'px';
  node.el.style.transform = 'translate(-50%, -50%)';
}

function link(a, b, kind = 'causal') {
  edges.push({ from: a.id, to: b.id, kind, phase: Math.random() });
  draw();
}

function updateSimilarityEdges(newNode) {
  if (!newNode.text || newNode.role !== 'assistant') return;
  for (const other of nodes) {
    if (other === newNode || other.role !== 'assistant' || !other.text) continue;
    const s = similarity(newNode.text, other.text);
    if (s >= 0.4) edges.push({ from: newNode.id, to: other.id, kind: 'similarity', phase: Math.random() });
  }
}

function similarity(a, b) {
  // Simple cosine on term counts (stopword-lite)
  const sv = vec(a), tv = vec(b);
  const keys = new Set([...Object.keys(sv), ...Object.keys(tv)]);
  let dot = 0, sa = 0, sb = 0;
  for (const k of keys) {
    const x = sv[k] || 0; const y = tv[k] || 0;
    dot += x * y; sa += x * x; sb += y * y;
  }
  const denom = Math.sqrt(sa) * Math.sqrt(sb) || 1;
  return dot / denom;
}

function vec(s) {
  const stop = new Set(['the','a','an','and','or','to','of','in','for','on','with','is','are','was','were','be','that','this','it','as','at','by','from','I','you','we','they','he','she','them','us','our','your','their','も','は','が','に','を','と','で','する','です','ます','ある','いる','その','この','あの']);
  const m = String(s || '').toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龥ー\s]/g, ' ').split(/\s+/).filter(w => w && !stop.has(w));
  const out = Object.create(null);
  for (const w of m) out[w] = (out[w] || 0) + 1;
  return out;
}

function startAnim() {
  if (rafId) return;
  const tick = () => { animT += 0.016; draw(); rafId = requestAnimationFrame(tick); };
  rafId = requestAnimationFrame(tick);
}

function stopAnim() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function draw() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { offsetLeft: ox, offsetTop: oy } = root;
  // Draw edges
  for (const e of edges) {
    const a = nodes.find(n => n.id === e.from);
    const b = nodes.find(n => n.id === e.to);
    if (!a || !b) continue;
    strokeEdge(a, b, e);
  }
}

function strokeEdge(a, b, e) {
  const p1 = centerOf(a), p2 = centerOf(b);
  const dx = p2.x - p1.x, dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
  if (dist < 4) return;
  const nx = dx / dist, ny = dy / dist;
  const sx = p1.x + nx * 20, sy = p1.y + ny * 20;
  const ex = p2.x - nx * 20, ey = p2.y - ny * 20;

  ctx.save();
  // Style by kind
  let colorA = '#6b6bff', colorB = '#9f54ff', width = 2.2, dash = 0;
  if (e.kind === 'similarity') { colorA = 'rgba(159,84,255,0.75)'; colorB = 'rgba(107,107,255,0.75)'; width = 1.8; dash = 6; }
  else if (e.kind === 'time') { colorA = 'rgba(120,120,160,0.5)'; colorB = 'rgba(120,120,160,0.5)'; width = 1; dash = 3; }
  else if (e.kind === 'emotion') { colorA = '#f59e0b'; colorB = '#8b5cf6'; width = 2; dash = 4; }

  const g = ctx.createLinearGradient(sx, sy, ex, ey);
  g.addColorStop(0, colorA);
  g.addColorStop(1, colorB);
  ctx.strokeStyle = g;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash([dash, dash]);
  const speed = e.kind === 'similarity' ? 2 : 3.5;
  ctx.lineDashOffset = -((animT + e.phase) * 60 * speed) % 1000;
  ctx.beginPath();
  // Slight curve
  const mx = (sx + ex) / 2 + (ny * 40);
  const my = (sy + ey) / 2 - (nx * 40);
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  // Glow
  ctx.shadowColor = colorB; ctx.shadowBlur = 12; ctx.stroke();
  ctx.restore();
}

function centerOf(n) {
  const r = nodesLayer.getBoundingClientRect();
  return { x: n.x, y: n.y };
}

function center() {
  const r = nodesLayer.getBoundingClientRect();
  return { cx: r.width / 2, cy: r.height * 0.42 };
}

function makeDraggable(node) {
  const header = node.el.querySelector('.head');
  let dragging = false; let sx = 0, sy = 0, ox = 0, oy = 0;
  header.style.cursor = 'grab';
  const onDown = (e) => {
    dragging = true; header.style.cursor = 'grabbing';
    sx = e.clientX; sy = e.clientY; ox = node.x; oy = node.y;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };
  const onMove = (e) => {
    if (!dragging) return; node.x = ox + (e.clientX - sx); node.y = oy + (e.clientY - sy); positionNode(node); draw();
  };
  const onUp = () => { dragging = false; header.style.cursor = 'grab'; window.removeEventListener('pointermove', onMove); };
  header.addEventListener('pointerdown', onDown);
}

function updatePromptChain({ systemPrompt, tone, reasoning }) {
  const chips = [];
  if (systemPrompt) chips.push(['System', snippet(systemPrompt)]);
  if (tone) chips.push(['Tone', String(tone)]);
  if (reasoning && reasoning.effort) chips.push(['Reasoning', String(reasoning.effort)]);
  try {
    const plugins = JSON.parse(localStorage.getItem('lumora_plugins') || 'null');
    if (plugins && plugins.length) chips.push(['Plugins', String(plugins.map(p => p.id).join('+'))]);
  } catch (_) {}
  chain.innerHTML = chips.map(([k,v]) => `<span class="pc-chip"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`).join('');
}

function snippet(s, n = 64) {
  const t = String(s || '').replace(/\s+/g,' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function unique(arr) { return Array.from(new Set(arr)); }
