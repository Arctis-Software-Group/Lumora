// Lumora Agent Tool Router
// ツール呼び出しディスパッチャ

// Import tool implementations
import { generateDocument } from './tools/document-generator.js';
import { generatePresentation } from './tools/presentation-generator.js';
import { generateSpreadsheet } from './tools/spreadsheet-generator.js';
import { generateWebsite } from './tools/website-generator.js';
import { generateCode } from './tools/code-generator.js';
import { previewContent } from './tools/preview-generator.js';
import { executeJavaScript } from './tools/js-executor.js';
import { convertToPDF } from './tools/format-converter.js';

// Tool registry mapping tool names to their implementations
const TOOL_REGISTRY = {
  // Analysis tools
  'analyze_requirements': analyzeRequirements,
  'extract_keywords': extractKeywords,
  
  // Planning tools
  'create_outline': createOutline,
  'create_presentation_structure': createPresentationStructure,
  'create_wireframe': createWireframe,
  'design_data_structure': designDataStructure,
  'design_architecture': designArchitecture,
  
  // Generation tools
  'generate_doc': generateDocument,
  'generate_ppt': generatePresentation,
  'generate_sheet': generateSpreadsheet,
  'generate_website_content': generateWebsite,
  'generate_code': generateCode,
  
  // Formatting tools
  'format_document': formatDocument,
  'format_table': formatTable,
  'style_slides': styleSlides,
  'apply_website_styling': applyWebsiteStyling,
  'make_responsive': makeResponsive,
  
  // Preview tools
  'preview_html': previewHTML,
  'preview_slides': previewSlides,
  'preview_table': previewTable,
  'preview_website': previewWebsite,
  'preview_code': previewCode,
  
  // Execution tools
  'run_js': executeJavaScript,
  
  // Conversion tools
  'generate_pdf': convertToPDF,
  'download_bundle': createDownloadBundle,
  
  // General tools
  'process_general_task': processGeneralTask,
  'generate_output': generateOutput
};

