// Lumora Agent Main Controller
// 起動・ステップ制御・UI切替を担当

import { setupAgentUI } from '../ui/agent-ui.js';
import { setupAgentSidebar } from '../ui/agent-sidebar.js';
import { loadAgentState, saveAgentState } from '../state/agent-state.js';
import { createPlanner } from './planner.js';
import { createExecutor } from './executor.js';
import { createCostManager } from './cost.js';
import { showToast } from '../ui/toast.js';

class LumoraAgent {
  constructor() {
    this.state = {
      currentTask: null,
      isRunning: false,
      mode: 'auto', // 'auto' or 'step'
      tasks: [],
      costs: { current: 0, limit: 0.50 },
      timeLimit: 60 * 60 * 1000 // 1 hour in milliseconds
    };
    
    this.planner = createPlanner();
    this.executor = createExecutor();
    this.costManager = createCostManager();
    this.startTime = null;
  }

  async init() {
    console.log('🧠 Initializing Lumora Agent...');
    
    // Load persisted state
    const savedState = await loadAgentState();
    if (savedState) {
      this.state = { ...this.state, ...savedState };
    }

    // Setup UI components
    setupAgentUI(this);
    setupAgentSidebar(this);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Restore UI state
    this.restoreUIState();
    
    console.log('✅ Lumora Agent initialized');
  }

