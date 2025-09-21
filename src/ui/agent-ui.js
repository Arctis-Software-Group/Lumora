// Lumora Agent UI Controller
// Agent用UIの全体制御を担当

export function setupAgentUI(agent) {
  console.log('🎨 Setting up Agent UI...');
  
  // Initialize preview system
  setupPreviewSystem(agent);
  
  // Initialize export system
  setupExportSystem(agent);
  
  // Initialize cost monitoring
  setupCostMonitoring(agent);
  
  // Initialize time monitoring
  setupTimeMonitoring(agent);
  
  // Initialize responsive behavior
  setupResponsiveLayout();
  
  console.log('✅ Agent UI setup complete');
}

function setupPreviewSystem(agent) {
  const previewTabs = document.querySelectorAll('.preview-tab');
  const previewFrame = document.getElementById('previewFrame');
  
  if (!previewFrame) return;
  
  // Handle tab switching
  previewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabType = tab.dataset.tab;
      switchPreviewTab(tabType);
    });
  });
  
  function switchPreviewTab(tabType) {
    // Update active tab
    previewTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabType);
    });
    
    // Show appropriate content
    const content = agent.state.currentTask?.outputs[tabType];
    if (content) {
      renderPreviewContent(tabType, content);
    } else {
      showPreviewPlaceholder(tabType);
    }
  }
  
  function renderPreviewContent(type, content) {
    switch (type) {
      case 'document':
        renderDocumentPreview(content);
        break;
      case 'slide':
        renderSlidePreview(content);
        break;
      case 'sheet':
        renderSheetPreview(content);
        break;
      case 'code':
        renderCodePreview(content);
        break;
      default:
        showPreviewPlaceholder(type);
    }
  }
  
  function renderDocumentPreview(content) {
    if (content.html) {
      previewFrame.innerHTML = `
        <iframe 
          srcdoc="${escapeHtml(content.html)}" 
          style="width: 100%; height: 100%; border: none; border-radius: 6px;"
          sandbox="allow-same-origin allow-scripts">
        </iframe>
      `;
    } else {
      previewFrame.innerHTML = `
        <div class="preview-text">
          <h3>${content.title || 'Document'}</h3>
          ${content.sections ? content.sections.map(section => `
            <div class="section">
              <h4>${section.heading}</h4>
              <p>${section.content}</p>
            </div>
          `).join('') : '<p>No content available</p>'}
        </div>
      `;
    }
  }
  
  function renderSlidePreview(content) {
    if (content.html) {
      previewFrame.innerHTML = `
        <iframe 
          srcdoc="${escapeHtml(content.html)}" 
          style="width: 100%; height: 100%; border: none; border-radius: 6px;"
          sandbox="allow-same-origin allow-scripts">
        </iframe>
      `;
    } else {
      previewFrame.innerHTML = `
        <div class="slide-preview">
          <h3>${content.title || 'Presentation'}</h3>
          <div class="slides-list">
            ${content.slides ? content.slides.map((slide, index) => `
              <div class="slide-thumbnail">
                <div class="slide-number">${index + 1}</div>
                <div class="slide-title">${slide.title}</div>
                <div class="slide-content">${slide.content.substring(0, 100)}...</div>
              </div>
            `).join('') : '<p>No slides available</p>'}
          </div>
        </div>
      `;
    }
  }
  
  function renderSheetPreview(content) {
    if (content.html) {
      previewFrame.innerHTML = `
        <iframe 
          srcdoc="${escapeHtml(content.html)}" 
          style="width: 100%; height: 100%; border: none; border-radius: 6px;"
          sandbox="allow-same-origin allow-scripts">
        </iframe>
      `;
    } else {
      previewFrame.innerHTML = `
        <div class="sheet-preview">
          <table class="preview-table">
            <thead>
              <tr>
                ${content.headers ? content.headers.map(header => `<th>${header}</th>`).join('') : ''}
              </tr>
            </thead>
            <tbody>
              ${content.rows ? content.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('') : '<tr><td colspan="100%">No data available</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }
  }
  
  function renderCodePreview(content) {
    previewFrame.innerHTML = `
      <div class="code-preview">
        <div class="code-header">
          <h4>${content.language || 'Code'}</h4>
        </div>
        <div class="code-files">
          ${content.files ? content.files.map(file => `
            <div class="code-file">
              <div class="file-header">
                <span class="file-name">${file.name}</span>
              </div>
              <pre class="code-content"><code>${escapeHtml(file.content)}</code></pre>
            </div>
          `).join('') : '<p>No code files available</p>'}
        </div>
      </div>
    `;
  }
  
  function showPreviewPlaceholder(type) {
    const icons = {
      document: '📄',
      slide: '🎞',
      sheet: '📊',
      code: '💻'
    };
    
    const messages = {
      document: 'ドキュメントがここに表示されます',
      slide: 'スライドがここに表示されます', 
      sheet: 'スプレッドシートがここに表示されます',
      code: 'コードがここに表示されます'
    };
    
    previewFrame.innerHTML = `
      <div class="preview-placeholder">
        <span class="placeholder-icon">${icons[type] || '📄'}</span>
        <p>${messages[type] || 'ここにプレビューが表示されます'}</p>
      </div>
    `;
  }
  
  function escapeHtml(html) {
    return html.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

function setupExportSystem(agent) {
  const exportBtn = document.getElementById('exportBtn');
  const exportOptions = document.getElementById('exportOptions');
  const exportOptionBtns = document.querySelectorAll('.export-option');
  
  if (!exportBtn) return;
  
  // Toggle export options
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (exportOptions) {
      const isVisible = exportOptions.style.display === 'block';
      exportOptions.style.display = isVisible ? 'none' : 'block';
    }
  });
  
  // Hide options when clicking outside
  document.addEventListener('click', () => {
    if (exportOptions) {
      exportOptions.style.display = 'none';
    }
  });
  
  // Handle export options
  exportOptionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = btn.dataset.format;
      handleExport(format, agent);
      if (exportOptions) {
        exportOptions.style.display = 'none';
      }
    });
  });
  
  // Update export button state
  agent.updateExportButton = function() {
    const hasContent = agent.state.currentTask && 
                      Object.keys(agent.state.currentTask.outputs || {}).length > 0;
    
    if (exportBtn) {
      exportBtn.disabled = !hasContent;
    }
  };
}

function handleExport(format, agent) {
  if (!agent.state.currentTask || !agent.state.currentTask.outputs) {
    showToast('エクスポートできるコンテンツがありません', 'warning');
    return;
  }
  
  const outputs = agent.state.currentTask.outputs;
  const taskTitle = agent.state.currentTask.title || 'output';
  
  switch (format) {
    case 'html':
      exportHTML(outputs, taskTitle);
      break;
    case 'pdf':
      exportPDF(outputs, taskTitle);
      break;
    case 'docx':
      exportDOCX(outputs, taskTitle);
      break;
    case 'pptx':
      exportPPTX(outputs, taskTitle);
      break;
    case 'csv':
      exportCSV(outputs, taskTitle);
      break;
    default:
      showToast(`${format}形式のエクスポートは未対応です`, 'warning');
  }
}

function exportHTML(outputs, title) {
  const htmlContent = findHTMLContent(outputs);
  if (!htmlContent) {
    showToast('HTMLコンテンツが見つかりません', 'warning');
    return;
  }
  
  downloadFile(htmlContent, `${title}.html`, 'text/html');
  showToast('HTMLファイルをダウンロードしました', 'success');
}

function exportPDF(outputs, title) {
  // For PDF export, we'd typically use a service or library
  // For now, show a placeholder message
  showToast('PDF生成機能は開発中です', 'info');
}

function exportDOCX(outputs, title) {
  // For DOCX export, we'd typically use a library
  showToast('DOCX生成機能は開発中です', 'info');
}

function exportPPTX(outputs, title) {
  // For PPTX export, we'd typically use a library
  showToast('PPTX生成機能は開発中です', 'info');
}

function exportCSV(outputs, title) {
  const csvContent = findCSVContent(outputs);
  if (!csvContent) {
    showToast('CSVデータが見つかりません', 'warning');
    return;
  }
  
  downloadFile(csvContent, `${title}.csv`, 'text/csv');
  showToast('CSVファイルをダウンロードしました', 'success');
}

function findHTMLContent(outputs) {
  for (const [key, output] of Object.entries(outputs)) {
    if (output && output.html) {
      return output.html;
    }
  }
  return null;
}

function findCSVContent(outputs) {
  for (const [key, output] of Object.entries(outputs)) {
    if (output && output.headers && output.rows) {
      // Convert to CSV format
      const headers = output.headers.join(',');
      const rows = output.rows.map(row => row.join(',')).join('\n');
      return headers + '\n' + rows;
    }
  }
  return null;
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function setupCostMonitoring(agent) {
  const costValue = document.getElementById('costValue');
  const costIndicator = document.getElementById('costIndicator');
  
  if (!costValue) return;
  
  // Update cost display
  agent.updateCostDisplay = function() {
    const currentCost = agent.state.costs.current;
    const limit = agent.state.costs.limit;
    const percentage = (currentCost / limit) * 100;
    
    costValue.textContent = currentCost.toFixed(3);
    
    // Update indicator color based on usage
    if (costIndicator) {
      costIndicator.classList.remove('cost-ok', 'cost-warning', 'cost-danger');
      
      if (percentage < 50) {
        costIndicator.classList.add('cost-ok');
      } else if (percentage < 80) {
        costIndicator.classList.add('cost-warning');
      } else {
        costIndicator.classList.add('cost-danger');
      }
    }
    
    // Show warning if approaching limit
    if (percentage > 80 && !agent._costWarningShown) {
      showToast(`コスト使用率が${percentage.toFixed(1)}%に達しました`, 'warning');
      agent._costWarningShown = true;
    }
  };
  
  // Reset warning flag when cost resets
  agent.resetCostWarning = function() {
    agent._costWarningShown = false;
  };
}

function setupTimeMonitoring(agent) {
  const timeRemaining = document.getElementById('timeRemaining');
  
  if (!timeRemaining) return;
  
  agent.updateTimeDisplay = function() {
    if (!agent.startTime) {
      timeRemaining.textContent = '60';
      return;
    }
    
    const elapsed = Date.now() - agent.startTime;
    const remaining = Math.max(0, agent.timeLimit - elapsed);
    const remainingMinutes = Math.ceil(remaining / (1000 * 60));
    
    timeRemaining.textContent = remainingMinutes.toString();
    
    // Show warning if time is running out
    if (remainingMinutes <= 10 && !agent._timeWarningShown) {
      showToast(`残り時間が${remainingMinutes}分となりました`, 'warning');
      agent._timeWarningShown = true;
    }
  };
  
  // Update time every minute during execution
  agent.timeUpdateInterval = null;
  
  agent.startTimeMonitoring = function() {
    agent.timeUpdateInterval = setInterval(() => {
      agent.updateTimeDisplay();
    }, 60000); // Update every minute
  };
  
  agent.stopTimeMonitoring = function() {
    if (agent.timeUpdateInterval) {
      clearInterval(agent.timeUpdateInterval);
      agent.timeUpdateInterval = null;
    }
    agent._timeWarningShown = false;
  };
}

function setupResponsiveLayout() {
  // Handle responsive behavior
  const handleResize = () => {
    const isMobile = window.innerWidth <= 900;
    const agentContainer = document.querySelector('.agent-container');
    
    if (agentContainer) {
      agentContainer.classList.toggle('mobile-layout', isMobile);
    }
    
    // Adjust composer for mobile
    const composer = document.getElementById('agentComposer');
    if (composer && isMobile) {
      composer.style.position = 'static';
    } else if (composer) {
      composer.style.position = 'fixed';
    }
  };
  
  window.addEventListener('resize', handleResize);
  handleResize(); // Initial call
}

// Toast notification function (reuse from existing Lumora)
function showToast(message, type = 'info') {
  try {
    // Try to use existing toast system
    import('../ui/toast.js').then(({ showToast }) => {
      showToast(message, type);
    });
  } catch {
    // Fallback to simple alert
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// CSS for preview content
const previewStyles = `
<style>
.preview-text {
  padding: 20px;
  font-family: 'Noto Sans JP', sans-serif;
  line-height: 1.6;
}

.preview-text h3 {
  color: #1e293b;
  margin-bottom: 20px;
  font-size: 20px;
}

.preview-text h4 {
  color: #475569;
  margin: 16px 0 8px 0;
  font-size: 16px;
}

.preview-text p {
  color: #64748b;
  margin-bottom: 12px;
}

.section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.slide-preview {
  padding: 20px;
}

.slides-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.slide-thumbnail {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
}

.slide-number {
  background: #3b82f6;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 8px;
}

.slide-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.slide-content {
  color: #64748b;
  line-height: 1.4;
}

.sheet-preview {
  padding: 20px;
  overflow: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.preview-table th,
.preview-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
}

.preview-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
}

.code-preview {
  padding: 20px;
}

.code-header h4 {
  margin: 0 0 16px 0;
  color: #1e293b;
  font-size: 16px;
}

.code-file {
  margin-bottom: 20px;
}

.file-header {
  background: #f8fafc;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.code-content {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  margin: 0;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 6px 6px;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
}

.cost-ok {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0) !important;
  color: #166534 !important;
}

.cost-warning {
  background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
  color: #92400e !important;
}

.cost-danger {
  background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
  color: #991b1b !important;
}
</style>
`;

// Inject preview styles
const styleSheet = document.createElement('style');
styleSheet.textContent = previewStyles;
document.head.appendChild(styleSheet);