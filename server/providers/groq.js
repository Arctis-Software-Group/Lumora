import fetch from 'node-fetch';

export async function streamFromGroq({ model, messages, signal, apiKey }) {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new Error('Missing GROQ_API_KEY');

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      // 直接GroqのモデルIDが指定されていればそれを利用、なければ既定にフォールバック
      model: resolveGroqModel(model) || 'llama-3.1-8b-instant',
      messages,
      stream: true
    }),
    signal
  });
  if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`);
  return resp.body; // ReadableStream
}

function resolveGroqModel(input) {
  if (!input) return null;
  // すでにGroqのモデルIDらしき値（llama-/mixtral- 等）はそのまま使う
  if (/^(llama|mixtral|gemma|whisper)/.test(String(input))) return String(input);
  // 既知の別名 → Groq モデル
  const labelMap = new Map([
    ['Mistral 7B', 'mixtral-8x7b-32768'],
    ['Phi-3 Mini', 'llama-3.1-8b-instant']
  ]);
  return labelMap.get(String(input)) || null;
}


