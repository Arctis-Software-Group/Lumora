// Lumora Agent Cost Manager
// APIコスト計算・制限管理を担当

// Model pricing per 1K tokens (input/output)
const MODEL_PRICING = {
  // Free tier models
  'openai/gpt-oss-20b:free': { input: 0, output: 0 },
  'meta-llama/llama-3.2-3b-instruct': { input: 0, output: 0 },
  'moonshotai/kimi-k2:free': { input: 0, output: 0 },
  'deepseek/deepseek-r1-0528:free': { input: 0, output: 0 },
  'qwen/qwen3-235b-a22b:free': { input: 0, output: 0 },
  'qwen/qwen3-30b-a3b-thinking-2507:free': { input: 0, output: 0 },
  'qwen/qwen2.5-vl-32b-instruct:free': { input: 0, output: 0 },
  'liquid/lfm-7b': { input: 0, output: 0 },
  'nvidia/nemotron-nano-9b-v2': { input: 0, output: 0 },
  'x-ai/grok-4-fast:free': { input: 0, output: 0 },
  
  // Go tier models
  'openai/gpt-oss-20b': { input: 0.0001, output: 0.0002 },
  'z-ai/glm-4.5-air:free': { input: 0, output: 0 },
  'tencent/hunyuan-a13b-instruct': { input: 0.0001, output: 0.0002 },
  'amazon/nova-micro-v1': { input: 0.00035, output: 0.0014 },
  'amazon/nova-lite-v1': { input: 0.0006, output: 0.0024 },
  'openai/gpt-5-nano': { input: 0.0002, output: 0.0004 },
  'openai/gpt-oss-120b': { input: 0.0003, output: 0.0006 },
  'meta-llama/llama-4-scout': { input: 0.0002, output: 0.0004 },
  'google/gemini-2.5-flash-lite': { input: 0.000075, output: 0.0003 },
  'baidu/ernie-4.5-vl-28b-a3b': { input: 0.0003, output: 0.0006 },
  'nousresearch/hermes-4-70b': { input: 0.0004, output: 0.0008 },
  
  // Pro tier models
  'deepseek/deepseek-chat-v3.1': { input: 0.00014, output: 0.00028 },
  'openai/gpt-5-mini': { input: 0.0003, output: 0.0012 },
  'openai/gpt-5': { input: 0.005, output: 0.015 },
  'google/gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'google/gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'amazon/nova-pro-v1': { input: 0.0008, output: 0.0032 },
  'x-ai/grok-3-mini': { input: 0.0001, output: 0.0004 },
  'x-ai/grok-code-fast-1': { input: 0.0002, output: 0.0008 },
  'nousresearch/hermes-4-405b': { input: 0.0005, output: 0.0015 },
  
  // Max tier models
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': { input: 0, output: 0 },
  'anthropic/claude-sonnet-4': { input: 0.003, output: 0.015 },
  'openai/gpt-4o': { input: 0.0025, output: 0.01 },
  
  // Ultra tier models
  'x-ai/grok-4': { input: 0.002, output: 0.01 },
  'openai/o3-pro': { input: 0.01, output: 0.04 },
  
  // Default fallback
  'default': { input: 0.0001, output: 0.0002 }
};

// Tool cost estimates (fixed costs)
const TOOL_COSTS = {
  // Analysis tools (minimal cost)
  'analyze_requirements': 0.001,
  'extract_keywords': 0.0005,
  
  // Planning tools (low cost)
  'create_outline': 0.002,
  'create_presentation_structure': 0.003,
  'create_wireframe': 0.002,
  'design_data_structure': 0.001,
  'design_architecture': 0.003,
  
  // Generation tools (variable cost based on length)
  'generate_doc': 0.01,
  'generate_ppt': 0.015,
  'generate_sheet': 0.005,
  'generate_website_content': 0.012,
  'generate_code': 0.008,
  
  // Formatting tools (minimal cost)
  'format_document': 0.001,
  'format_table': 0.001,
  'style_slides': 0.002,
  'apply_website_styling': 0.002,
  'make_responsive': 0.001,
  
  // Preview tools (very minimal cost)
  'preview_html': 0.0001,
  'preview_slides': 0.0001,
  'preview_table': 0.0001,
  'preview_website': 0.0001,
  'preview_code': 0.0001,
  
  // Execution tools
  'run_js': 0.0005,
  
  // Conversion tools
  'generate_pdf': 0.001,
  'download_bundle': 0.0005,
  
  // General tools
  'process_general_task': 0.005,
  'generate_output': 0.001
};

