// Lightweight browser crypto helpers for passcode-protected chats
// AES-GCM + PBKDF2(SHA-256), 100k iterations

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function getKeyMaterial(passcode) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(String(passcode || '')),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
}

export async function deriveAesKey(passcode, saltBytes, iterations = 100000) {
  const keyMaterial = await getKeyMaterial(passcode);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJson(obj, passcode) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passcode, salt);
  const plaintext = textEncoder.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iter: 100000,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(cipher)
  };
}

export async function decryptJson(pkg, passcode) {
  if (!pkg || pkg.alg !== 'AES-GCM') throw new Error('Invalid package');
  const salt = new Uint8Array(fromB64(pkg.salt));
  const iv = new Uint8Array(fromB64(pkg.iv));
  const key = await deriveAesKey(passcode, salt, pkg.iter || 100000);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromB64(pkg.data));
  const text = textDecoder.decode(plainBuf);
  const obj = JSON.parse(text);
  return { obj, key };
}

export function hasWebCrypto() {
  return !!(window.crypto && window.crypto.subtle);
}