export async function routeToolCall(toolName, parameters) {
  console.log(`🛠 Routing tool call: ${toolName}`);
  
  if (!TOOL_REGISTRY[toolName]) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  try {
    const result = await TOOL_REGISTRY[toolName](parameters);
    return {
      success: true,
      output: result.output,
      metadata: result.metadata || {},
      usage: result.usage || {},
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error(`Tool execution failed: ${toolName}`, error);
    throw new Error(`Tool ${toolName} failed: ${error.message}`);
  }
}

// Tool implementations

// Analysis Tools
async function analyzeRequirements(params) {
  const { step, task, context } = params;
  
  const analysis = {
    userInput: context.userInput,
    taskType: context.taskType,
    complexity: determineComplexity(context.userInput),
    requirements: extractRequirements(context.userInput),
    targetAudience: identifyAudience(context.userInput),
    tone: determineTone(context.userInput)
  };
  
  return {
    output: analysis,
    metadata: { toolType: 'analysis' },
    usage: { tokens: estimateTokenUsage(context.userInput) }
  };
}

async function extractKeywords(params) {
  const { context } = params;
  const input = context.userInput;
  
  // Simple keyword extraction
  const commonWords = ['の', 'を', 'が', 'に', 'と', 'で', 'は', 'も', 'から', 'まで', 'について', 'する', 'した', 'して'];
  const keywords = input.split(/\s+/)
    .filter(word => word.length > 1 && !commonWords.includes(word))
    .slice(0, 10);
  
  return {
    output: { keywords },
    metadata: { toolType: 'analysis' },
    usage: { tokens: 10 }
  };
}

// Planning Tools
async function createOutline(params) {
  const { context } = params;
  
  const outline = {
    title: generateTitle(context.userInput),
    sections: [
      { id: 'intro', title: '概要', description: '導入と背景' },
      { id: 'main', title: '本文', description: 'メインコンテンツ' },
      { id: 'conclusion', title: 'まとめ', description: '結論と次のステップ' }
    ],
    metadata: {
      estimatedLength: 'medium',
      targetAudience: context.targetAudience || 'general'
    }
  };
  
  return {
    output: outline,
    metadata: { toolType: 'planning' },
    usage: { tokens: 50 }
  };
}

async function createPresentationStructure(params) {
  const { context } = params;
  
  const structure = {
    title: generateTitle(context.userInput),
    slides: [
      { id: 1, type: 'title', title: 'タイトルスライド', content: 'プレゼンテーションタイトル' },
      { id: 2, type: 'agenda', title: 'アジェンダ', content: '今日お話しする内容' },
      { id: 3, type: 'content', title: 'メインコンテンツ', content: '主要な内容' },
      { id: 4, type: 'conclusion', title: 'まとめ', content: '結論と次のアクション' }
    ],
    design: {
      theme: 'professional',
      colors: ['#2563eb', '#1e40af', '#f8fafc'],
      fonts: ['Noto Sans JP', 'sans-serif']
    }
  };
  
  return {
    output: structure,
    metadata: { toolType: 'planning' },
    usage: { tokens: 75 }
  };
}

async function createWireframe(params) {
  const { context } = params;
  
  const wireframe = {
    title: generateTitle(context.userInput),
    layout: 'single-page',
    sections: [
      { id: 'header', type: 'navigation', content: 'ナビゲーションヘッダー' },
      { id: 'hero', type: 'hero', content: 'メインビジュアルとキャッチコピー' },
      { id: 'features', type: 'content', content: '特徴やサービス内容' },
      { id: 'contact', type: 'form', content: 'お問い合わせフォーム' },
      { id: 'footer', type: 'footer', content: 'フッター情報' }
    ],
    responsive: true,
    accessibility: true
  };
  
  return {
    output: wireframe,
    metadata: { toolType: 'planning' },
    usage: { tokens: 60 }
  };
}

async function designDataStructure(params) {
  const { context } = params;
  
  const structure = {
    name: 'data_table',
    columns: [
      { name: 'ID', type: 'number', description: '識別子' },
      { name: '項目名', type: 'text', description: 'アイテム名' },
      { name: '値', type: 'number', description: '数値データ' },
      { name: '日付', type: 'date', description: '関連日付' },
      { name: '備考', type: 'text', description: '追加情報' }
    ],
    indexes: ['ID'],
    validation: {
      required: ['ID', '項目名'],
      unique: ['ID']
    }
  };
  
  return {
    output: structure,
    metadata: { toolType: 'planning' },
    usage: { tokens: 40 }
  };
}

async function designArchitecture(params) {
  const { context } = params;
  
  const architecture = {
    type: 'web-application',
    components: [
      { name: 'Frontend', technology: 'HTML/CSS/JavaScript', description: 'ユーザーインターフェース' },
      { name: 'Logic', technology: 'JavaScript', description: 'ビジネスロジック' },
      { name: 'Data', technology: 'LocalStorage/JSON', description: 'データ管理' }
    ],
    structure: {
      files: ['index.html', 'style.css', 'script.js'],
      folders: ['assets', 'components']
    }
  };
  
  return {
    output: architecture,
    metadata: { toolType: 'planning' },
    usage: { tokens: 80 }
  };
}

// Formatting Tools
async function formatDocument(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs.generate_doc || {};
  
  const formatted = {
    html: generateDocumentHTML(content),
    css: generateDocumentCSS(),
    metadata: {
      format: 'html',
      responsive: true,
      printFriendly: true
    }
  };
  
  return {
    output: formatted,
    metadata: { toolType: 'formatting' },
    usage: { tokens: 30 }
  };
}

async function formatTable(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs.generate_sheet || {};
  
  const formatted = {
    html: generateTableHTML(content),
    css: generateTableCSS(),
    metadata: {
      format: 'html_table',
      sortable: true,
      filterable: true
    }
  };
  
  return {
    output: formatted,
    metadata: { toolType: 'formatting' },
    usage: { tokens: 25 }
  };
}

async function styleSlides(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs.generate_ppt || {};
  
  const styled = {
    html: generateSlidesHTML(content),
    css: generateSlidesCSS(),
    js: generateSlidesJS(),
    metadata: {
      format: 'html_slides',
      navigation: true,
      transitions: true
    }
  };
  
  return {
    output: styled,
    metadata: { toolType: 'formatting' },
    usage: { tokens: 40 }
  };
}

async function applyWebsiteStyling(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs.generate_website_content || {};
  
  const styled = {
    html: generateWebsiteHTML(content),
    css: generateWebsiteCSS(),
    metadata: {
      format: 'html_website',
      responsive: true,
      modern: true
    }
  };
  
  return {
    output: styled,
    metadata: { toolType: 'formatting' },
    usage: { tokens: 45 }
  };
}

async function makeResponsive(params) {
  const { step, task, context } = params;
  
  const responsive = {
    css: generateResponsiveCSS(),
    breakpoints: {
      mobile: '480px',
      tablet: '768px',
      desktop: '1024px'
    },
    metadata: {
      mobileFirst: true,
      flexbox: true,
      grid: true
    }
  };
  
  return {
    output: responsive,
    metadata: { toolType: 'formatting' },
    usage: { tokens: 35 }
  };
}

// Preview Tools
async function previewHTML(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  return previewContent({
    type: 'html',
    content: content,
    context: context
  });
}

async function previewSlides(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  return previewContent({
    type: 'slides',
    content: content,
    context: context
  });
}

async function previewTable(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  return previewContent({
    type: 'table',
    content: content,
    context: context
  });
}

async function previewWebsite(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  return previewContent({
    type: 'website',
    content: content,
    context: context
  });
}

async function previewCode(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  return previewContent({
    type: 'code',
    content: content,
    context: context
  });
}

// Conversion Tools
async function createDownloadBundle(params) {
  const { step, task, context } = params;
  const content = context.previousOutputs;
  
  const bundle = {
    files: [],
    format: 'zip',
    metadata: {
      created: new Date().toISOString(),
      taskId: task.id
    }
  };
  
  // Add files based on generated content
  Object.entries(content).forEach(([key, value]) => {
    if (value && value.html) {
      bundle.files.push({
        name: `${key}.html`,
        content: value.html,
        type: 'text/html'
      });
    }
    if (value && value.css) {
      bundle.files.push({
        name: `${key}.css`,
        content: value.css,
        type: 'text/css'
      });
    }
    if (value && value.js) {
      bundle.files.push({
        name: `${key}.js`,
        content: value.js,
        type: 'text/javascript'
      });
    }
  });
  
  return {
    output: bundle,
    metadata: { toolType: 'conversion' },
    usage: { tokens: 10 }
  };
}

// General Tools
async function processGeneralTask(params) {
  const { step, task, context } = params;
  
  const result = {
    processed: true,
    input: context.userInput,
    output: `Task processed: ${context.userInput}`,
    metadata: {
      taskType: context.taskType,
      timestamp: new Date().toISOString()
    }
  };
  
  return {
    output: result,
    metadata: { toolType: 'general' },
    usage: { tokens: 20 }
  };
}

async function generateOutput(params) {
  const { step, task, context } = params;
  
  const output = {
    summary: generateSummary(task),
    files: generateFileList(context.previousOutputs),
    recommendations: [
      { icon: '💾', text: 'ファイルをダウンロード', action: 'download' },
      { icon: '🔄', text: '修正を加える', action: 'modify' },
      { icon: '📤', text: '共有する', action: 'share' }
    ]
  };
  
  return {
    output: output,
    metadata: { toolType: 'output' },
    usage: { tokens: 15 }
  };
}

// Helper Functions
function generateTitle(input) {
  const words = input.split(' ').slice(0, 6);
  return words.join(' ') + (input.split(' ').length > 6 ? '...' : '');
}

function determineComplexity(input) {
  if (input.length < 50) return 'low';
  if (input.length > 200) return 'high';
  return 'medium';
}

function extractRequirements(input) {
  const requirements = [];
  if (input.includes('画像')) requirements.push('images');
  if (input.includes('表')) requirements.push('tables');
  if (input.includes('グラフ')) requirements.push('charts');
  if (input.includes('リンク')) requirements.push('links');
  return requirements;
}

function identifyAudience(input) {
  if (input.includes('初心者')) return 'beginner';
  if (input.includes('専門家')) return 'expert';
  if (input.includes('ビジネス')) return 'business';
  return 'general';
}

function determineTone(input) {
  if (input.includes('フォーマル')) return 'formal';
  if (input.includes('カジュアル')) return 'casual';
  if (input.includes('プロフェッショナル')) return 'professional';
  return 'neutral';
}

function estimateTokenUsage(text) {
  // Rough estimation: 1 token ≈ 4 characters for Japanese
  return Math.ceil(text.length / 4);
}

function generateSummary(task) {
  return `タスク「${task.title}」が完了しました。`;
}

function generateFileList(outputs) {
  const files = [];
  Object.entries(outputs).forEach(([key, value]) => {
    if (value && value.html) {
      files.push({ name: `${key}.html`, type: 'HTML', size: value.html.length });
    }
    if (value && value.css) {
      files.push({ name: `${key}.css`, type: 'CSS', size: value.css.length });
    }
  });
  return files;
}

// HTML/CSS Generators (simplified)
function generateDocumentHTML(content) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Document'}</title>
  <link rel="stylesheet" href="document.css">
</head>
<body>
  <article class="document">
    <header>
      <h1>${content.title || 'ドキュメントタイトル'}</h1>
    </header>
    <main>
      ${(content.sections || []).map(section => `
        <section>
          <h2>${section.heading}</h2>
          <p>${section.content}</p>
        </section>
      `).join('')}
    </main>
  </article>
</body>
</html>`;
}

function generateDocumentCSS() {
  return `
.document {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Noto Sans JP', sans-serif;
  line-height: 1.6;
  color: #333;
}

.document header {
  margin-bottom: 40px;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 20px;
}

.document h1 {
  color: #2563eb;
  font-size: 2.5rem;
  margin: 0;
}

.document section {
  margin-bottom: 30px;
}

.document h2 {
  color: #1e40af;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.document p {
  margin-bottom: 15px;
}

@media (max-width: 768px) {
  .document {
    padding: 20px 15px;
  }
  
  .document h1 {
    font-size: 2rem;
  }
}
`;
}

function generateTableHTML(content) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Data Table</title>
  <link rel="stylesheet" href="table.css">
</head>
<body>
  <div class="table-container">
    <table class="data-table">
      <thead>
        <tr>
          ${(content.headers || []).map(header => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${(content.rows || []).map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function generateTableCSS() {
  return `
.table-container {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  background: #2563eb;
  color: white;
  font-weight: 600;
}

.data-table tr:hover {
  background: #f8fafc;
}

@media (max-width: 768px) {
  .table-container {
    padding: 10px;
  }
  
  .data-table th,
  .data-table td {
    padding: 8px 10px;
    font-size: 14px;
  }
}
`;
}

function generateSlidesHTML(content) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Presentation'}</title>
  <link rel="stylesheet" href="slides.css">
</head>
<body>
  <div class="presentation">
    <div class="slides">
      ${(content.slides || []).map((slide, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
          <div class="slide-content">
            <h1>${slide.title}</h1>
            <div class="slide-body">
              <p>${slide.content}</p>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="controls">
      <button class="prev-btn">前へ</button>
      <span class="slide-counter">1 / ${(content.slides || []).length}</span>
      <button class="next-btn">次へ</button>
    </div>
  </div>
  <script src="slides.js"></script>
</body>
</html>`;
}

