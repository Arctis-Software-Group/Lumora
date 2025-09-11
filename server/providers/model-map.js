// ラベル → { provider, id, plan } へのマップ定義

const MODELS = [
  // Free Plan - 基本的なモデルを提供
  { label: 'GPT-OSS 20B', id: 'openai/gpt-oss-20b:free', provider: 'openrouter', plan: 'free' },
  { label: 'Llama 3.2 3B', id: 'meta-llama/llama-3.2-3b-instruct', provider: 'openrouter', plan: 'free' },
  { label: 'Kimi K2', id: 'moonshotai/kimi-k2:free', provider: 'openrouter', plan: 'free' },
  { label: 'DeepSeek R1', id: 'deepseek/deepseek-r1-0528:free', provider: 'openrouter', plan: 'free' },
  { label: 'Qwen 3', id: 'qwen/qwen3-235b-a22b:free', provider: 'openrouter', plan: 'free' },
  { label: 'Qwen 3 30B Thinking', id: 'qwen/qwen3-30b-a3b-thinking-2507:free', provider: 'openrouter', plan: 'free' },
  { label: 'Qwen 2.5 VL 32B', id: 'qwen/qwen2.5-vl-32b-instruct:free', provider: 'openrouter', plan: 'free' },
  { label: 'LFM 7B', id: 'liquid/lfm-7b', provider: 'openrouter', plan: 'free' },
  { label: 'Nemotron Nano 9B v2', id: 'nvidia/nemotron-nano-9b-v2', provider: 'openrouter', plan: 'free' },

  // Go Plan - 安定性と多様な選択肢を提供
  { label: 'GPT-OSS 20B', id: 'openai/gpt-oss-20b', provider: 'openrouter', plan: 'go' },
  { label: 'GLM-4.5 Air', id: 'z-ai/glm-4.5-air:free', provider: 'openrouter', plan: 'go' },
  { label: 'Hunyuan-A13B', id: 'tencent/hunyuan-a13b-instruct', provider: 'openrouter', plan: 'go' },
  { label: 'Amazon Nova Micro 1.0', id: 'amazon/nova-micro-v1', provider: 'openrouter', plan: 'go' },
  { label: 'Amazon Nova Lite 1.0', id: 'amazon/nova-lite-v1', provider: 'openrouter', plan: 'go' },
  { label: 'GPT-5 Nano', id: 'openai/gpt-5-nano', provider: 'openrouter', plan: 'go' },
  { label: 'GPT-OSS 120B', id: 'openai/gpt-oss-120b', provider: 'openrouter', plan: 'go' },
  { label: 'Llama 4 Scout', id: 'meta-llama/llama-4-scout', provider: 'openrouter', plan: 'go' },
  { label: 'Gemini 2.5 Flash Lite', id: 'google/gemini-2.5-flash-lite', provider: 'openrouter', plan: 'go' },
  { label: 'ERNIE 4.5', id: 'baidu/ernie-4.5-vl-28b-a3b', provider: 'openrouter', plan: 'go' },
  { label: 'Hermes 4 70B', id: 'nousresearch/hermes-4-70b', provider: 'openrouter', plan: 'go' },

  // Pro Plan - 高度な推論とマルチモーダル機能を提供
  { label: 'DeepSeek V3.1', id: 'deepseek/deepseek-chat-v3.1', provider: 'openrouter', plan: 'pro' },
  { label: 'GPT-5 Mini', id: 'openai/gpt-5-mini', provider: 'openrouter', plan: 'pro' },
  { label: 'GPT-5', id: 'openai/gpt-5', provider: 'openrouter', plan: 'pro' },
  { label: 'Gemini 2.5 Flash', id: 'google/gemini-2.5-flash', provider: 'openrouter', plan: 'pro' },
  { label: 'Gemini 2.5 Pro', id: 'google/gemini-2.5-pro', provider: 'openrouter', plan: 'pro' },
  { label: 'Amazon Nova Pro 1.0', id: 'amazon/nova-pro-v1', provider: 'openrouter', plan: 'pro' },
  { label: 'Grok 3 Mini', id: 'x-ai/grok-3-mini', provider: 'openrouter', plan: 'pro' },
  { label: 'Grok Code Fast 1', id: 'x-ai/grok-code-fast-1', provider: 'openrouter', plan: 'pro' },
  { label: 'Hermes 4 405B', id: 'nousresearch/hermes-4-405b', provider: 'openrouter', plan: 'pro' },

  // Max Plan - 高度な機能と無修正モデルを提供
  { label: 'Uncensored Model', id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', provider: 'openrouter', plan: 'max' },
  { label: 'Claude Sonnet 4.0', id: 'anthropic/claude-sonnet-4', provider: 'openrouter', plan: 'max' },
  { label: 'GPT-4o', id: 'openai/gpt-4o', provider: 'openrouter', plan: 'max' },

  // Ultra Plan - 最高性能モデルを提供
  { label: 'Grok 4', id: 'x-ai/grok-4', provider: 'openrouter', plan: 'ultra' },
  { label: 'o3-Pro', id: 'openai/o3-pro', provider: 'openrouter', plan: 'ultra' }
];

const LABEL_TO_INFO = new Map(MODELS.map((m) => [m.label, m]));
const ID_TO_INFO = new Map(MODELS.map((m) => [m.id, m]));

export function getProviderAndId(labelOrId) {
  // label か、既に provider/model-id 形式のIDのいずれにも対応
  if (typeof labelOrId === 'string' && labelOrId.includes('/')) {
    // Nemotron v2 互換: 旧 ":free" サフィックスを無印IDへ移行
    if (labelOrId === 'nvidia/nemotron-nano-9b-v2:free') {
      const m = ID_TO_INFO.get('nvidia/nemotron-nano-9b-v2');
      if (m) return { provider: m.provider, providerModelId: m.id, plan: m.plan };
      return { provider: 'openrouter', providerModelId: 'nvidia/nemotron-nano-9b-v2', plan: inferPlan('nvidia/nemotron-nano-9b-v2') };
    }
    const known = ID_TO_INFO.get(labelOrId);
    if (known) return { provider: known.provider, providerModelId: known.id, plan: known.plan };
    return { provider: 'openrouter', providerModelId: labelOrId, plan: inferPlan(labelOrId) };
  }

  // Groq の生モデルID（llama-, mixtral- など）が渡ってきた場合に対応
  if (typeof labelOrId === 'string' && /^(llama|mixtral|gemma|whisper)/.test(labelOrId)) {
    return { provider: 'groq', providerModelId: labelOrId, plan: 'free' };
  }

  const hit = LABEL_TO_INFO.get(labelOrId);
  if (hit) return { provider: hit.provider, providerModelId: hit.id, plan: hit.plan };
  // 既定: OpenRouterの安全モデル
  return { provider: 'openrouter', providerModelId: 'openai/gpt-5-mini', plan: 'pro' };
}

function inferPlan(providerModelId) {
  // 既知のモデルIDからプランを推定
  const knownModel = ID_TO_INFO.get(providerModelId);
  if (knownModel) return knownModel.plan;

  // 簡易: openrouterの一部suffixで推定
  if (providerModelId === 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free') return 'max'; // 特例
  if (providerModelId.endsWith(':free')) return 'free'; // Free Planのモデルは:freeを使用
  return 'pro';
}

export function allModels() { return MODELS.slice(); }
