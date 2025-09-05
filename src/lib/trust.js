// Lightweight client-side confidence estimator for assistant replies
// Heuristics only: 0.0 - 1.0
export function estimateConfidence({ text, modelLabel = '', modelId = '' }) {
  const t = String(text || '').trim();
  if (!t) return 0.2;

  const lower = t.toLowerCase();
  // Hedging/uncertainty cues (JA/EN)
  const hedges = [
    'わかりません', '不明', '難しい', 'できません', '曖昧', '可能性', 'かもしれ', '推測', '推定', '保証', '確証',
    'i am not sure', 'i\'m not sure', 'not certain', 'uncertain', 'maybe', 'perhaps', 'might', 'cannot', "can't",
    'as an ai', 'i cannot', 'i can\'t'
  ];
  const hedgeHits = hedges.reduce((acc, w) => acc + (t.includes(w) || lower.includes(w) ? 1 : 0), 0);

  // Specificity: code blocks, lists, numbers
  const codeBlocks = (t.match(/```/g) || []).length;
  const lists = (t.match(/^[-*]\s/mg) || []).length;
  const numerics = (t.match(/\b\d{2,}(?:\.\d+)?\b/g) || []).length;

  // Length and structure
  const lengthScore = clamp01(t.length / 1200); // saturate around ~1200 chars
  const structureScore = clamp01((codeBlocks * 0.5) + (lists * 0.1) + (numerics * 0.05));
  const hedgePenalty = Math.min(0.5, hedgeHits * 0.08);

  // Model prior (very light bias)
  const model = (modelId || modelLabel || '').toLowerCase();
  let prior = 0.55;
  if (model.includes('gpt-5')) prior = 0.68;
  else if (model.includes('gpt-4') || model.includes('sonnet') || model.includes('gemini-2.5')) prior = 0.62;
  else if (model.includes('nano') || model.includes('20b') || model.includes('scout')) prior = 0.52;

  const score = clamp01(
    prior * 0.5 +
    lengthScore * 0.2 +
    structureScore * 0.35 -
    hedgePenalty
  );
  return score;
}

export function formatConfidence(score) {
  const pct = Math.round(clamp01(score) * 100);
  return pct + '%';
}

function clamp01(x) { return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0)); }