function generateSlidesCSS() {
  return `
.presentation {
  width: 100vw;
  height: 100vh;
  background: #1e40af;
  display: flex;
  flex-direction: column;
  font-family: 'Noto Sans JP', sans-serif;
}

.slides {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.5s ease;
  background: linear-gradient(135deg, #2563eb, #1e40af);
  color: white;
}

.slide.active {
  opacity: 1;
}

.slide-content {
  text-align: center;
  max-width: 800px;
  padding: 40px;
}

.slide h1 {
  font-size: 3rem;
  margin-bottom: 30px;
  font-weight: 700;
}

.slide-body {
  font-size: 1.5rem;
  line-height: 1.6;
}

.controls {
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  color: white;
}

.controls button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.controls button:hover {
  background: #1e40af;
}

.slide-counter {
  font-size: 18px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .slide h1 {
    font-size: 2rem;
  }
  
  .slide-body {
    font-size: 1.2rem;
  }
  
  .slide-content {
    padding: 20px;
  }
}
`;
}

function generateSlidesJS() {
  return `
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
const counter = document.querySelector('.slide-counter');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

function showSlide(n) {
  slides.forEach(slide => slide.classList.remove('active'));
  slides[n].classList.add('active');
  counter.textContent = \`\${n + 1} / \${totalSlides}\`;
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % totalSlides;
  showSlide(currentSlide);
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  showSlide(currentSlide);
}

nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    nextSlide();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevSlide();
  }
});
`;
}

