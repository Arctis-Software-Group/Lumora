import { getMicroPauseSuggestions } from '../providers/cheap-model.js';

// POST /api/micro-pause
// { text, model }
export default async function microPauseRoute(req, res, next) {
  try {
    const { text, model } = req.body || {};
    const trimmed = String(text || '').trim();
    if (!trimmed) return res.status(400).json({ error: { message: 'text is required' } });

    // Basic guardrails: avoid very short or too long requests
    if (trimmed.length < 6) return res.status(200).json({ suggestions: [] });
    if (trimmed.length > 2000) return res.status(200).json({ suggestions: [] });

    // Model can be shorthand ('lfm-7b' etc.) or provider id
    const suggestions = await getMicroPauseSuggestions({ text: trimmed, model: model || 'lfm-7b', signal: req.abortSignal });

    // Ensure 2–3 suggestions if possible
    const unique = Array.from(new Set((suggestions || []).map(s => String(s).trim()))).filter(Boolean);
    return res.json({ suggestions: unique.slice(0, 3) });
  } catch (err) {
    // Telemetry stub: log and return empty to avoid disrupting UX
    try { console.warn('[micro-pause] failure', err?.message || err); } catch (_) {}
    return res.json({ suggestions: [] });
  }
}

