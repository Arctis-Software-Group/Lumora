import { sseHeaders, writeEvent, pipeOpenAIStreamToSSE } from '../lib/sse.js';
import { streamFromGroq } from '../providers/groq.js';
import { streamFromOpenRouter } from '../providers/openrouter.js';
import { getProviderAndId, allModels } from '../providers/model-map.js';

export default async function chatRoute(req, res, next) {
  const { model, messages, reasoning, plugins } = req.body || {};
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: { code: 'bad_request', message: 'model と messages は必須です' } });
  }

  // Lumora Auto 対応
  const planHeader = (req.get('x-plan') || '').toLowerCase(); // guest/plus/pro/pro+
  const isAuto = String(model).toLowerCase() === 'auto' || String(model).toLowerCase() === 'lumora-auto';
  const resolved = isAuto ? autoSelectModel({ messages, planHeader, reasoning }) : getProviderAndId(model);
  const provider = resolved.provider;

  // Enforce plan gating for explicitly selected models as well
  if (!isAuto) {
    const allow = allowedPlanSet(planHeader);
    if (!allow.has(resolved.providerModelId)) {
      const label = labelFromId(resolved.providerModelId) || resolved.providerModelId;
      return res.status(403).json({ error: { code: 'plan_required', message: `選択したモデル「${label}」は現在のプランではご利用いただけません。対応プランにアップグレードしてください。` } });
    }
  }

  try {
    let upstreamStream;
    if (provider === 'groq') {
      const groqKey = req.get('x-groq-key');
      upstreamStream = await streamFromGroq({ model: resolved.providerModelId, messages, signal: req.abortSignal || undefined, apiKey: groqKey });
    } else {
      const apiKey = req.get('x-openrouter-key');
      upstreamStream = await streamFromOpenRouter({ model: resolved.providerModelId, messages, signal: req.abortSignal || undefined, apiKey, reasoning, plugins });
    }
    // 上流接続に成功してからSSE開始
    sseHeaders(res);
    // Auto の場合は実際のモデル情報を通知
    try {
      if (isAuto) {
        const meta = {
          id: resolved.providerModelId,
          provider: resolved.provider,
          plan: resolved.plan,
          label: labelFromId(resolved.providerModelId) || resolved.providerModelId
        };
        writeEvent(res, 'routed', meta);
      }
    } catch (_) {}
    await pipeOpenAIStreamToSSE(upstreamStream, res);
  } catch (err) {
    // フォールバックでテンプレートは返さず、明示的にエラー応答
    const msg = String(err?.message || 'Upstream connection failed');
    const m = msg.match(/HTTP\s+(\d{3})/i);
    const status = m ? parseInt(m[1], 10) : 502;
    return res.status(status).json({ error: { code: 'upstream_error', message: msg } });
  }
}

// 旧モックは撤去（本稼働に向けて明示エラーに一本化）

// ===== Auto Routing =====
function autoSelectModel({ messages, planHeader, reasoning }) {
  const text = concatText(messages).toLowerCase();
  const hasCode = /```|\b(code|bug|stack trace|error:)\b|function\s+|class\s+|def\s+|<\/?\w+>/.test(text);
  const isLong = text.length > 800 || messages.length > 8;
  const hasVision = messages.some(m => Array.isArray(m.content) && m.content.some(p => p?.type === 'image_url' || p?.type === 'file'));
  const askReasoning = reasoning?.effort || /think|reason|step|why|なぜ|考え|推論/.test(text);
  // 論文執筆タスクの簡易検出（日本語/英語）
  const isPaper = /論文|学術|査読|研究|要旨|概要|アブストラクト|抄録|関連研究|方法|結果|考察|参考文献|引用|BibTeX|セクション構成|Academic|paper|manuscript|journal|conference|abstract|introduction|methods|results|discussion|references|citation|literature review/.test(text);

  // プラン制約（サブセット）
  const allow = allowedPlanSet(planHeader);

  // 優先度ルール
  let wanted = null;
  if (hasVision) {
    // コスト重視: まず無料/廉価なビジョンモデルを優先
    wanted = firstAllowed(allow, [
      'qwen/qwen2.5-vl-32b-instruct:free',
      'google/gemini-2.5-flash-lite',
      'amazon/nova-lite-v1',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro'
    ]);
  } else if (isPaper) {
    // 論文執筆系は品質とコストのバランスで GPT-5 Mini / DeepSeek V3.1 を優先
    wanted = firstAllowed(allow, [
      'openai/gpt-5-mini',
      'deepseek/deepseek-chat-v3.1',
      // 代替の低コスト候補
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b:free'
    ]);
  } else {
    // 一般/コード/長文/推論でも、まずは GPT-OSS 系でコスト最小化
    // ゲスト: 20B Free、Go/Pro: 20B or 120B
    wanted = firstAllowed(allow, [
      'openai/gpt-oss-20b:free',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'meta-llama/llama-4-scout'
    ]);
  }

  const normalized = getProviderAndId(wanted || 'openai/gpt-5-mini');
  return normalized;
}

function allowedPlanSet(planHeader) {
  // Build plan-based sets from the source of truth (server/providers/model-map.js)
  const models = allModels();
  const byPlan = (plan) => new Set(models.filter(m => m.plan === plan).map(m => m.id));

  const free = byPlan('free');
  const go = byPlan('go');
  const pro = byPlan('pro');
  const max = byPlan('max');
  const ultra = byPlan('ultra');

  // guest: free only
  if (planHeader === 'guest') return free;
  // plus: Go and Free
  if (planHeader === 'plus') return new Set([...free, ...go]);
  // pro: Pro, Go, and Free
  if (planHeader === 'pro') return new Set([...free, ...go, ...pro]);
  // pro+ or unknown: include everything (Max and Ultra too)
  return new Set([...free, ...go, ...pro, ...max, ...ultra]);
}

function firstAllowed(allow, candidates) {
  for (const id of candidates) {
    if (allow.has(id)) return id;
  }
  // fallback to first
  return candidates[0];
}

function concatText(messages) {
  let out = '';
  for (const m of messages || []) {
    if (typeof m.content === 'string') out += '\n' + m.content;
    else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p?.type === 'text' && p?.text) out += '\n' + p.text;
      }
    }
  }
  return out;
}

function labelFromId(id) {
  const entry = allModels().find(m => m.id === id);
  return entry?.label || null;
}