function generateWebsiteHTML(content) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.title || 'Website'}</title>
  <link rel="stylesheet" href="website.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <nav class="navbar">
        <h1 class="logo">${content.title || 'ブランド名'}</h1>
        <ul class="nav-menu">
          <li><a href="#home">ホーム</a></li>
          <li><a href="#about">概要</a></li>
          <li><a href="#services">サービス</a></li>
          <li><a href="#contact">お問い合わせ</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero" id="home">
      <div class="container">
        <div class="hero-content">
          <h1>${content.sections?.hero?.title || 'メインタイトル'}</h1>
          <p>${content.sections?.hero?.subtitle || 'サブタイトルやキャッチコピー'}</p>
          <button class="cta-button">詳細を見る</button>
        </div>
      </div>
    </section>

    <section class="features" id="services">
      <div class="container">
        <h2>特徴・サービス</h2>
        <div class="features-grid">
          ${(content.sections?.features || []).map(feature => `
            <div class="feature-card">
              <h3>${feature.title}</h3>
              <p>${feature.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2024 ${content.title || 'Company Name'}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}

function generateWebsiteCSS() {
  return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.site-header {
  background: #2563eb;
  color: white;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-menu a {
  color: white;
  text-decoration: none;
  transition: opacity 0.3s;
}

.nav-menu a:hover {
  opacity: 0.8;
}

main {
  margin-top: 80px;
}

.hero {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  color: white;
  padding: 100px 0;
  text-align: center;
}

.hero-content h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

.hero-content p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  background: white;
  color: #2563eb;
  padding: 15px 30px;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s;
}

.cta-button:hover {
  transform: translateY(-2px);
}

.features {
  padding: 80px 0;
  background: #f8fafc;
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 3rem;
  color: #2563eb;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #2563eb;
}

.site-footer {
  background: #1e40af;
  color: white;
  padding: 2rem 0;
  text-align: center;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-menu {
    gap: 1rem;
  }
  
  .hero-content h1 {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  main {
    margin-top: 120px;
  }
}
`;
}

function generateResponsiveCSS() {
  return `
/* Mobile First Responsive CSS */
@media (max-width: 480px) {
  .container {
    padding: 0 15px;
  }
  
  body {
    font-size: 14px;
  }
  
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.3rem; }
  h3 { font-size: 1.1rem; }
}

@media (min-width: 481px) and (max-width: 768px) {
  .container {
    padding: 0 20px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .container {
    max-width: 960px;
  }
}

@media (min-width: 1025px) {
  .container {
    max-width: 1200px;
  }
}

/* Responsive Grid */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

/* Responsive Text */
.responsive-text {
  font-size: clamp(0.9rem, 2.5vw, 1.2rem);
}

/* Hide/Show for different screen sizes */
.mobile-only { display: block; }
.desktop-only { display: none; }

@media (min-width: 769px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
}
`;
}