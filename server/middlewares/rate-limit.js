// 簡易FUP/レート制御: メモリ内にセッション単位で日次カウント
const memory = new Map();
// 管理者バイパス: セッション単位でレート制限を無効化
const bypass = new Set();

export function rateLimitMiddleware() {
  return (req, res, next) => {
    const plan = (req.headers['x-plan'] || 'guest').toLowerCase();
    const sid = req.sid || 'anon';
    // 管理者バイパスはカウントも制限もしない
    if (isBypassed(sid)) {
      res.setHeader('x-usage-plan', 'bypass');
      res.setHeader('x-usage-remaining', '2147483647');
      res.setHeader('x-usage-reset', String(msToIso(nextMidnightMs())));
      return next();
    }
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
  if (isBypassed(sid)) {
    return { plan: 'bypass', remaining: 2147483647, resetAt: new Date(nextMidnightMs()).toISOString() };
  }
  const entry = memory.get(`${sid}:${dayKey()}`) || { count: 0, plan: 'guest' };
  const { limit } = planLimit(entry.plan);
  return {
    plan: entry.plan,
    remaining: Math.max(limit - entry.count, 0),
    resetAt: new Date(nextMidnightMs()).toISOString()
  };
}

function planLimit(plan) {
  // 旧体系（guest/plus/pro/pro+）と新体系（free/go/pro/max/ultra）を同等に扱う
  const MAP = {
    // legacy
    guest: { limit: 100, cooldownMs: 120_000 },
    plus: { limit: 500, cooldownMs: 60_000 },
    pro: { limit: 500000, cooldownMs: 0 },
    'pro+': { limit: 1000000, cooldownMs: 0 },
    // new
    free: { limit: 100, cooldownMs: 120_000 },
    go: { limit: 500, cooldownMs: 60_000 },
    max: { limit: 1000000, cooldownMs: 0 },
    ultra: { limit: 1000000, cooldownMs: 0 }
  };
  return MAP[plan] || MAP.guest;
}

// ===== Admin Bypass helpers =====
export function enableBypass(sid) { if (sid) bypass.add(sid); }
export function disableBypass(sid) { if (sid) bypass.delete(sid); }
export function isBypassed(sid) { return !!sid && bypass.has(sid); }

function dayKey() { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; }
function nextMidnightMs() { const d = new Date(); d.setHours(24,0,0,0); return d.getTime(); }
function msToIso(ms) { return new Date(ms).toISOString(); }


