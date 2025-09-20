import { encryptJson, decryptJson, deriveAesKey, hasWebCrypto } from '../lib/secure-chat.js';

export function initState() {
  const stored = safeRead('lumora_state_v1');
  const initial = normalizeLoadedState(stored || { chats: {}, order: [], currentChatId: null });

  return {
    chats: initial.chats,
    order: initial.order,
    currentChatId: initial.currentChatId,
    // Create new chat (unlocked)
    createChat({ title }) {
      const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      this.chats[id] = { id, title: title || '新しいチャット', messages: [], createdAt: Date.now(), favorite: false, project: '', locked: false };
      this.order.unshift(id);
      this.save();
      return id;
    },
    // Create new chat with passcode lock (at-rest encryption)
    async createLockedChat({ title, passcode }) {
      const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      this.chats[id] = { id, title: title || 'パスコード付きチャット', messages: [], createdAt: Date.now(), favorite: false, project: '', locked: true, messagesEnc: null, __unlocked: true };
      // prepare runtime key
      if (!hasWebCrypto()) throw new Error('このブラウザは Web Crypto に対応していません');
      // Save will persist encrypted blob
      await this.__persistEncryption(id, passcode);
      this.order.unshift(id);
      this.save();
      return id;
    },
    selectChat(id) {
      this.currentChatId = id;
      this.save();
    },
    getMessages(id) {
      const c = this.chats[id];
      if (!c) return [];
      if (c.locked && !c.__unlocked) return [];
      return c.messages || [];
    },
    append(id, message) {
      const c = this.chats[id];
      if (!c) return;
      if (c.locked && !c.__unlocked) return; // cannot append while locked
      c.messages = c.messages || [];
      c.messages.push({ ...message, createdAt: Date.now() });
      this.save();
    },
    rename(id, title) { if (this.chats[id]) { this.chats[id].title = title; this.save(); } },
    toggleFavorite(id) { if (this.chats[id]) { this.chats[id].favorite = !this.chats[id].favorite; this.save(); } },
    setProject(id, project) { if (this.chats[id]) { this.chats[id].project = String(project || '').trim(); this.save(); } },
    remove(id) {
      delete this.chats[id];
      this.order = this.order.filter((x) => x !== id);
      if (this.currentChatId === id) this.currentChatId = this.order[0] || null;
      this.save();
    },
    // Enable lock and encrypt at-rest
    async lockChat(id, passcode) {
      const c = this.chats[id];
      if (!c) return false;
      c.locked = true;
      c.__unlocked = true;
      await this.__persistEncryption(id, passcode);
      this.save();
      return true;
    },
    // Unlock for viewing (keeps at-rest encryption until disableLock)
    async unlockForView(id, passcode) {
      const c = this.chats[id];
      if (!c || !c.locked || !c.messagesEnc) return false;
      try {
        const { obj, key } = await decryptJson(c.messagesEnc, passcode);
        c.messages = Array.isArray(obj) ? obj : [];
        c.__unlocked = true;
        c.__key = key; // runtime only
        this.save(); // will persist encrypted on disk but keep runtime decrypted
        return true;
      } catch (_) {
        return false;
      }
    },
    // Disable lock (decrypt and persist as plain)
    async disableLock(id, passcode) {
      const c = this.chats[id];
      if (!c || !c.locked) return false;
      if (!c.__unlocked) {
        const ok = await this.unlockForView(id, passcode);
        if (!ok) return false;
      }
      // now plain in memory
      c.locked = false;
      c.messagesEnc = null;
      c.__key = null;
      c.__unlocked = true;
      this.save();
      return true;
    },
    // Change passcode while staying locked
    async changePasscode(id, oldPass, newPass) {
      const c = this.chats[id];
      if (!c || !c.locked) return false;
      if (!c.__unlocked) {
        const ok = await this.unlockForView(id, oldPass);
        if (!ok) return false;
      }
      await this.__persistEncryption(id, newPass);
      this.save();
      return true;
    },
    // Internal: persist encryption for a chat based on current messages
    async __persistEncryption(id, passcodeOrNull) {
      const c = this.chats[id];
      if (!c) return;
      const msgs = Array.isArray(c.messages) ? c.messages : [];
      if (passcodeOrNull) {
        c.__key = null; // clear cached key; will be rederived by decryptJson if needed
        c.messagesEnc = await encryptJson(msgs, passcodeOrNull);
      } else if (c.__key) {
        // Re-encrypt with cached key: we need salt/iv for encryptJson, so rebuild via export-import path
        // Simpler: re-encrypt with a new package using existing passcode is not available here → keep existing messagesEnc
        // Only update when explicit passcode provided
      }
    },
    // Persist to localStorage with at-rest encryption applied
    save() {
      const persist = { chats: {}, order: this.order.slice(), currentChatId: this.currentChatId };
      for (const id of Object.keys(this.chats)) {
        const c = this.chats[id];
        if (!c) continue;
        const base = { id: c.id, title: c.title, createdAt: c.createdAt, favorite: !!c.favorite, project: c.project || '', locked: !!c.locked };
        // persist per-chat evo override if present
        if (c.evo && (c.evo.mode || c.evo.rounds)) base.evo = { ...(c.evo.mode ? { mode: c.evo.mode } : {}), ...(c.evo.rounds ? { rounds: c.evo.rounds } : {}) };
        if (c.locked) {
          // ensure messagesEnc exists; do not store messages in localStorage
          persist.chats[id] = { ...base, messagesEnc: c.messagesEnc || null };
        } else {
          persist.chats[id] = { ...base, messages: Array.isArray(c.messages) ? c.messages : [] };
        }
      }
      safeWrite('lumora_state_v1', persist);
    }
  };
}

function normalizeLoadedState(raw) {
  const state = { chats: {}, order: Array.isArray(raw.order) ? raw.order : [], currentChatId: raw.currentChatId || null };
  const chats = raw.chats || {};
  for (const id of Object.keys(chats)) {
    const c = chats[id] || {};
    const locked = !!c.locked || !!c.messagesEnc;
    state.chats[id] = {
      id: c.id || id,
      title: c.title || 'チャット',
      createdAt: c.createdAt || Date.now(),
      favorite: !!c.favorite,
      project: c.project || '',
      locked,
      messages: locked ? [] : (Array.isArray(c.messages) ? c.messages : []),
      messagesEnc: c.messagesEnc || null,
      __unlocked: false,
      evo: c.evo && typeof c.evo === 'object' ? { mode: c.evo.mode || undefined, rounds: c.evo.rounds || undefined } : undefined
    };
  }
  return state;
}

function safeRead(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch (_) { return null; }
}
function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}