export function createCostManager() {
  return {
    // Get current model from Lumora state
    getCurrentModel() {
      try {
        return localStorage.getItem('lumora_selected_model') || 'x-ai/grok-4-fast:free';
      } catch {
        return 'x-ai/grok-4-fast:free';
      }
    },

    // Calculate cost for token usage
    calculateTokenCost(modelId, inputTokens = 0, outputTokens = 0) {
      const pricing = MODEL_PRICING[modelId] || MODEL_PRICING['default'];
      const inputCost = (inputTokens / 1000) * pricing.input;
      const outputCost = (outputTokens / 1000) * pricing.output;
      return inputCost + outputCost;
    },

    // Estimate tokens for text (rough estimation)
    estimateTokens(text) {
      if (!text) return 0;
      // Rough estimation: 1 token ≈ 4 characters for Japanese, 4 chars for English
      return Math.ceil(text.length / 4);
    },

    // Get tool cost estimate
    getToolCost(toolName, params = {}) {
      const baseCost = TOOL_COSTS[toolName] || 0.001;
      
      // Apply complexity multipliers
      let multiplier = 1;
      
      if (params.complexity === 'high') {
        multiplier = 2;
      } else if (params.complexity === 'low') {
        multiplier = 0.5;
      }
      
      // Apply length multipliers for generation tools
      if (toolName.startsWith('generate_') && params.inputLength) {
        const lengthMultiplier = Math.max(0.5, Math.min(3, params.inputLength / 100));
        multiplier *= lengthMultiplier;
      }
      
      return baseCost * multiplier;
    },

    // Estimate cost for a complete plan
    estimatePlanCost(plan) {
      let totalCost = 0;
      const currentModel = this.getCurrentModel();
      
      plan.steps.forEach(step => {
        // Tool execution cost
        const toolCost = this.getToolCost(step.tool, {
          complexity: plan.complexity,
          inputLength: plan.inputLength || 100
        });
        
        // Model inference cost (estimated)
        const estimatedInputTokens = this.estimateStepInputTokens(step);
        const estimatedOutputTokens = this.estimateStepOutputTokens(step);
        const modelCost = this.calculateTokenCost(currentModel, estimatedInputTokens, estimatedOutputTokens);
        
        totalCost += toolCost + modelCost;
      });
      
      return Math.round(totalCost * 1000) / 1000; // Round to 3 decimal places
    },

    estimateStepInputTokens(step) {
      // Estimate input tokens based on step type
      const baseTokens = {
        'analysis': 100,
        'planning': 200,
        'generation': 500,
        'formatting': 100,
        'preview': 50,
        'conversion': 50
      };
      
      return baseTokens[step.type] || 100;
    },

    estimateStepOutputTokens(step) {
      // Estimate output tokens based on step type
      const baseTokens = {
        'analysis': 150,
        'planning': 300,
        'generation': 1000,
        'formatting': 200,
        'preview': 100,
        'conversion': 100
      };
      
      return baseTokens[step.type] || 200;
    },

    // Check if cost would exceed limit
    checkCostLimit(estimatedCost, currentCost = 0, limit = 0.50) {
      const totalCost = currentCost + estimatedCost;
      return {
        withinLimit: totalCost <= limit,
        totalCost: totalCost,
        remainingBudget: limit - totalCost,
        percentUsed: (totalCost / limit) * 100
      };
    },

    // Get cost breakdown for display
    getCostBreakdown(costs) {
      return {
        total: costs.reduce((sum, cost) => sum + cost.amount, 0),
        byTool: this.groupCostsByTool(costs),
        byModel: this.groupCostsByModel(costs),
        timeline: this.getCostTimeline(costs)
      };
    },

    groupCostsByTool(costs) {
      const grouped = {};
      costs.forEach(cost => {
        if (!grouped[cost.tool]) {
          grouped[cost.tool] = 0;
        }
        grouped[cost.tool] += cost.amount;
      });
      return grouped;
    },

    groupCostsByModel(costs) {
      const grouped = {};
      costs.forEach(cost => {
        const model = cost.model || 'unknown';
        if (!grouped[model]) {
          grouped[model] = 0;
        }
        grouped[model] += cost.amount;
      });
      return grouped;
    },

    getCostTimeline(costs) {
      return costs.map(cost => ({
        timestamp: cost.timestamp,
        amount: cost.amount,
        cumulative: costs
          .filter(c => c.timestamp <= cost.timestamp)
          .reduce((sum, c) => sum + c.amount, 0)
      }));
    },

    // Format cost for display
    formatCost(cost, currency = 'USD') {
      if (cost < 0.001) {
        return '< $0.001';
      }
      return `$${cost.toFixed(3)}`;
    },

    // Get cost status color for UI
    getCostStatusColor(percentUsed) {
      if (percentUsed < 50) return 'green';
      if (percentUsed < 80) return 'yellow';
      return 'red';
    },

    // Create cost alert message
    createCostAlert(costCheck) {
      if (costCheck.withinLimit) {
        if (costCheck.percentUsed > 80) {
          return {
            level: 'warning',
            message: `コスト使用率が${costCheck.percentUsed.toFixed(1)}%です。残り予算: ${this.formatCost(costCheck.remainingBudget)}`
          };
        }
        return null;
      } else {
        return {
          level: 'error',
          message: `コスト制限を超過します。予算: $0.50、推定使用額: ${this.formatCost(costCheck.totalCost)}`
        };
      }
    }
  };
}

