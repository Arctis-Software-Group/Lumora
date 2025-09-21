// Spreadsheet Generator Tool
export async function generateSpreadsheet(params) {
  const { step, task, context } = params;
  
  const content = {
    headers: ['項目', '値', '備考'],
    rows: [
      ['データ1', '100', 'サンプルデータ'],
      ['データ2', '200', 'サンプルデータ'],
      ['データ3', '300', 'サンプルデータ']
    ],
    html: `<table><thead><tr><th>項目</th><th>値</th><th>備考</th></tr></thead><tbody><tr><td>データ1</td><td>100</td><td>サンプルデータ</td></tr></tbody></table>`,
    metadata: { type: 'spreadsheet', format: 'html', generated: new Date().toISOString() }
  };
  
  return { output: content, metadata: { toolType: 'generation' }, usage: { tokens: 80 } };
}