// サーバのSSEと接続。失敗時はモックにフォールバック
export function sendMessageStream({ model, messages, reasoning, plugins, onChunk, onDone, onError, onRouted }) {
  const controller = new AbortController();
  const uiPlan = (window.__plan || localStorage.getItem('lumora_plan') || 'guest').toLowerCase();
  // 新プラン(Free/Go/Pro/Max/Ultra) -> 旧プラン(guest/plus/pro/pro+) へマッピング（当面の互換）
  const plan = (function mapPlan(p) {
    if (p === 'auto') return 'guest';
    if (p === 'free') return 'guest';
    if (p === 'go') return 'plus';
    if (p === 'pro') return 'pro';
    if (p === 'max') return 'pro+';
    if (p === 'ultra') return 'pro+';
    return p; // 既存キーはそのまま
  })(uiPlan);
  fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-plan': plan
    },
    body: JSON.stringify({ model, messages, reasoning, plugins }),
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok) {
        let message = 'HTTP ' + res.status;
        try {
          const j = await res.json();
          message = j?.error?.message || message;
        } catch (_) {}
        throw new Error(message);
      }
      // ブラウザ環境でストリーミングが無効、または非SSEレスポンスの場合のガード
      if (!res.body || typeof res.body.getReader !== 'function') {
        const text = await res.text().catch(() => '');
        throw new Error('Non-streaming response from server' + (text ? `: ${text.slice(0, 180)}` : ''));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() || '';
        for (const c of chunks) {
          const lines = c.split('\n');
          const evt = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
          const data = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
          if (!evt) continue;
          if (evt === 'routed' && data) {
            try { onRouted?.(JSON.parse(data)); } catch (_) {}
          }
          if (evt === 'chunk' && data) onChunk?.(safeData(data));
          if (evt === 'done') onDone?.({ ok: true });
        }
      }
    })
    .catch((err) => {
      console.warn('[SSE Error]', err);
      onError?.(err);
    });
  return () => controller.abort();
}

function generateReply(model, prompt) {
  const header = `【${model}】\n`;
  const body = synthesize(prompt);
  const footer = `\n\n— Lumora\n`;
  return header + body + footer;
}

function synthesize(text) {
  if (!text) return 'こんにちは。ご質問をどうぞ。';
  const lower = text.toLowerCase();
  if (/hello|hi|こんにちは/.test(lower)) return 'こんにちは！私は Lumora。お手伝いできることがあれば何でも聞いてください。';
  if (/自己紹介|自己PR/.test(text)) return '短い自己紹介の例:\n私はWebエンジニアとしてUI/UXと高速な実装を得意としています。シンプルで保守しやすい設計を心がけ、ユーザー価値を最短で届けることを大切にしています。';
  if (/メール|例文/.test(text)) return '件名: 面接のお礼\n\n本日は貴重なお時間をいただき、ありがとうございました。お話を伺い、業務内容への理解が深まりました。引き続きご検討のほど、よろしくお願いいたします。';
  if (/sort|ソート|並べ替え|配列/.test(lower)) return 'JavaScript で配列をソートするには: `array.sort((a, b) => a - b)`。文字列の場合は `localeCompare` を使うと日本語も安定します。';
  return '要点を3つにまとめます:\n1) ' + shorten(text, 48) + ' の目的・前提を明確化\n2) 成果物の要件を箇条書き化\n3) 実装・検証の順序を決めて着手  — 必要ならサンプルコードも提示します。';
}

function shorten(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
// エスケープはUIのMarkdownレンダラ側で行うため、ここでは生文字列を返す

function safeData(data) {
  try {
    // サーバからは文字列chunkが来る
    const parsed = JSON.parse(data);
    if (typeof parsed === 'string') return parsed;
  } catch (_) {
    // もともと文字列
  }
  return String(data);
}

// テンプレ返信のフォールバックは本番では無効化
