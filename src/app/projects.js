// Project profiles: per-project defaults (model, system prompt, emotion)
// Storage key: lumora_projects_v1

import { allUiModels } from '../ui/model-selector.js';

const STORAGE_KEY = 'lumora_projects_v1';

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return isPlainObject(obj) ? obj : {};
  } catch (_) {
    return {};
  }
}

export function saveProjects(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch (_) {}
}

export function upsertProject(name, data) {
  const key = String(name || '').trim();
  if (!key) return false;
  const now = Date.now();
  const map = loadProjects();
  const prev = map[key] || {};
  map[key] = {
    name: key,
    modelId: String(data?.modelId || prev.modelId || ''),
    systemPrompt: String(data?.systemPrompt || prev.systemPrompt || ''),
    emotionMode: data?.emotionMode || prev.emotionMode || 'off',
    emotionStyle: data?.emotionStyle || prev.emotionStyle || 'neutral',
    updatedAt: now,
    createdAt: prev.createdAt || now
  };
  saveProjects(map);
  return true;
}

export function removeProject(name) {
  const key = String(name || '').trim();
  if (!key) return false;
  const map = loadProjects();
  if (!map[key]) return false;
  delete map[key];
  saveProjects(map);
  return true;
}

export function getProject(name) {
  const key = String(name || '').trim();
  if (!key) return null;
  const map = loadProjects();
  return map[key] || null;
}

export function listProjectNames() {
  return Object.keys(loadProjects());
}