// Export cost tracking function for use in executor
export function trackCost(toolName, usage = {}) {
  const costManager = createCostManager();
  const currentModel = costManager.getCurrentModel();
  
  // Calculate actual cost based on usage
  const tokenCost = costManager.calculateTokenCost(
    currentModel,
    usage.inputTokens || 0,
    usage.outputTokens || 0
  );
  
  const toolCost = costManager.getToolCost(toolName, usage.params || {});
  
  const totalCost = tokenCost + toolCost;
  
  // Store cost record
  const costRecord = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    model: currentModel,
    amount: totalCost,
    breakdown: {
      tokens: tokenCost,
      tool: toolCost
    },
    usage: usage
  };
  
  // Add to cost history in localStorage
  try {
    const costHistory = JSON.parse(localStorage.getItem('lumora_agent_costs') || '[]');
    costHistory.push(costRecord);
    
    // Keep only last 100 records
    if (costHistory.length > 100) {
      costHistory.splice(0, costHistory.length - 100);
    }
    
    localStorage.setItem('lumora_agent_costs', JSON.stringify(costHistory));
  } catch (error) {
    console.warn('Failed to save cost record:', error);
  }
  
  console.log(`💰 Cost tracked: ${costManager.formatCost(totalCost)} for ${toolName}`);
  
  return totalCost;
}

// Export cost estimation function
export function estimateCost(toolName, parameters = {}) {
  const costManager = createCostManager();
  return costManager.getToolCost(toolName, parameters);
}

// Export function to get current cost status
export function getCurrentCostStatus() {
  const costManager = createCostManager();
  
  try {
    const costHistory = JSON.parse(localStorage.getItem('lumora_agent_costs') || '[]');
    
    // Calculate current session costs (today)
    const today = new Date().toDateString();
    const todayCosts = costHistory.filter(cost => 
      new Date(cost.timestamp).toDateString() === today
    );
    
    const totalToday = todayCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const costCheck = costManager.checkCostLimit(0, totalToday);
    
    return {
      currentCost: totalToday,
      limit: 0.50,
      remaining: costCheck.remainingBudget,
      percentUsed: costCheck.percentUsed,
      withinLimit: costCheck.withinLimit,
      alert: costManager.createCostAlert(costCheck),
      breakdown: costManager.getCostBreakdown(todayCosts)
    };
  } catch (error) {
    console.warn('Failed to get cost status:', error);
    return {
      currentCost: 0,
      limit: 0.50,
      remaining: 0.50,
      percentUsed: 0,
      withinLimit: true,
      alert: null,
      breakdown: { total: 0, byTool: {}, byModel: {}, timeline: [] }
    };
  }
}