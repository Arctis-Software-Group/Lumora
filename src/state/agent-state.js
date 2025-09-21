// Lumora Agent State Management
// 状態保存（sessionStorageまたはIndexedDB）を担当

const STORAGE_KEY = 'lumora_agent_state';
const STORAGE_VERSION = '1.0';

// State structure
const DEFAULT_STATE = {
  version: STORAGE_VERSION,
  currentTask: null,
  tasks: [],
  costs: {
    current: 0,
    limit: 0.50,
    history: []
  },
  preferences: {
    mode: 'auto',
    language: 'ja',
    theme: 'default',
    notifications: true
  },
  session: {
    startTime: null,
    lastActive: null
  }
};

export async function loadAgentState() {
  try {
    // Try to load from localStorage first (most compatible)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      
      // Validate and migrate if necessary
      const validatedState = validateAndMigrateState(state);
      
      // Update last active time
      validatedState.session.lastActive = new Date().toISOString();
      
      console.log('📥 Agent state loaded from localStorage');
      return validatedState;
    }
    
    // Try IndexedDB if localStorage is not available or empty
    const idbState = await loadFromIndexedDB();
    if (idbState) {
      console.log('📥 Agent state loaded from IndexedDB');
      return idbState;
    }
    
    console.log('🆕 Creating new Agent state');
    return createNewState();
    
  } catch (error) {
    console.warn('Failed to load Agent state:', error);
    return createNewState();
  }
}

export async function saveAgentState(state) {
  try {
    // Update session info
    const stateToSave = {
      ...state,
      session: {
        ...state.session,
        lastActive: new Date().toISOString()
      }
    };
    
    // Save to localStorage (primary)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    
    // Also save to IndexedDB (backup)
    await saveToIndexedDB(stateToSave);
    
    console.log('💾 Agent state saved');
    
  } catch (error) {
    console.warn('Failed to save Agent state:', error);
  }
}

function createNewState() {
  return {
    ...DEFAULT_STATE,
    session: {
      startTime: new Date().toISOString(),
      lastActive: new Date().toISOString()
    }
  };
}

function validateAndMigrateState(state) {
  // Ensure state has required structure
  const validated = {
    ...DEFAULT_STATE,
    ...state
  };
  
  // Version migration
  if (!validated.version || validated.version !== STORAGE_VERSION) {
    validated.version = STORAGE_VERSION;
    
    // Perform any necessary migrations here
    if (!validated.costs.history) {
      validated.costs.history = [];
    }
    
    if (!validated.preferences) {
      validated.preferences = DEFAULT_STATE.preferences;
    }
    
    if (!validated.session) {
      validated.session = {
        startTime: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
    }
  }
  
  // Validate tasks array
  if (!Array.isArray(validated.tasks)) {
    validated.tasks = [];
  }
  
  // Validate current task
  if (validated.currentTask && !validated.tasks.find(t => t.id === validated.currentTask.id)) {
    validated.currentTask = null;
  }
  
  // Validate costs
  if (typeof validated.costs.current !== 'number') {
    validated.costs.current = 0;
  }
  
  if (typeof validated.costs.limit !== 'number') {
    validated.costs.limit = 0.50;
  }
  
  return validated;
}

// IndexedDB operations
async function loadFromIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    
    const request = indexedDB.open('LumoraAgent', 1);
    
    request.onerror = () => resolve(null);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('state')) {
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['state'], 'readonly');
      const store = transaction.objectStore('state');
      const getRequest = store.get(STORAGE_KEY);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? validateAndMigrateState(result.data) : null);
      };
      
      getRequest.onerror = () => resolve(null);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
    };
  });
}

async function saveToIndexedDB(state) {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve();
      return;
    }
    
    const request = indexedDB.open('LumoraAgent', 1);
    
    request.onerror = () => resolve();
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('state')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['state'], 'readwrite');
      const store = transaction.objectStore('state');
      
      store.put({
        key: STORAGE_KEY,
        data: state,
        timestamp: new Date().toISOString()
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
    };
  });
}

// Task management helpers
export function createTask(title, description, type = 'general') {
  return {
    id: generateTaskId(),
    title: title,
    description: description,
    type: type,
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    steps: [],
    outputs: {},
    costs: {
      estimated: 0,
      actual: 0
    },
    metadata: {
      complexity: 'medium',
      estimatedTime: 0
    }
  };
}

