import { sanitizeObject, sanitizeText, sanitizeValue, sanitizeArray } from '../utils/sanitize.js';

const BLOCK_PATTERN = /【RVI-JSON】([\s\S]*?)【\/RVI-JSON】/gi;
const FENCE_PATTERN = /```(?:rvi-?json|rvi|jsonc?|json5)?\s*\n([\s\S]*?)```/gi;
const ALLOWED_TYPES = new Set(['keypoints', 'comparison', 'steps', 'checklist', 'timeline', 'tradeoffs', 'cause-effect', 'metrics', 'fallback']);

function normalizeType(type) {
  if (!type) return 'fallback';
  const normalized = String(type).trim().toLowerCase();
  if (ALLOWED_TYPES.has(normalized)) return normalized;
  if (normalized === 'causeeffect' || normalized === 'cause_effect') return 'cause-effect';
  if (normalized === 'trade-off' || normalized === 'tradeoff') return 'tradeoffs';
  return ALLOWED_TYPES.has(normalized) ? normalized : 'fallback';
}

function buildBlock(rawObject) {
  if (!rawObject || (typeof rawObject !== 'object' && !Array.isArray(rawObject))) {
    return {
      type: 'fallback',
      version: '1.0',
      payload: { raw: '' }
    };
  }
  // Normalize type/version
  let type = normalizeType(rawObject.type);
  const version = sanitizeText(rawObject.version || '1.0') || '1.0';

  // Build payload flexibly:
  // - If payload exists as an object, use it.
  // - If the root is an array, treat it as items.
  // - Otherwise, take remaining root properties (excluding type/version) as payload.
  let payload = {};
  if (rawObject && typeof rawObject === 'object' && !Array.isArray(rawObject) && rawObject.payload && typeof rawObject.payload === 'object' && !Array.isArray(rawObject.payload)) {
    payload = sanitizeObject(rawObject.payload);
  } else if (Array.isArray(rawObject)) {
    payload = { items: sanitizeArray(rawObject) };
  } else if (rawObject && typeof rawObject === 'object') {
    const rest = { ...rawObject };
    delete rest.type;
    delete rest.version;
    payload = sanitizeObject(rest);
  }

  // Heuristic type inference if not explicitly provided or fell back
  if (!rawObject.type || type === 'fallback') {
    const p = payload || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(p, k);
    const includesKeys = (...keys) => keys.some(k => has(k));
    // comparison
    if (includesKeys('options', 'alternatives', 'choices') || has('attributes')) type = 'comparison';
    // steps
    else if (includesKeys('steps', 'sequence', 'flow')) type = 'steps';
    // checklist
    else if (has('checklist')) type = 'checklist';
    else if (Array.isArray(p.items) && p.items.some(it => typeof it === 'object' && it && (('checked' in it) || ('done' in it) || ('complete' in it)))) type = 'checklist';
    // timeline
    else if (includesKeys('events', 'timeline', 'milestones')) type = 'timeline';
    // tradeoffs
    else if (has('tradeoffs') || (Array.isArray(p.options) && p.options.some(o => o && typeof o === 'object' && (('gains' in o) || ('costs' in o))))) type = 'tradeoffs';
    // cause-effect
    else if (includesKeys('pairs', 'links', 'flows')) type = 'cause-effect';
    // metrics
    else if (includesKeys('metrics', 'kpis', 'values')) type = 'metrics';
    // keypoints (common alternates)
    else if (
      Array.isArray(p.items) ||
      includesKeys('points', 'keypoints', 'list', 'bullets', 'entries', 'highlights', 'bullet_points', 'key_points')
    ) type = 'keypoints';
  }

  return { type, version, payload };
}

function removeSegments(source, segments) {
  if (!segments.length) return source;
  let cursor = 0;
  const parts = [];
  segments.sort((a, b) => a.start - b.start).forEach((segment) => {
    parts.push(source.slice(cursor, segment.start));
    cursor = segment.end;
  });
  parts.push(source.slice(cursor));
  return parts.join('');
}

function tryParseJson(raw) {
  const looseNormalize = (s) => {
    try {
      // Remove // comments
      s = s.replace(/\/\/.*$/gm, '');
      // Remove /* */ comments
      s = s.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove trailing commas in objects/arrays
      s = s.replace(/,\s*([}\]])/g, '$1');
      return s;
    } catch (_) { return raw; }
  };
  try {
    const parsed = JSON.parse(raw);
    return buildBlock(parsed);
  } catch (_) {
    try {
      const cleaned = looseNormalize(String(raw));
      const parsed2 = JSON.parse(cleaned);
      return buildBlock(parsed2);
    } catch (_) {
      return {
        type: 'fallback',
        version: '1.0',
        payload: { raw: sanitizeText(raw) }
      };
    }
  }
}

export function extractJsonBlocks(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { cleaned: typeof raw === 'string' ? raw : '', blocks: [] };
  }
  const segments = [];
  const blocks = [];
  let match;

  BLOCK_PATTERN.lastIndex = 0;
  while ((match = BLOCK_PATTERN.exec(raw)) !== null) {
    const segment = { start: match.index, end: BLOCK_PATTERN.lastIndex };
    segments.push(segment);
    const body = (match[1] || '').trim();
    if (!body) continue;
    blocks.push(tryParseJson(body));
  }

  FENCE_PATTERN.lastIndex = 0;
  while ((match = FENCE_PATTERN.exec(raw)) !== null) {
    const body = (match[1] || '').trim();
    if (!body) continue;
    segments.push({ start: match.index, end: FENCE_PATTERN.lastIndex });
    blocks.push(tryParseJson(body));
  }

  const cleaned = removeSegments(raw, segments).replace(/\n{3,}/g, '\n\n').trimEnd();
  return { cleaned, blocks };
}
