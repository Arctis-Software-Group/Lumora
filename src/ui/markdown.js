// 非依存の軽量Markdownレンダラ（XSS対策: まずエスケープ → 置換）
// 対応: 見出し(+アンカー), 太字/斜体, 取り消し, コードブロック(```/~~~ + lang/meta), インラインコード(複数`対応),
//      箇条書き(記号/番号/タスク), 引用, リンク/自動リンク, 罫線, テーブル(アライン対応)

function escapeHtml(raw) {
  return String(raw)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Escape for attribute values (e.g., alt, data-*)
function escapeAttr(s) {
  return escapeHtml(String(s || '')).replaceAll('"', '&quot;');
}

function renderInline(alreadyEscaped) {
  // 注意: 入力は既に escapeHtml 済み
  let md = String(alreadyEscaped);
  // 画像 ![alt](url)
  md = md.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, (m, alt, url) => `<img src="${url}" alt="${escapeAttr(alt)}" loading="lazy" />`);
  // リンク [text](url)
  md = md.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, text, url) => `<a href="${url}" target="_blank" rel="noopener">${text}</a>`);
  // 強調 **text**, __text__（非貪欲）
  md = md.replace(/\*\*([^*]+?)\*\*|__([^_]+?)__/g, (m, a, b) => `<strong>${a || b}</strong>`);
  // 斜体 *text*, _text_（非貪欲, 太字と衝突回避）
  md = md.replace(/(?<!\*)\*(?!\*)([^*]+?)\*|(?<!_)_([^_]+?)_/g, (m, a, b) => `<em>${a || b}</em>`);
  // 取り消し線 ~~text~~
  md = md.replace(/~~([^~]+?)~~/g, (m, s) => `<del>${s}</del>`);
  // インラインコード: 可変長バッククォート対
  md = md.replace(/(`+)([^`]*?[^`])\1(?!`)/g, (m, ticks, code) => `<code>${code}</code>`);
  // 自動リンク（http/https）
  md = md.replace(/(^|\s)(https?:[^\s<]+)(?=$|\s)/g, (m, space, url) => `${space}<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
  // 自動リンク（www. から始まるURL）
  md = md.replace(/(^|\s)(www\.[^\s<)]+)(?=$|\s)/g, (m, space, url) => `${space}<a href="https://${url}" target="_blank" rel="noopener">${url}</a>`);
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
  const sanitizeLang = (s) => {
    const m = String(s || '').match(/[A-Za-z0-9+_.#-]+/);
    return m ? m[0] : '';
  };
  const parseFence = (line) => {
    const m = line.match(/^\s*(```|~~~)\s*([^\s]*)\s*(.*)$/);
    if (!m) return null;
    const fence = m[1];
    const lang = sanitizeLang(m[2]);
    const meta = (m[3] || '').trim();
    // title="..." の抽出（簡易）
    let title = '';
    const t = meta.match(/title\s*=\s*"([^"]+)"|title\s*=\s*'([^']+)'|title\s*=\s*([^\s]+)/i);
    if (t) title = t[1] || t[2] || t[3] || '';
    return { fence, lang, title };
  };
  while (i < lines.length) {
    let line = lines[i];
    // コードブロック ```lang, ~~~lang（インデント可）
    const fenceInfo = parseFence(line);
    if (fenceInfo) {
      closeLists();
      const { fence, lang, title } = fenceInfo;
      const buf = [];
      i++;
      while (i < lines.length && !new RegExp(`^\s*${fence}`).test(lines[i])) { buf.push(lines[i]); i++; }
      // 終了フェンスをスキップ
      if (i < lines.length && new RegExp(`^\s*${fence}`).test(lines[i])) i++;
      const code = escapeHtml(buf.join('\n'));
      const dataTitle = title ? ` data-title="${escapeAttr(title)}"` : '';
      const dataLang = lang ? ` data-lang="${lang}"` : '';
      out.push(`<pre${dataLang}${dataTitle}><code class="language-${lang}">${code}</code></pre>`);
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

    // テーブル: ヘッダ行 |...| + 区切り行 |-: :--: 等のアライン対応
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[:\-\s\|]+\|?\s*$/.test(lines[i + 1])) {
      closeLists();
      const header = line.trim();
      const divider = lines[i + 1].trim();
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(lines[i].trim()); i++; }
      const cells = (row) => row.replace(/^\|?|\|?$/g, '').split('|').map(c => c.trim());
      const aligns = cells(divider).map(s => {
        const left = /^:\-+\-*$/.test(s) || /^:-+$/.test(s);
        const right = /^\-+:\-*$/.test(s) || /^-+:$/.test(s);
        return left && right ? 'center' : right ? 'right' : left ? 'left' : '';
      });
      const ths = cells(header).map((h, idx) => `<th${aligns[idx] ? ` style=\"text-align:${aligns[idx]}\"` : ''}>${renderInline(escapeHtml(h))}</th>`).join('');
      const trs = rows.map(r => `<tr>${cells(r).map((c, idx) => `<td${aligns[idx] ? ` style=\"text-align:${aligns[idx]}\"` : ''}>${renderInline(escapeHtml(c))}</td>`).join('')}</tr>`).join('');
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
      out.push(`<h${level} id="${slug}">${body}<a class=\"md-anchor\" href=\"#${slug}\" aria-hidden=\"true\">#</a></h${level}>`);
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
