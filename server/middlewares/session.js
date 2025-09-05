import crypto from 'node:crypto';

export function sessionMiddleware() {
  return (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie || '');
    let sid = cookies.sid;
    if (!sid) {
      sid = 's_' + crypto.randomBytes(16).toString('hex');
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    }
    req.sid = sid;
    next();
  };
}

function parseCookies(header) {
  const map = {};
  header.split(';').forEach((part) => {
    const [k, v] = part.trim().split('=');
    if (!k) return;
    map[k] = decodeURIComponent(v || '');
  });
  return map;
}


