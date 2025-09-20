import { enableBypass } from '../middlewares/rate-limit.js';

// POST /api/admin/unlock-rate-limit { pass }
export default function adminUnlockRateLimit(req, res) {
  try {
    const expected = String(process.env.LUMORA_RATE_LIMIT_PASSWORD || '').trim();
    const provided = String(req.body?.pass || '').trim();
    if (!expected) return res.status(500).json({ error: { code: 'not_configured', message: 'Admin password not configured' } });
    if (!provided || provided !== expected) return res.status(403).json({ error: { code: 'forbidden', message: 'Invalid password' } });
    const sid = req.sid || 'anon';
    enableBypass(sid);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: { code: 'internal', message: e?.message || 'Internal error' } });
  }
}

