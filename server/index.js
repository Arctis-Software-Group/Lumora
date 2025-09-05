import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sessionMiddleware } from './middlewares/session.js';
import { rateLimitMiddleware } from './middlewares/rate-limit.js';
import { errorMiddleware } from './middlewares/error.js';
import chatRoute from './routes/chat.js';
import usageRoute from './routes/usage.js';
import moderationsRoute from './routes/moderations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
// リクエスト毎の AbortSignal を用意し、クライアント切断時に上流 fetch を中断
app.use((req, res, next) => {
  const ac = new AbortController();
  // @ts-ignore 独自にプロパティを追加
  req.abortSignal = ac.signal;
  res.on('close', () => { try { ac.abort(); } catch (_) {} });
  next();
});
// 注意: SSE は圧縮されるとブラウザで逐次受信できないケースがあるため、
// /api/chat のみ圧縮を無効化する
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chat')) return next();
  return compression()(req, res, next);
});
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(sessionMiddleware());

// 静的ファイル（ルート直下と /src をそのまま配信）
app.use(express.static(ROOT));
app.use('/src', express.static(path.join(ROOT, 'src')));

// favicon の 404 を抑止（必要なら後で実ファイルに差し替え）
app.get('/favicon.ico', (_req, res) => res.status(204).end());

// API
app.post('/api/chat', rateLimitMiddleware(), chatRoute);
app.get('/api/usage', usageRoute);
app.post('/api/moderations', moderationsRoute);

app.use(errorMiddleware());

app.listen(PORT, () => {
  console.log(`[Lumora] listening on http://localhost:${PORT}`);
});


