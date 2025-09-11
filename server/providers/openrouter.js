import fetch from 'node-fetch';

export async function streamFromOpenRouter({ model, messages, signal, apiKey, reasoning, plugins }) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('Missing OPENROUTER_API_KEY');

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const referer = process.env.OPENROUTER_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': referer,
      'X-Title': 'Lumora'
    },
    body: JSON.stringify({
      // フロントからは provider/model-id が渡ってくる想定。古い値にもフォールバック。
      model: resolveModel(model) || model || 'openai/gpt-5-mini',
      messages,
      // Reasoning / Plugins を必要に応じてパススルー
      ...(reasoning ? { reasoning } : {}),
      ...(plugins ? { plugins } : {}),
      stream: true
    }),
    signal
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = await resp.text(); } catch (_) {}
    throw new Error(`OpenRouter HTTP ${resp.status}${detail ? `: ${detail}` : ''}`);
  }
  return resp.body; // ReadableStream
}

function resolveModel(input) {
  // すでに OpenRouter のモデルID（例: openai/gpt-5-mini）が渡ってきた場合はそのまま使用
  if (typeof input === 'string' && input.includes('/')) return input;
  // 念のためラベルからのフォールバックマップも保持
  const labelToId = new Map([
    ['GPT-5', 'openai/gpt-5'],
    ['GPT-5 Mini', 'openai/gpt-5-mini'],
    ['GPT-5 Nano', 'openai/gpt-5-nano'],
    ['Gemini 2.5 Flash', 'google/gemini-2.5-flash'],
    ['Gemini 2.5 Flash Lite', 'google/gemini-2.5-flash-lite'],
    ['Gemini 2.5 Pro', 'google/gemini-2.5-pro'],
    ['Claude Sonnet 4', 'anthropic/claude-sonnet-4'],
    ['Llama 4 Maverick 17B 128E (Deprecated)', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
    ['GPT-OSS 20B', 'openai/gpt-oss-20b'],
    ['GPT-OSS 120B', 'openai/gpt-oss-120b'],
    ['Kimi K2 Instruct', 'moonshotai/kimi-k2-instruct'],
    ['Grok 3 Mini', 'x-ai/grok-3-mini'],
    ['Grok 4', 'x-ai/grok-4'],
    ['Grok Code Fast 1', 'x-ai/grok-code-fast-1'],
    ['ChatGPT-4o-latest', 'openai/chatgpt-4o-latest'],
    ['Amazon Nova Lite', 'amazon/nova-lite-v1'],
    ['Amazon Nova Micro', 'amazon/nova-micro-v1'],
    ['Amazon Nova Pro', 'amazon/nova-pro-v1'],
    ['Uncensored', 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'],
    ['Hermes 4 405B', 'nousresearch/hermes-4-405b'],
    ['Hermes 4 70B', 'nousresearch/hermes-4-70b'],
    ['LFM 7B', 'liquid/lfm-7b'],
  ]);
  return labelToId.get(input) || null;
}
