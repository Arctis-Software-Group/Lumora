export function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
}

export function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function pipeOpenAIStreamToSSE(openAiStream, res) {
  // Web Streams API か Node.js Readable の両対応
  if (openAiStream && typeof openAiStream.getReader === 'function') {
    const reader = openAiStream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (!l.startsWith('data:')) continue;
        const payload = l.slice(5).trim();
        if (payload === '[DONE]') {
          writeEvent(res, 'done', { ok: true });
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
          if (delta) writeEvent(res, 'chunk', delta);
        } catch (e) {
          writeEvent(res, 'chunk', payload);
        }
      }
    }
    writeEvent(res, 'done', { ok: true });
    return;
  }

  // Node.js ReadableStream (node-fetch 等)
  if (openAiStream && typeof openAiStream[Symbol.asyncIterator] === 'function') {
    const decoder = new TextDecoder('utf-8');
    let buf = '';
    for await (const chunk of openAiStream) {
      const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      buf += text;
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (!l.startsWith('data:')) continue;
        const payload = l.slice(5).trim();
        if (payload === '[DONE]') {
          writeEvent(res, 'done', { ok: true });
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content || json?.choices?.[0]?.message?.content || '';
          if (delta) writeEvent(res, 'chunk', delta);
        } catch (e) {
          writeEvent(res, 'chunk', payload);
        }
      }
    }
    writeEvent(res, 'done', { ok: true });
    return;
  }

  // 不明なストリーム型
  writeEvent(res, 'done', { ok: false });
}


