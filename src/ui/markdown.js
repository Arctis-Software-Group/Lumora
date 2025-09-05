// 非依存の軽量Markdownレンダラ（XSS対策: まずエスケープ → 置換）
// 対応: 見出し(+アンカー), 太字/斜体, コードブロック, インラインコード, 箇条書き(記号/番号/タスク), 引用, リンク/自動リンク, 罫線, テーブル(簡易)

function escapeHtml(raw) {
  return String(raw)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderInline(md) {
  // リンク [text](url)
  md = md.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  });
  // 強調 **text**, __text__
  md = md.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<strong>${escapeHtml(a || b)}</strong>`);
  // 斜体 *text*, _text_
  md = md.replace(/\*(?!\*)([^*]+)\*|_([^_]+)_/g, (m, a, b) => `<em>${escapeHtml(a || b)}</em>`);
  // インラインコード `code`
  md = md.replace(/`([^`]+)`/g, (m, code) => `<code>${escapeHtml(code)}</code>`);
  // 自動リンク（URL生文字）
  md = md.replace(/(^|\s)(https?:[^\s<]+)(?=$|\s)/g, (m, space, url) => `${space}<a href="${url}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`);
  return md;
}

export function renderMarkdown(input) {
  if (!input) return '';
  const src = String(input);
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  let ulOpen = false;
  let olOpen = false;
  const closeUl = () => { if (ulOpen) { out.push('</ul>'); ulOpen = false; } };
  const closeOl = () => { if (olOpen) { out.push('</ol>'); olOpen = false; } };
  const closeLists = () => { closeUl(); closeOl(); };
  while (i < lines.length) {
    let line = lines[i];
    // コードブロック ```lang
    if (/^```/.test(line)) {
      closeLists();
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      // 終了```をスキップ
      if (i < lines.length && /^```/.test(lines[i])) i++;
      const code = escapeHtml(buf.join('\n'));
      out.push(`<pre><code class="language-${lang}">${code}</code></pre>`);
      continue;
    }

    // 引用 >
    if (/^>\s?/.test(line)) {
      closeLists();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      const html = renderInline(escapeHtml(buf.join('\n'))).replaceAll('\n', '<br/>');
      out.push(`<blockquote>${html}</blockquote>`);
      continue;
    }

    // 水平線 --- *** ___
    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) { closeLists(); out.push('<hr/>'); i++; continue; }

    // テーブル（簡易）: ヘッダ行 |...| + 区切り行 |-...-|
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[:\-\s\|]+\|?\s*$/.test(lines[i + 1])) {
      closeLists();
      const header = line.trim();
      const divider = lines[i + 1];
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(lines[i].trim()); i++; }
      const cells = (row) => row.replace(/^\|?|\|?$/g, '').split('|').map(c => c.trim());
      const ths = cells(header).map(h => `<th>${renderInline(escapeHtml(h))}</th>`).join('');
      const trs = rows.map(r => `<tr>${cells(r).map(c => `<td>${renderInline(escapeHtml(c))}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`);
      continue;
    }

    // 番号付きリスト 1. text
    if (/^\s*\d+\.\s+/.test(line)) {
      closeUl(); if (!olOpen) { out.push('<ol>'); olOpen = true; }
      const item = line.replace(/^\s*\d+\.\s+/, '');
      out.push(`<li>${renderInline(escapeHtml(item))}</li>`);
      i++; continue;
    }

    // 箇条書き - / * / + （タスクリスト対応）
    if (/^\s*[-*+]\s+/.test(line)) {
      closeOl(); if (!ulOpen) { out.push('<ul>'); ulOpen = true; }
      const rawItem = line.replace(/^\s*[-*+]\s+/, '');
      const m = rawItem.match(/^\[( |x|X)\]\s+(.*)$/);
      if (m) {
        const checked = m[1].toLowerCase() === 'x';
        out.push(`<li><input type="checkbox" disabled ${checked ? 'checked' : ''}/> ${renderInline(escapeHtml(m[2]))}</li>`);
      } else {
        out.push(`<li>${renderInline(escapeHtml(rawItem))}</li>`);
      }
      i++;
      continue;
    }

    // 見出し # ～ ######
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      closeLists();
      const level = h[1].length;
      const text = h[2];
      const slug = text.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf\-\s]/g, '').trim().replace(/\s+/g, '-');
      const body = renderInline(escapeHtml(text));
      out.push(`<h${level} id="${slug}">${body}</h${level}>`);
      i++;
      continue;
    }

    // 空行は段落区切り
    if (!line.trim()) { closeLists(); out.push(''); i++; continue; }

    // 段落
    closeLists();
    const para = [];
    while (i < lines.length && lines[i].trim()) { para.push(lines[i]); i++; }
    const html = renderInline(escapeHtml(para.join(' ')));
    out.push(`<p>${html}</p>`);
  }
  closeLists();
  return out.join('\n');
}


