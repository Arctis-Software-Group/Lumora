const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function cleanString(value) {
  const str = String(value);
  return str.replace(CONTROL_CHARS, ' ').trim();
}

export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return cleanString(value);
}

export function sanitizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function sanitizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true' || lowered === 'on' || lowered === 'yes' || lowered === '1') return true;
    if (lowered === 'false' || lowered === 'off' || lowered === 'no' || lowered === '0') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
}

export function sanitizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeValue(item)).filter((item) => item !== null && item !== undefined && item !== '');
}

export function sanitizeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value).map(([key, val]) => [cleanString(key), sanitizeValue(val)]);
  return entries.reduce((acc, [key, val]) => {
    if (val === null || val === undefined || val === '') return acc;
    acc[key] = val;
    return acc;
  }, {});
}

export function sanitizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value === 'number') return sanitizeNumber(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return sanitizeArray(value);
  if (typeof value === 'object') return sanitizeObject(value);
  return '';
}

export function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') {
    const normalized = sanitizeText(value);
    if (!normalized) return [];
    if (normalized.includes('\n')) {
      return normalized.split('\n').map((item) => item.trim()).filter(Boolean);
    }
    if (normalized.includes('|')) {
      return normalized.split('|').map((item) => item.trim()).filter(Boolean);
    }
    return [normalized];
  }
  return [sanitizeValue(value)].filter((item) => item !== '' && item !== null && item !== undefined);
}

export function ensureObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}
