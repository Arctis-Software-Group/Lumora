// Lumora Agent Sidebar
// Agent用サイドバー＋チャットに戻る機能を担当

export function setupAgentSidebar(agent) {
  console.log('📂 Setting up Agent Sidebar...');
  
  // Initialize task list
  setupTaskList(agent);
  
  // Initialize task filtering
  setupTaskFiltering(agent);
  
  // Initialize navigation
  setupNavigation(agent);
  
  // Load and display existing tasks
  loadTasks(agent);
  
  console.log('✅ Agent Sidebar setup complete');
}

function setupTaskList(agent) {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;
  
  // Render task list
  agent.updateTaskList = function() {
    const tasks = agent.state.tasks || [];
    const currentFilter = getCurrentFilter();
    
    const filteredTasks = tasks.filter(task => {
      switch (currentFilter) {
        case 'favorites':
          return task.favorite;
        case 'active':
          return task.status === 'running' || task.status === 'planning';
        case 'all':
        default:
          return true;
      }
    });
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-task-list">
          <div class="empty-icon">📋</div>
          <p>タスクがありません</p>
        </div>
      `;
      return;
    }
    
    taskList.innerHTML = filteredTasks.map(task => createTaskItem(task)).join('');
    
    // Add click handlers
    taskList.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        const taskId = item.dataset.taskId;
        selectTask(agent, taskId);
      });
    });
    
    // Add favorite toggle handlers
    taskList.querySelectorAll('.task-favorite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        toggleTaskFavorite(agent, taskId);
      });
    });
  };
  
  function createTaskItem(task) {
    const isActive = agent.state.currentTask?.id === task.id;
    const statusClass = getStatusClass(task.status);
    const timeAgo = getTimeAgo(task.createdAt);
    
    return `
      <div class="task-item ${isActive ? 'active' : ''}" data-task-id="${task.id}">
        <div class="task-item-header">
          <div class="task-item-title">${escapeHtml(task.title)}</div>
          <button class="task-favorite ${task.favorite ? 'active' : ''}" 
                  data-task-id="${task.id}"
                  title="${task.favorite ? 'お気に入りから削除' : 'お気に入りに追加'}">
            ⭐
          </button>
        </div>
        <div class="task-item-meta">
          <span class="task-time">${timeAgo}</span>
          <span class="task-status ${statusClass}">${getStatusText(task.status)}</span>
        </div>
        ${task.description ? `
          <div class="task-description">
            ${escapeHtml(task.description.substring(0, 80))}${task.description.length > 80 ? '...' : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
  
  function getStatusClass(status) {
    const mapping = {
      'planning': 'waiting',
      'running': 'running',
      'completed': 'completed',
      'error': 'error',
      'stopped': 'error'
    };
    return mapping[status] || 'waiting';
  }
  
  function getStatusText(status) {
    const mapping = {
      'planning': '計画中',
      'running': '実行中',
      'completed': '完了',
      'error': 'エラー',
      'stopped': '停止'
    };
    return mapping[status] || '待機';
  }
  
  function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  function selectTask(agent, taskId) {
    const task = agent.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Update current task
    agent.state.currentTask = task;
    
    // Update UI
    agent.updateTaskList();
    showTaskDetails(agent, task);
    
    // Save state
    agent.saveState();
  }
  
  function toggleTaskFavorite(agent, taskId) {
    const task = agent.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.favorite = !task.favorite;
    
    // Update UI
    agent.updateTaskList();
    
    // Save state
    agent.saveState();
    
    // Show feedback
    const message = task.favorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました';
    showToast(message, 'info');
  }
  
  function getCurrentFilter() {
    const activeTab = document.querySelector('.filter-tab.active');
    return activeTab?.dataset?.filter || 'all';
  }
}

function setupTaskFiltering(agent) {
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active state
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update task list
      agent.updateTaskList();
    });
  });
}

function setupNavigation(agent) {
  const backToChatBtn = document.getElementById('backToChatBtn');
  const newTaskBtn = document.getElementById('newTaskBtn');
  
  // Back to chat button
  if (backToChatBtn) {
    backToChatBtn.addEventListener('click', () => {
      // Save current state
      agent.saveState();
      
      // Navigate back to main chat
      window.location.href = './index.html';
    });
  }
  
  // New task button
  if (newTaskBtn) {
    newTaskBtn.addEventListener('click', () => {
      agent.createNewTask();
    });
  }
}

function loadTasks(agent) {
  // Load tasks from state and update the list
  agent.updateTaskList();
}

function showTaskDetails(agent, task) {
  // Show task execution area
  const emptyState = document.getElementById('agentEmptyState');
  const taskExecution = document.getElementById('taskExecution');
  const taskHeader = document.getElementById('taskHeader');
  
  if (emptyState) emptyState.style.display = 'none';
  if (taskExecution) taskExecution.style.display = 'block';
  if (taskHeader) taskHeader.style.display = 'block';
  
  // Update task header
  const taskTitle = document.getElementById('taskTitle');
  if (taskTitle) taskTitle.textContent = task.title;
  
  // Update status badge
  const statusBadge = document.getElementById('statusBadge');
  if (statusBadge) {
    const statusClass = getStatusClass(task.status);
    statusBadge.className = `status-badge ${statusClass}`;
    statusBadge.querySelector('.status-text').textContent = getStatusText(task.status);
  }
  
  // Rebuild step log
  rebuildStepLog(task);
  
  // Update preview if there are outputs
  updatePreviewForTask(agent, task);
  
  // Update export button state
  if (agent.updateExportButton) {
    agent.updateExportButton();
  }
}

function rebuildStepLog(task) {
  const stepList = document.getElementById('stepList');
  if (!stepList) return;
  
  stepList.innerHTML = '';
  
  if (task.steps && task.steps.length > 0) {
    task.steps.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = `step-item ${step.status || 'waiting'}`;
      stepEl.innerHTML = `
        <div class="step-icon">
          <span class="step-status-icon">${getStepStatusIcon(step.status || 'waiting')}</span>
        </div>
        <div class="step-content">
          <span class="step-description">${escapeHtml(step.description)}</span>
          <span class="step-time">${step.completedAt ? new Date(step.completedAt).toLocaleTimeString() : ''}</span>
        </div>
      `;
      stepList.appendChild(stepEl);
    });
  }
}

function updatePreviewForTask(agent, task) {
  if (!task.outputs || Object.keys(task.outputs).length === 0) {
    return;
  }
  
  // Find the first available output type and switch to it
  const availableTypes = Object.keys(task.outputs);
  if (availableTypes.length > 0) {
    const firstType = availableTypes[0];
    
    // Update active preview tab
    const previewTabs = document.querySelectorAll('.preview-tab');
    previewTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === firstType);
    });
    
    // Trigger preview update (this would be handled by agent-ui.js)
    if (agent.switchPreviewTab) {
      agent.switchPreviewTab(firstType);
    }
  }
}

function getStepStatusIcon(status) {
  const icons = {
    'waiting': '⏳',
    'running': '⚙️',
    'completed': '✅',
    'error': '❌',
    'stopped': '⏹'
  };
  return icons[status] || '•';
}

function getStatusClass(status) {
  const mapping = {
    'planning': 'waiting',
    'running': 'running', 
    'completed': 'completed',
    'error': 'error',
    'stopped': 'error'
  };
  return mapping[status] || 'waiting';
}

function getStatusText(status) {
  const mapping = {
    'planning': '計画中',
    'running': '実行中',
    'completed': '完了',
    'error': 'エラー',
    'stopped': '停止'
  };
  return mapping[status] || '待機';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toast notification function
function showToast(message, type = 'info') {
  try {
    // Try to use existing toast system
    import('../ui/toast.js').then(({ showToast }) => {
      showToast(message, type);
    });
  } catch {
    // Fallback to console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Additional CSS for task list styling
const taskListStyles = `
<style>
.empty-task-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  opacity: 0.6;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-task-list p {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
}

.task-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.task-favorite {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-size: 14px;
  flex-shrink: 0;
}

.task-favorite:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.task-favorite.active {
  color: #fbbf24;
}

.task-description {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin-top: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
}

.task-time {
  font-size: 11px;
  opacity: 0.7;
}

/* Task status specific styles */
.task-item.active .task-item-title {
  color: #60a5fa;
}

.task-item:hover:not(.active) {
  background: rgba(255, 255, 255, 0.08);
}

/* Scrollbar for task list */
.agent-sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}

.agent-sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.agent-sidebar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.agent-sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
`;

// Inject task list styles
const styleSheet = document.createElement('style');
styleSheet.textContent = taskListStyles;
document.head.appendChild(styleSheet);