  setupEventListeners() {
    // Main input and execution
    const agentInput = document.getElementById('agentInput');
    const runBtn = document.getElementById('runAgentBtn');
    const stopBtn = document.getElementById('stopAgentBtn');
    const modeSelect = document.getElementById('modeSelect');
    const newTaskBtn = document.getElementById('newTaskBtn');
    const backToChatBtn = document.getElementById('backToChatBtn');

    // Auto-resize textarea
    agentInput?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    });

    // Enter to submit (Shift+Enter for new line)
    agentInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleRunAgent();
      }
    });

    // Run/Stop buttons
    runBtn?.addEventListener('click', () => this.handleRunAgent());
    stopBtn?.addEventListener('click', () => this.handleStopAgent());

    // Mode selection
    modeSelect?.addEventListener('change', (e) => {
      this.state.mode = e.target.value;
      this.saveState();
    });

    // Navigation
    newTaskBtn?.addEventListener('click', () => this.createNewTask());
    backToChatBtn?.addEventListener('click', () => this.navigateToChat());

    // Task filtering
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.filterTasks(filter);
        
        // Update active state
        filterTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Preview tabs
    const previewTabs = document.querySelectorAll('.preview-tab');
    previewTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabType = e.target.dataset.tab;
        this.switchPreviewTab(tabType);
        
        // Update active state
        previewTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Export functionality
    const exportBtn = document.getElementById('exportBtn');
    const exportOptions = document.querySelectorAll('.export-option');
    
    exportBtn?.addEventListener('click', () => {
      const options = document.getElementById('exportOptions');
      options.style.display = options.style.display === 'none' ? 'block' : 'none';
    });

    exportOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.handleExport(format);
      });
    });
  }

  async handleRunAgent() {
    const input = document.getElementById('agentInput');
    const userTask = input?.value?.trim();
    
    if (!userTask) {
      showToast('タスクを入力してください', 'warning');
      return;
    }

    if (this.state.isRunning) {
      showToast('既にタスクが実行中です', 'warning');
      return;
    }

    try {
      this.state.isRunning = true;
      this.startTime = Date.now();
      this.updateExecutionUI(true);
      
      // Create new task
      const task = await this.createTaskFromInput(userTask);
      this.state.currentTask = task;
      this.state.tasks.unshift(task);
      
      // Clear input
      input.value = '';
      input.style.height = 'auto';
      
      // Show task execution area
      this.showTaskExecution();
      
      // Start planning and execution
      await this.executeTask(task);
      
    } catch (error) {
      console.error('Error running agent:', error);
      showToast('タスク実行中にエラーが発生しました', 'error');
      this.state.isRunning = false;
      this.updateExecutionUI(false);
    }
  }

  async createTaskFromInput(userInput) {
    const task = {
      id: Date.now().toString(),
      title: this.generateTaskTitle(userInput),
      description: userInput,
      status: 'planning',
      createdAt: new Date(),
      steps: [],
      costs: { estimated: 0, actual: 0 },
      outputs: {},
      favorite: false
    };

    this.saveState();
    this.updateTaskList();
    this.updateTaskHeader(task);
    
    return task;
  }

  generateTaskTitle(input) {
    // Simple title generation from input
    const words = input.split(' ').slice(0, 6);
    return words.join(' ') + (input.split(' ').length > 6 ? '...' : '');
  }

  async executeTask(task) {
    try {
      // Step 1: Planning
      this.addExecutionStep('タスク分析中...', 'running');
      const plan = await this.planner.createPlan(task.description);
      task.steps = plan.steps;
      task.costs.estimated = plan.estimatedCost;
      
      this.updateExecutionStep(task.steps.length - 1, 'タスク分析完了', 'completed');
      
      // Check cost limits
      if (plan.estimatedCost > this.state.costs.limit) {
        throw new Error(`推定コスト $${plan.estimatedCost} が制限 $${this.state.costs.limit} を超えています`);
      }

      // Step 2: Execute each planned step
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        // Check time limit
        if (this.isTimeExceeded()) {
          throw new Error('時間制限（1時間）に達しました');
        }

        // Check if stopped
        if (!this.state.isRunning) {
          break;
        }

        // Step confirmation mode
        if (this.state.mode === 'step') {
          const shouldContinue = await this.confirmStep(step);
          if (!shouldContinue) {
            break;
          }
        }

        // Execute step
        this.addExecutionStep(step.description, 'running');
        const result = await this.executor.executeStep(step, task);
        
        // Update costs
        task.costs.actual += result.cost || 0;
        this.state.costs.current += result.cost || 0;
        this.updateCostDisplay();

        // Update step status
        this.updateExecutionStep(i + 1, step.description, result.success ? 'completed' : 'error');
        
        // Handle step output
        if (result.output) {
          task.outputs[step.type] = result.output;
          this.updatePreview(step.type, result.output);
        }

        // Show recommended actions after completion
        if (result.success && result.recommendations) {
          this.showRecommendedActions(result.recommendations);
        }
      }

      // Task completed
      task.status = 'completed';
      this.addExecutionStep('✅ タスク完了', 'completed');
      
    } catch (error) {
      console.error('Task execution error:', error);
      task.status = 'error';
      this.addExecutionStep(`❌ エラー: ${error.message}`, 'error');
      showToast(`タスク実行エラー: ${error.message}`, 'error');
    } finally {
      this.state.isRunning = false;
      this.updateExecutionUI(false);
      this.saveState();
    }
  }

  handleStopAgent() {
    this.state.isRunning = false;
    this.updateExecutionUI(false);
    this.addExecutionStep('⏹ ユーザーにより停止されました', 'stopped');
    showToast('タスクを停止しました', 'info');
  }

  // UI Update Methods
  updateExecutionUI(isRunning) {
    const runBtn = document.getElementById('runAgentBtn');
    const stopBtn = document.getElementById('stopAgentBtn');
    const statusBadge = document.getElementById('statusBadge');
    
    if (runBtn) runBtn.style.display = isRunning ? 'none' : 'flex';
    if (stopBtn) stopBtn.style.display = isRunning ? 'flex' : 'none';
    
    if (statusBadge) {
      statusBadge.className = `status-badge ${isRunning ? 'running' : 'waiting'}`;
      statusBadge.querySelector('.status-text').textContent = isRunning ? '実行中' : '待機中';
    }

    // Show/hide thinking animation
    const thinkingAnimation = document.getElementById('thinkingAnimation');
    const liveIndicator = document.getElementById('liveIndicator');
    
    if (thinkingAnimation) {
      thinkingAnimation.style.display = isRunning ? 'flex' : 'none';
    }
    if (liveIndicator) {
      liveIndicator.style.display = isRunning ? 'flex' : 'none';
    }
  }

  showTaskExecution() {
    const emptyState = document.getElementById('agentEmptyState');
    const taskExecution = document.getElementById('taskExecution');
    const taskHeader = document.getElementById('taskHeader');
    
    if (emptyState) emptyState.style.display = 'none';
    if (taskExecution) taskExecution.style.display = 'block';
    if (taskHeader) taskHeader.style.display = 'block';
  }

  addExecutionStep(description, status = 'waiting') {
    const stepList = document.getElementById('stepList');
    if (!stepList) return;

    const stepEl = document.createElement('div');
    stepEl.className = `step-item ${status}`;
    stepEl.innerHTML = `
      <div class="step-icon">
        <span class="step-status-icon">${this.getStatusIcon(status)}</span>
      </div>
      <div class="step-content">
        <span class="step-description">${description}</span>
        <span class="step-time">${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    
    stepList.appendChild(stepEl);
    stepList.scrollTop = stepList.scrollHeight;
  }

  updateExecutionStep(index, description, status) {
    const stepList = document.getElementById('stepList');
    if (!stepList) return;

    const steps = stepList.querySelectorAll('.step-item');
    const stepEl = steps[index];
    if (!stepEl) return;

    stepEl.className = `step-item ${status}`;
    stepEl.querySelector('.step-status-icon').textContent = this.getStatusIcon(status);
    stepEl.querySelector('.step-description').textContent = description;
  }

  getStatusIcon(status) {
    const icons = {
      'waiting': '⏳',
      'running': '⚙️',
      'completed': '✅',
      'error': '❌',
      'stopped': '⏹'
    };
    return icons[status] || '•';
  }

  updateTaskHeader(task) {
    const titleEl = document.getElementById('taskTitle');
    if (titleEl) titleEl.textContent = task.title;
  }

  updateCostDisplay() {
    const costValue = document.getElementById('costValue');
    if (costValue) {
      costValue.textContent = this.state.costs.current.toFixed(2);
    }
  }

  updateTaskList() {
    // Implementation for updating the task list in sidebar
    // This will be handled by agent-sidebar.js
  }

  switchPreviewTab(tabType) {
    // Implementation for switching preview tabs
    console.log('Switching to preview tab:', tabType);
  }

  updatePreview(type, output) {
    // Implementation for updating preview content
    console.log('Updating preview:', type, output);
  }

  showRecommendedActions(recommendations) {
    const actionsContainer = document.getElementById('recommendedActions');
    const actionCards = document.getElementById('actionCards');
    
    if (!actionsContainer || !actionCards) return;

    actionCards.innerHTML = '';
    recommendations.forEach(action => {
      const card = document.createElement('button');
      card.className = 'action-card';
      card.innerHTML = `
        <span class="action-icon">${action.icon || '💡'}</span>
        <span class="action-text">${action.text}</span>
      `;
      card.addEventListener('click', () => this.executeRecommendedAction(action));
      actionCards.appendChild(card);
    });

    actionsContainer.style.display = 'block';
  }

  async executeRecommendedAction(action) {
    // Handle recommended action execution
    console.log('Executing recommended action:', action);
  }

  handleExport(format) {
    // Implementation for export functionality
    console.log('Exporting in format:', format);
    showToast(`${format.toUpperCase()}形式でエクスポート中...`, 'info');
  }

  // State Management
  saveState() {
    saveAgentState(this.state);
  }

  restoreUIState() {
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) modeSelect.value = this.state.mode;
    
    this.updateCostDisplay();
    this.updateTaskList();
  }

  // Navigation
  createNewTask() {
    // Clear current task and reset to empty state
    this.state.currentTask = null;
    const emptyState = document.getElementById('agentEmptyState');
    const taskExecution = document.getElementById('taskExecution');
    const taskHeader = document.getElementById('taskHeader');
    
    if (emptyState) emptyState.style.display = 'flex';
    if (taskExecution) taskExecution.style.display = 'none';
    if (taskHeader) taskHeader.style.display = 'none';
    
    // Focus input
    const input = document.getElementById('agentInput');
    if (input) {
      input.focus();
      input.value = '';
      input.style.height = 'auto';
    }
  }

  navigateToChat() {
    // Save current state before navigating
    this.saveState();
    
    // Navigate back to main chat interface
    window.location.href = './index.html';
  }

  filterTasks(filter) {
    // Implementation for task filtering
    console.log('Filtering tasks by:', filter);
  }

  async confirmStep(step) {
    // Implementation for step confirmation in step mode
    return new Promise((resolve) => {
      // This would show a confirmation dialog
      // For now, just auto-confirm
      resolve(true);
    });
  }

  isTimeExceeded() {
    if (!this.startTime) return false;
    return (Date.now() - this.startTime) > this.timeLimit;
  }
}

// Initialize Agent when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const agent = new LumoraAgent();
  agent.init();
  
  // Make agent globally available for debugging
  window.__lumora_agent = agent;
});

export { LumoraAgent };