function isPlainObject(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

// ============ Settings UI integration ============
// Render into Settings modal section with id="projectManager"
export function attachProjectsSettings(state) {
  const root = document.getElementById('projectManager');
  if (!root) return;

  const models = allUiModels();

  const render = () => {
    const map = loadProjects();
    const names = Object.keys(map);
    root.innerHTML = `
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">📁</div>
          <div class="section-info">
            <h3>プロジェクト</h3>
            <p>チャットごとに既定モデルやSystem Promptを適用</p>
          </div>
        </div>
        <div class="section-content">
          <div class="field enhanced-field">
            <label class="field-label">
              <span class="label-text">プロジェクト一覧</span>
              <span class="label-description">編集または削除できます</span>
            </label>
            <div id="projList"></div>
            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
              <button id="projAddBtn" class="primary-btn">＋ プロジェクトを追加</button>
            </div>
          </div>

          <div class="divider"></div>

          <div class="field enhanced-field">
            <label class="field-label">
              <span class="label-text">現在の会話に適用</span>
              <span class="label-description">選択チャットにプロジェクトを割り当て</span>
            </label>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <select id="projAssignSelect" class="enhanced-select">
                <option value="">（未分類）</option>
                ${names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
              </select>
              <button id="projAssignBtn" class="secondary-btn">適用</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const listBox = root.querySelector('#projList');
    listBox.innerHTML = names.length
      ? names.map(n => projectRowHtml(map[n], models)).join('')
      : '<div style="font-size:12px; opacity:.7;">プロジェクトはまだありません</div>';

    // Bind per-row actions
    listBox.querySelectorAll('[data-action="edit"]').forEach(btn => btn.addEventListener('click', () => openEditor(btn.dataset.name)));
    listBox.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', () => { if (confirm('削除しますか？')) { removeProject(btn.dataset.name); render(); toast('削除しました'); } }));

    // Add new
    root.querySelector('#projAddBtn')?.addEventListener('click', () => openEditor(''));

    // Assign current chat
    root.querySelector('#projAssignBtn')?.addEventListener('click', () => {
      const sel = root.querySelector('#projAssignSelect');
      const val = sel?.value || '';
      if (!state?.currentChatId) { toast('適用する会話がありません'); return; }
      try { state.setProject(state.currentChatId, val); } catch (_) {}
      toast(val ? `「${val}」に割り当てました` : '未分類にしました');
    });
  };

  const openEditor = (name) => {
    const map = loadProjects();
    const current = name && map[name] ? map[name] : { name: '', modelId: '', systemPrompt: '', emotionMode: 'off', emotionStyle: 'neutral' };
    // Inline editor panel
    const panel = document.createElement('div');
    panel.className = 'enhanced-body';
    panel.style.marginTop = '12px';
    panel.innerHTML = `
      <div class="field enhanced-field">
        <label for="projName" class="field-label"><span class="label-text">プロジェクト名</span></label>
        <input id="projName" class="enhanced-select" type="text" placeholder="例: 開発ノート" value="${escapeAttr(current.name)}" />
      </div>
      <div class="field enhanced-field">
        <label for="projModel" class="field-label"><span class="label-text">既定モデル</span><span class="label-description">送信時にこのモデルを優先</span></label>
        <select id="projModel" class="enhanced-select">
          <option value="">（継承：現在の選択を使用）</option>
          ${models.map(m => `<option value="${escapeAttr(m.id)}" ${m.id===current.modelId?'selected':''}>${escapeHtml(m.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field enhanced-field">
        <label for="projSystem" class="field-label"><span class="label-text">System Prompt（任意）</span><span class="label-description">このプロジェクト内での追加指示</span></label>
        <textarea id="projSystem" rows="4" class="enhanced-select" placeholder="例: コードはTypeScriptで提案し、根拠を示す。">${escapeHtml(current.systemPrompt || '')}</textarea>
      </div>
      <div class="field enhanced-field">
        <label class="field-label"><span class="label-text">Emotion Guard（上書き）</span></label>
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="projEmo" value="off" ${current.emotionMode==='off'?'checked':''}/>Off</label>
          <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="projEmo" value="auto" ${current.emotionMode==='auto'?'checked':''}/>Auto</label>
          <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="projEmo" value="manual" ${current.emotionMode==='manual'?'checked':''}/>Manual</label>
          <select id="projEmoStyle" class="enhanced-select" style="min-width:160px;">
            ${['neutral','empathetic','cheerful','professional'].map(v => `<option value="${v}" ${current.emotionStyle===v?'selected':''}>${labelForTone(v)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="projCancel" class="secondary-btn">キャンセル</button>
        <button id="projSave" class="enhanced-save-btn">保存</button>
      </div>
    `;
    // Insert right after list
    const list = root.querySelector('#projList');
    list?.insertAdjacentElement('afterend', panel);

    const cleanup = () => panel.remove();
    panel.querySelector('#projCancel')?.addEventListener('click', () => cleanup());
    panel.querySelector('#projSave')?.addEventListener('click', () => {
      const newName = panel.querySelector('#projName')?.value?.trim() || '';
      if (!newName) { toast('プロジェクト名を入力してください'); return; }
      const modelId = panel.querySelector('#projModel')?.value || '';
      const systemPrompt = panel.querySelector('#projSystem')?.value || '';
      const emo = Array.from(panel.querySelectorAll('input[name="projEmo"]')).find(i => i.checked)?.value || 'off';
      const emoStyle = panel.querySelector('#projEmoStyle')?.value || 'neutral';
      upsertProject(newName, { modelId, systemPrompt, emotionMode: emo, emotionStyle: emoStyle });
      if (name && name !== newName) {
        // rename: move data
        const map2 = loadProjects();
        if (map2[name]) delete map2[name];
        saveProjects(map2);
      }
      cleanup();
      render();
      toast('保存しました');
    });
  };

  render();
}

function projectRowHtml(p, models) {
  const modelLabel = (models.find(m => m.id === p.modelId)?.label) || (p.modelId ? p.modelId : '（継承）');
  const emo = p.emotionMode === 'manual' ? `${labelForTone(p.emotionStyle)}（手動）` : (p.emotionMode === 'auto' ? 'Auto' : 'Off');
  return `
    <div class="project-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px dashed var(--border);">
      <div class="project-meta" style="display:flex; flex-direction:column; gap:4px;">
        <div style="font-weight:600;">${escapeHtml(p.name)}</div>
        <div style="font-size:12px; opacity:.8;">モデル: ${escapeHtml(modelLabel)} / トーン: ${escapeHtml(emo)}</div>
      </div>
      <div class="project-tools" style="display:flex; gap:8px;">
        <button class="secondary-btn" data-action="edit" data-name="${escapeAttr(p.name)}">編集</button>
        <button class="enhanced-danger-btn" data-action="delete" data-name="${escapeAttr(p.name)}">削除</button>
      </div>
    </div>
  `;
}

function labelForTone(v) {
  return v === 'empathetic' ? 'Empathetic' : v === 'cheerful' ? 'Cheerful' : v === 'professional' ? 'Professional' : 'Neutral';
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}

function toast(msg) {
  try { import('../ui/toast.js').then(({ showToast }) => showToast(msg)); } catch (_) {}
}

