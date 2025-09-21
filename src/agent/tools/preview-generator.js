// Preview Generator Tool
export async function previewContent(params) {
  const { type, content, context } = params;
  
  let previewHtml = '<html><body><p>Preview not available</p></body></html>';
  
  if (content && content.html) {
    previewHtml = content.html;
  } else if (content && content.headers && content.rows) {
    // Generate table preview
    previewHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Noto Sans JP', sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>${content.headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${content.rows.map(row => 
                `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }
  
  const preview = {
    type: type,
    html: previewHtml,
    url: `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`,
    metadata: {
      type: 'preview',
      contentType: type,
      generated: new Date().toISOString()
    }
  };
  
  return {
    output: preview,
    metadata: { toolType: 'preview' },
    usage: { tokens: 10 }
  };
}