export function updateTask(task, updates) {
  return {
    ...task,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}

export function addTaskStep(task, step) {
  const updatedSteps = [...(task.steps || []), {
    ...step,
    id: generateStepId(),
    timestamp: new Date().toISOString()
  }];
  
  return updateTask(task, { steps: updatedSteps });
}

export function updateTaskStep(task, stepId, updates) {
  const updatedSteps = task.steps.map(step => 
    step.id === stepId 
      ? { ...step, ...updates, updatedAt: new Date().toISOString() }
      : step
  );
  
  return updateTask(task, { steps: updatedSteps });
}

export function addTaskOutput(task, outputType, output) {
  const updatedOutputs = {
    ...task.outputs,
    [outputType]: {
      ...output,
      timestamp: new Date().toISOString()
    }
  };
  
  return updateTask(task, { outputs: updatedOutputs });
}

// Cost tracking helpers
export function addCostRecord(state, cost, toolName, model) {
  const costRecord = {
    id: generateCostId(),
    amount: cost,
    tool: toolName,
    model: model,
    timestamp: new Date().toISOString(),
    taskId: state.currentTask?.id || null
  };
  
  const updatedHistory = [...(state.costs.history || []), costRecord];
  
  // Keep only last 100 records
  if (updatedHistory.length > 100) {
    updatedHistory.splice(0, updatedHistory.length - 100);
  }
  
  return {
    ...state,
    costs: {
      ...state.costs,
      current: state.costs.current + cost,
      history: updatedHistory
    }
  };
}

export function resetDailyCosts(state) {
  return {
    ...state,
    costs: {
      ...state.costs,
      current: 0
    }
  };
}

// Preferences helpers
export function updatePreferences(state, preferences) {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      ...preferences
    }
  };
}

// Session helpers
export function updateSession(state, sessionData) {
  return {
    ...state,
    session: {
      ...state.session,
      ...sessionData,
      lastActive: new Date().toISOString()
    }
  };
}

// ID generation helpers
function generateTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateStepId() {
  return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateCostId() {
  return 'cost_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export/Import functionality
export async function exportAgentData() {
  try {
    const state = await loadAgentState();
    
    const exportData = {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: state.tasks,
      preferences: state.preferences,
      costs: state.costs
    };
    
    return JSON.stringify(exportData, null, 2);
    
  } catch (error) {
    console.error('Failed to export Agent data:', error);
    throw error;
  }
}

export async function importAgentData(jsonData) {
  try {
    const importData = JSON.parse(jsonData);
    
    // Validate import data
    if (!importData.version || !importData.tasks) {
      throw new Error('Invalid import data format');
    }
    
    const currentState = await loadAgentState();
    
    // Merge imported data with current state
    const mergedState = {
      ...currentState,
      tasks: [...(currentState.tasks || []), ...(importData.tasks || [])],
      preferences: { ...currentState.preferences, ...(importData.preferences || {}) }
    };
    
    // Remove duplicate tasks (by ID)
    const uniqueTasks = [];
    const seenIds = new Set();
    
    for (const task of mergedState.tasks) {
      if (!seenIds.has(task.id)) {
        uniqueTasks.push(task);
        seenIds.add(task.id);
      }
    }
    
    mergedState.tasks = uniqueTasks;
    
    // Save merged state
    await saveAgentState(mergedState);
    
    return mergedState;
    
  } catch (error) {
    console.error('Failed to import Agent data:', error);
    throw error;
  }
}

// Cleanup and maintenance
export async function cleanupOldData() {
  try {
    const state = await loadAgentState();
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Remove tasks older than 30 days (except favorites)
    const filteredTasks = state.tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return task.favorite || taskDate > thirtyDaysAgo;
    });
    
    // Remove cost records older than 30 days
    const filteredCosts = state.costs.history.filter(cost => {
      const costDate = new Date(cost.timestamp);
      return costDate > thirtyDaysAgo;
    });
    
    const cleanedState = {
      ...state,
      tasks: filteredTasks,
      costs: {
        ...state.costs,
        history: filteredCosts
      }
    };
    
    await saveAgentState(cleanedState);
    
    console.log('🧹 Agent data cleanup completed');
    return cleanedState;
    
  } catch (error) {
    console.warn('Failed to cleanup Agent data:', error);
  }
}

// Auto-save mechanism
let autoSaveTimeout = null;

export function scheduleAutoSave(state) {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(() => {
    saveAgentState(state);
  }, 1000); // Save after 1 second of inactivity
}

// Initialize cleanup on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Run cleanup once per day
    const lastCleanup = localStorage.getItem('lumora_agent_last_cleanup');
    const now = new Date().toDateString();
    
    if (lastCleanup !== now) {
      cleanupOldData().then(() => {
        localStorage.setItem('lumora_agent_last_cleanup', now);
      });
    }
  });
  
  // Save state before page unload
  window.addEventListener('beforeunload', () => {
    const agentState = window.__lumora_agent?.state;
    if (agentState) {
      // Use synchronous localStorage for immediate save
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agentState));
    }
  });
}