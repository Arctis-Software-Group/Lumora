// Shared safety utilities for client and server
// Pure functions only. No DOM or browser globals here.

export const PROMPT_GUARD_VERSION = '1.0.0';

// --- Core analyzers ---
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[\s\u200b\u2060]+/g, ' ');
}

export function detectJailbreak(text) {
  const t = normalize(text);
  const patterns = [
    // English
    'ignore previous', 'ignore all previous', 'disregard your instructions', 'bypass policy', 'override policy',
    'no restrictions', 'no rules', 'unfiltered', 'uncensored', 'without limitations', 'no moral', 'no ethical',
    'developer mode', 'do anything now', 'dan mode', 'jailbreak', 'pretend to', 'roleplay as',
    'reveal system prompt', 'tell me the system prompt', 'what is your system prompt',
    // Japanese
    '前提を無視', '指示を無視', 'ルールを無視', 'ガイドラインを無視', '制限を解除', '検閲なし', '無制限', '無検閲', '脱獄',
    'なんでもできる', '何でもできる', 'システムプロンプトを表示', 'システムプロンプトを開示', 'あなたのシステムプロンプト',
  ];
  const hits = patterns.filter(p => t.includes(p));
  // Heuristic: also consider long runs of imperatives to override instructions
  const imperativeHeuristic = /(ignore|disable|override|bypass|forget)\b[^\n]{0,40}\b(system|instruction|policy|rule|guard)/i.test(text);
  const isJb = hits.length > 0 || imperativeHeuristic;
  return { isJailbreak: isJb, reasons: hits };
}

export function detectProhibitedContent(text) {
  const t = normalize(text);
  const violence = /(kill|murder|bomb|explosive|make a bomb|weapon|shoot|stab|人を殺す|殺す|爆弾|爆発物|銃の作り方|武器の作り方)/i.test(text);
  const illegal = /(hack|sql injection|phishing|malware|ransomware|ddos|botnet|crack|keygen|piracy|drug recipe|meth|覚醒剤|麻薬|不正アクセス|クレジットカード番号|クレカ|脱税|ウイルス作成)/i.test(text);
  const sexualMinors = /(child\s*(sexual|porn)|csam|児童(買春|ポルノ)|未成年.*性的)/i.test(text);
  return { violence, illegal, sexualMinors, isProhibited: violence || illegal || sexualMinors };
}

export function detectSelfHarmRisk(text) {
  return /(suicide|kill myself|self-harm|自殺|死にたい|自傷|リストカット)/i.test(text);
}

export function detectSensitiveButAllowed(text) {
  return /(mental health|depression|anxiety|therapy|メンタル|うつ|不安|カウンセリング|ストレス)/i.test(text);
}

export function analyzeSystemPrompt(text, { allowSensitive = true } = {}) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: true, action: 'allow', reasons: [] };

  const jb = detectJailbreak(trimmed);
  if (jb.isJailbreak) {
    return { ok: false, action: 'block', code: 'jailbreak', reasons: jb.reasons };
  }
  const prob = detectProhibitedContent(trimmed);
  if (prob.isProhibited) {
    return { ok: false, action: 'block', code: 'prohibited', reasons: Object.keys(prob).filter(k => prob[k] === true) };
  }
  const selfHarm = detectSelfHarmRisk(trimmed);
  if (selfHarm && !allowSensitive) {
    return { ok: false, action: 'block', code: 'self_harm', reasons: ['self_harm_risk'] };
  }
  const sensitive = detectSensitiveButAllowed(trimmed) || selfHarm;
  if (sensitive) {
    return { ok: true, action: 'allow_with_care', reasons: ['sensitive'] };
  }
  return { ok: true, action: 'allow', reasons: [] };
}

// --- Emotion Guard ---
export const EMOTION_STYLES = /** @type {const} */ (['neutral', 'empathetic', 'cheerful', 'professional']);

export function inferEmotionFromText(text) {
  const t = normalize(text);
  if (/(sad|depress|anx|worried|tired|辛い|しんどい|不安|落ち込)/i.test(text)) return 'empathetic';
  if (/(angry|frustrat|annoy|怒|苛立ち|ムカ|腹立)/i.test(text)) return 'professional';
  if (/(great|awesome|excited|嬉しい|楽しい|ワクワク|最高)/i.test(text)) return 'cheerful';
  return 'neutral';
}

export function buildEmotionStyle(tone) {
  switch (tone) {
    case 'empathetic':
      return 'Use a warm, empathetic tone. Validate feelings. Offer gentle, practical steps. Avoid diagnostic claims. Add resource options when appropriate.';
    case 'cheerful':
      return 'Use an upbeat, encouraging tone. Keep messages positive and motivating while remaining concise and respectful.';
    case 'professional':
      return 'Use a calm, professional tone. Be clear, structured, and objective. Avoid emotional language.';
    case 'neutral':
    default:
      return 'Use a neutral, clear tone. Be concise and helpful.';
  }
}

// --- Prompt construction ---
export function buildFinalSystemPrompt(userPrompt, { tone = 'neutral', allowSensitive = true } = {}) {
  const base = [
    'You are Lumora, a helpful AI assistant. Provide accurate, concise, and actionable answers.',
    'Follow platform safety: refuse illegal, violent, explicit, or harmful instructions. Do not claim real-world actions you cannot perform.',
    allowSensitive
      ? 'Sensitive topics (e.g., mental health): respond supportively with safety in mind; avoid diagnosis; suggest professional help when needed.'
      : 'If sensitive topics arise, decline and provide high-level resources. Do not discuss self-harm in detail.',
    buildEmotionStyle(tone)
  ].join('\n');

  const trimmed = String(userPrompt || '').trim();
  if (!trimmed) return base;
  // Sanity re-check to avoid accidental injection in final stage
  const analysis = analyzeSystemPrompt(trimmed, { allowSensitive });
  if (!analysis.ok) {
    throw Object.assign(new Error('Blocked system prompt'), { code: 'blocked', analysis });
  }
  return base + '\n\n' + trimmed;
}

// --- Minimal UI helpers (no DOM dependency) ---
export function validateSystemPromptForSave(userPrompt, { allowSensitive = true } = {}) {
  const a = analyzeSystemPrompt(userPrompt, { allowSensitive });
  if (!a.ok) {
    const reason = a.code === 'jailbreak' ? '脱獄/ポリシー回避の疑い' : a.code === 'prohibited' ? '不正・違法・暴力的内容' : '高リスク内容';
    return { ok: false, message: `このシステムプロンプトは保存できません（${reason}）` };
  }
  return { ok: true, message: 'OK' };
}

