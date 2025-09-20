import { ensureArray, ensureObject, sanitizeObject, sanitizeText, sanitizeValue } from '../utils/sanitize.js';

const TAG_PATTERN = /\[(rvi[a-z0-9_-]+)([^\]]*)\]([\s\S]*?)\[\/\1\]/gi;
const TYPE_MAP = {
  rvikeypoints: 'keypoints',
  rvikeypoint: 'keypoints',
  rvikeycard: 'keypoints',
  rvicomparison: 'comparison',
  rvicompare: 'comparison',
  rvisteps: 'steps',
  rvichecklist: 'checklist',
  rvitimeline: 'timeline',
  rvitradeoffs: 'tradeoffs',
  rvitradeoff: 'tradeoffs',
  rvicauseeffect: 'cause-effect',
  'rvicause-effect': 'cause-effect',
  rvicause_effect: 'cause-effect',
  rvimetric: 'metrics',
  rvimetrics: 'metrics'
};

function normalizeType(tagName) {
  const key = tagName.toLowerCase();
  return TYPE_MAP[key] || 'fallback';
}

function parseAttributes(raw) {
  if (!raw) return {};
  const attrs = {};
  const ATTR_PATTERN = /([a-z0-9_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"']+))/gi;
  let match;
  while ((match = ATTR_PATTERN.exec(raw)) !== null) {
    const key = sanitizeText(match[1]);
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attrs[key] = sanitizeText(value);
  }
  return attrs;
}

function buildPayload(type, body, attrs) {
  const trimmed = (body || '').trim();
  if (!trimmed) return { ...attrs };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const sanitized = Array.isArray(parsed) ? ensureArray(parsed) : ensureObject(parsed);
      return { ...attrs, ...sanitized };
    } catch (_) {
      return { ...attrs, raw: sanitizeText(trimmed) };
    }
  }
  if (type === 'keypoints' || type === 'steps' || type === 'checklist') {
    const lines = trimmed.split('\n').map((line) => sanitizeText(line)).filter(Boolean);
    return { ...attrs, items: lines };
  }
  if (type === 'timeline') {
    const lines = trimmed.split('\n').map((line) => sanitizeText(line)).filter(Boolean);
    return { ...attrs, events: lines };
  }
  return { ...attrs, raw: sanitizeText(trimmed) };
}

export function extractTagBlocks(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { cleaned: typeof raw === 'string' ? raw : '', blocks: [] };
  }
  const segments = [];
  const blocks = [];
  let match;

  TAG_PATTERN.lastIndex = 0;
  while ((match = TAG_PATTERN.exec(raw)) !== null) {
    const [, tagName, attrText, body] = match;
    const type = normalizeType(tagName);
    const attrs = sanitizeObject(parseAttributes(attrText));
    const payload = buildPayload(type, body, attrs);
    const segment = { start: match.index, end: TAG_PATTERN.lastIndex };
    segments.push(segment);
    blocks.push({ type, version: '1.0', payload: sanitizeValue(payload) });
  }

  const cleaned = segments.length ? raw.replace(TAG_PATTERN, '').replace(/\n{3,}/g, '\n\n').trimEnd() : raw;
  return { cleaned, blocks };
}
