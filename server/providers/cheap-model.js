import fetch from 'node-fetch';

// Lightweight completion for Micro-Pause Insight™
// Accepts short `text` and a logical `model` key, returns up to 3 suggestions.
export async function getMicroPauseSuggestions({ text, model, signal }) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  const fallback = () => generateFallbackSuggestions(trimmed);

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fallback();

  const providerModelId = resolveCheapModel(model);
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const referer = process.env.OPENROUTER_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Keep the prompt minimal and strongly constrained to JSON
  const system = `あなたは文章補完アシスタントです。次の制約を厳守してください:\n` +
    `- 出力は JSON オブジェクトのみ。余計なテキストや説明は禁止。\n` +
    `- フィールド: suggestions（2〜3件の短い自然な候補文、日本語、句点は任意）。\n` +
    `- 候補は現在の文脈に自然に続く一文またはフレーズ。\n` +
    `- それ以外は一切出力しない。`;

  const user = `ユーザーは今この文章を書いています:\n${trimmed}\n\nこの文章に自然に続く候補文を2〜3件生成してください。`;

  const body = {
    model: providerModelId,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.7,
    max_tokens: 120,
    stream: false,
    response_format: { type: 'json_object' }
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': referer,
        'X-Title': 'Lumora Micro-Pause'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!resp.ok) {
      let detail = '';
      try { detail = await resp.text(); } catch (_) {}
      throw new Error(`OpenRouter HTTP ${resp.status}${detail ? `: ${detail}` : ''}`);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const suggestions = safeParseSuggestions(raw);
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const local = fallback();
      return local.slice(0, 3);
    }
    return suggestions.slice(0, 3);
  } catch (err) {
    try { console.warn('[micro-pause] fallback to local suggestions', err?.message || err); } catch (_) {}
    const local = fallback();
    return local.slice(0, 3);
  }
}

function resolveCheapModel(input) {
  // Accept shorthand keys; try to keep id stable even if upstream changes.
  const map = new Map([
    ['lfm-7b', 'liquid/lfm-7b'],
    ['hunyuan-a13b-instruct', 'tencent/hunyuan-a13b-instruct'],
    ['hunyuan-13b', 'tencent/hunyuan-a13b-instruct'],
    ['google/gemma-3n-e4b-it', 'openai/gpt-oss-20b:free'],
    ['gemma-3n-e4b-it', 'openai/gpt-oss-20b:free'],
  ]);
  const id = map.get(input) || input;
  // If the value looks like a provider id already, return as-is.
  if (typeof id === 'string' && id.includes('/')) return id;
  // Fallback to a known cheap/free model
  return 'liquid/lfm-7b';
}

function safeParseSuggestions(s) {
  // Try strict JSON first
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j?.suggestions)) {
      return j.suggestions.map(x => String(x)).filter(Boolean);
    }
  } catch (_) {}
  // Try fenced code block with JSON
  try {
    const m = String(s).match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m && m[1]) {
      const j = JSON.parse(m[1]);
      if (Array.isArray(j?.suggestions)) {
        return j.suggestions.map(x => String(x)).filter(Boolean);
      }
    }
  } catch (_) {}
  // Try to extract embedded JSON object
  try {
    const str = String(s);
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const j = JSON.parse(str.slice(start, end + 1));
      if (Array.isArray(j?.suggestions)) {
        return j.suggestions.map(x => String(x)).filter(Boolean);
      }
    }
  } catch (_) {}
  // Try to extract suggestions from bullet points or lines
  const lines = String(s).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bullets = lines
    .map(l => l.replace(/^[-*•\d\.)\s]+/, '').trim())
    .filter(l => !!l);
  if (bullets.length) return bullets.slice(0, 3);
  // Final fallback: return the whole content as one suggestion
  return s ? [String(s).trim()] : [];
}

function generateFallbackSuggestions(text) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const sentences = clean.split(/(?:。|．|。|!|！|\?|？)/).map(s => s.trim()).filter(Boolean);
  const last = sentences[sentences.length - 1] || clean;
  const shortTopic = last.length > 40 ? last.slice(-40) : last;
  const isQuestion = /[?？]$/.test(clean);
  const lower = clean.toLowerCase();
  const suggestions = [];

  if (isQuestion) {
    suggestions.push('質問の背景や目的を一文で補足して、どこまで分かっているか共有してみましょう。');
    suggestions.push('求めている答えの粒度（例: 箇条書き・ステップ・サンプルコード）を指定すると回答の方向性が安定します。');
  } else {
    suggestions.push(`${shortTopic}について、現状・課題・理想の3点を箇条書きにしてみましょう。`);
    suggestions.push(`${shortTopic}の目的や前提条件を書き足すと方向性が伝わりやすくなります。`);
  }

  suggestions.push('期待するアウトプット形式（要約・チェックリスト・表など）や文字数を指定すると意図がより明確になります。');

  if (!/(いつ|期限|期日)/.test(clean) && !/deadline|by\s/.test(lower)) {
    suggestions.push('欲しいタイミングや優先度を書き添えると、次のアクションが決めやすくなります。');
  }

  if (!/例|サンプル|具体/.test(clean) && !/example|sample/.test(lower)) {
    suggestions.push('参考になる事例や制約条件があれば、一緒に伝えると回答の精度が上がります。');
  }

  return Array.from(new Set(suggestions.filter(Boolean))).slice(0, 3);
}
