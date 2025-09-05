// 簡易FUP/レート制御: メモリ内にセッション単位で日次カウント
const memory = new Map();

export function rateLimitMiddleware() {
  return (req, res, next) => {
    const plan = (req.headers['x-plan'] || 'guest').toLowerCase();
    const sid = req.sid || 'anon';
    const key = `${sid}:${dayKey()}`;
    const entry = memory.get(key) || { count: 0, plan };
    entry.count += 1;
    entry.plan = plan;
    memory.set(key, entry);

    const { limit, cooldownMs } = planLimit(plan);
    const remaining = Math.max(limit - entry.count, 0);
    res.setHeader('x-usage-plan', plan);
    res.setHeader('x-usage-remaining', String(remaining));
    res.setHeader('x-usage-reset', String(msToIso(nextMidnightMs())));

    if (remaining <= 0) {
      return res.status(429).json({ error: { code: 'rate_limit', message: `上限に達しました。しばらく待ってから再試行してください（plan=${plan}）`, details: { cooldownMs } } });
    }
    next();
  };
}

export function getUsage(sid) {
  const entry = memory.get(`${sid}:${dayKey()}`) || { count: 0, plan: 'guest' };
  const { limit } = planLimit(entry.plan);
  return {
    plan: entry.plan,
    remaining: Math.max(limit - entry.count, 0),
    resetAt: new Date(nextMidnightMs()).toISOString()
  };
}

function planLimit(plan) {
  if (plan === 'pro+') return { limit: 1000000, cooldownMs: 0 };
  if (plan === 'pro') return { limit: 500000, cooldownMs: 0 };
  if (plan === 'plus') return { limit: 500, cooldownMs: 60_000 };
  // 旧体系: guest/plus/pro/pro+
  if (plan === 'guest') return { limit: 100, cooldownMs: 120_000 };
  if (plan === 'plus') return { limit: 500, cooldownMs: 60_000 };
  if (plan === 'pro+') return { limit: 1000000, cooldownMs: 0 };
  // 新体系: free/go/pro/max/ultra（当面は緩く許容。将来は厳密化）
  if (plan === 'free') return { limit: 100, cooldownMs: 120_000 };
  if (plan === 'go') return { limit: 500, cooldownMs: 60_000 };
  if (plan === 'max') return { limit: 1000000, cooldownMs: 0 };
  if (plan === 'ultra') return { limit: 1000000, cooldownMs: 0 };
  return { limit: 100, cooldownMs: 120_000 };
}

function dayKey() { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; }
function nextMidnightMs() { const d = new Date(); d.setHours(24,0,0,0); return d.getTime(); }
function msToIso(ms) { return new Date(ms).toISOString(); }


