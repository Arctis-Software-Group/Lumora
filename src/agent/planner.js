// Lumora Agent Planner
// タスク分解・計画生成を担当

import { estimateCost } from './cost.js';

export function createPlanner() {
  return {
    async createPlan(userInput) {
      console.log('📋 Planning task:', userInput);
      
      // Analyze the input to determine task type and complexity
      const taskAnalysis = this.analyzeTask(userInput);
      
      // Generate step-by-step plan
      const steps = await this.generateSteps(taskAnalysis);
      
      // Estimate costs for the entire plan
      const estimatedCost = this.estimatePlanCost(steps);
      
      const plan = {
        taskType: taskAnalysis.type,
        complexity: taskAnalysis.complexity,
        steps: steps,
        estimatedCost: estimatedCost,
        estimatedTime: this.estimateTime(steps)
      };
      
      console.log('📋 Plan created:', plan);
      return plan;
    },

    analyzeTask(input) {
      const lowerInput = input.toLowerCase();
      
      // Detect task type based on keywords
      let type = 'general';
      let outputFormat = 'text';
      let complexity = 'medium';
      
      // Document creation patterns
      if (lowerInput.includes('ドキュメント') || lowerInput.includes('文書') || 
          lowerInput.includes('レポート') || lowerInput.includes('報告書')) {
        type = 'document';
        outputFormat = 'html';
      }
      
      // Presentation patterns
      else if (lowerInput.includes('プレゼン') || lowerInput.includes('スライド') || 
               lowerInput.includes('発表') || lowerInput.includes('ppt')) {
        type = 'presentation';
        outputFormat = 'slides';
      }
      
      // LP (Landing Page) patterns
      else if (lowerInput.includes('lp') || lowerInput.includes('ランディング') || 
               lowerInput.includes('ウェブサイト') || lowerInput.includes('サイト')) {
        type = 'website';
        outputFormat = 'html';
      }
      
      // Spreadsheet/Data patterns
      else if (lowerInput.includes('表') || lowerInput.includes('スプレッド') || 
               lowerInput.includes('データ') || lowerInput.includes('csv') ||
               lowerInput.includes('計算')) {
        type = 'spreadsheet';
        outputFormat = 'table';
      }
      
      // Code patterns
      else if (lowerInput.includes('コード') || lowerInput.includes('プログラム') || 
               lowerInput.includes('アプリ') || lowerInput.includes('システム')) {
        type = 'code';
        outputFormat = 'code';
      }

      // Determine complexity based on keywords and length
      if (lowerInput.includes('簡単') || lowerInput.includes('シンプル') || 
          lowerInput.includes('基本') || input.length < 50) {
        complexity = 'low';
      } else if (lowerInput.includes('詳細') || lowerInput.includes('複雑') || 
                 lowerInput.includes('高度') || input.length > 200) {
        complexity = 'high';
      }

      return {
        type,
        outputFormat,
        complexity,
        originalInput: input,
        keywords: this.extractKeywords(input)
      };
    },

    extractKeywords(input) {
      // Simple keyword extraction
      const commonWords = ['の', 'を', 'が', 'に', 'と', 'で', 'は', 'も', 'から', 'まで', 'について', 'する', 'した', 'して'];
      const words = input.split(/\s+/)
        .filter(word => word.length > 1 && !commonWords.includes(word))
        .slice(0, 10);
      return words;
    },

    async generateSteps(analysis) {
      const baseSteps = [
        {
          id: 'analyze',
          type: 'analysis',
          description: 'タスク要件を分析',
          tool: 'analyze_requirements',
          estimatedCost: 0.01,
          estimatedTime: 30
        }
      ];

      // Add specific steps based on task type
      switch (analysis.type) {
        case 'document':
          return [
            ...baseSteps,
            {
              id: 'outline',
              type: 'planning',
              description: 'ドキュメント構成を作成',
              tool: 'create_outline',
              estimatedCost: 0.02,
              estimatedTime: 60
            },
            {
              id: 'generate_content',
              type: 'generation',
              description: 'コンテンツを生成',
              tool: 'generate_doc',
              estimatedCost: 0.05,
              estimatedTime: 120
            },
            {
              id: 'format',
              type: 'formatting',
              description: 'HTML/CSS形式でフォーマット',
              tool: 'format_document',
              estimatedCost: 0.01,
              estimatedTime: 30
            },
            {
              id: 'preview',
              type: 'preview',
              description: 'プレビューを表示',
              tool: 'preview_html',
              estimatedCost: 0.001,
              estimatedTime: 10
            }
          ];

        case 'presentation':
          return [
            ...baseSteps,
            {
              id: 'structure',
              type: 'planning',
              description: 'プレゼン構成を設計',
              tool: 'create_presentation_structure',
              estimatedCost: 0.02,
              estimatedTime: 60
            },
            {
              id: 'slides',
              type: 'generation',
              description: 'スライドを生成',
              tool: 'generate_ppt',
              estimatedCost: 0.08,
              estimatedTime: 180
            },
            {
              id: 'styling',
              type: 'formatting',
              description: 'スライドデザインを適用',
              tool: 'style_slides',
              estimatedCost: 0.02,
              estimatedTime: 45
            },
            {
              id: 'preview',
              type: 'preview',
              description: 'スライドプレビューを表示',
              tool: 'preview_slides',
              estimatedCost: 0.001,
              estimatedTime: 10
            }
          ];

        case 'website':
          return [
            ...baseSteps,
            {
              id: 'wireframe',
              type: 'planning',
              description: 'サイト構成を設計',
              tool: 'create_wireframe',
              estimatedCost: 0.03,
              estimatedTime: 90
            },
            {
              id: 'content',
              type: 'generation',
              description: 'コンテンツを生成',
              tool: 'generate_website_content',
              estimatedCost: 0.06,
              estimatedTime: 150
            },
            {
              id: 'styling',
              type: 'formatting',
              description: 'CSS デザインを適用',
              tool: 'apply_website_styling',
              estimatedCost: 0.03,
              estimatedTime: 90
            },
            {
              id: 'responsive',
              type: 'optimization',
              description: 'レスポンシブ対応',
              tool: 'make_responsive',
              estimatedCost: 0.02,
              estimatedTime: 60
            },
            {
              id: 'preview',
              type: 'preview',
              description: 'ウェブサイトプレビュー',
              tool: 'preview_website',
              estimatedCost: 0.001,
              estimatedTime: 10
            }
          ];

        case 'spreadsheet':
          return [
            ...baseSteps,
            {
              id: 'data_structure',
              type: 'planning',
              description: 'データ構造を設計',
              tool: 'design_data_structure',
              estimatedCost: 0.02,
              estimatedTime: 60
            },
            {
              id: 'generate_data',
              type: 'generation',
              description: 'データを生成/計算',
              tool: 'generate_sheet',
              estimatedCost: 0.04,
              estimatedTime: 120
            },
            {
              id: 'format_table',
              type: 'formatting',
              description: 'テーブル形式でフォーマット',
              tool: 'format_table',
              estimatedCost: 0.01,
              estimatedTime: 30
            },
            {
              id: 'preview',
              type: 'preview',
              description: 'テーブルプレビューを表示',
              tool: 'preview_table',
              estimatedCost: 0.001,
              estimatedTime: 10
            }
          ];

        case 'code':
          return [
            ...baseSteps,
            {
              id: 'architecture',
              type: 'planning',
              description: 'アーキテクチャを設計',
              tool: 'design_architecture',
              estimatedCost: 0.03,
              estimatedTime: 90
            },
            {
              id: 'implement',
              type: 'generation',
              description: 'コードを実装',
              tool: 'generate_code',
              estimatedCost: 0.07,
              estimatedTime: 200
            },
            {
              id: 'test',
              type: 'validation',
              description: 'コードをテスト',
              tool: 'run_js',
              estimatedCost: 0.02,
              estimatedTime: 60
            },
            {
              id: 'document',
              type: 'documentation',
              description: 'ドキュメント生成',
              tool: 'generate_docs',
              estimatedCost: 0.02,
              estimatedTime: 45
            },
            {
              id: 'preview',
              type: 'preview',
              description: 'コードプレビューを表示',
              tool: 'preview_code',
              estimatedCost: 0.001,
              estimatedTime: 10
            }
          ];

        default:
          return [
            ...baseSteps,
            {
              id: 'process',
              type: 'processing',
              description: 'タスクを処理',
              tool: 'process_general_task',
              estimatedCost: 0.03,
              estimatedTime: 120
            },
            {
              id: 'output',
              type: 'output',
              description: '結果を出力',
              tool: 'generate_output',
              estimatedCost: 0.02,
              estimatedTime: 60
            }
          ];
      }
    },

    estimatePlanCost(steps) {
      return steps.reduce((total, step) => total + (step.estimatedCost || 0), 0);
    },

    estimateTime(steps) {
      return steps.reduce((total, step) => total + (step.estimatedTime || 0), 0);
    },

    // Generate TODO list for the AI
    generateTodoList(analysis, steps) {
      const todos = [
        '📋 タスク分析完了',
        '🎯 実行計画策定',
        ...steps.map(step => `${this.getStepIcon(step.type)} ${step.description}`),
        '✅ 成果物確認',
        '📤 エクスポート準備'
      ];

      return {
        title: `${analysis.type}作成タスク`,
        items: todos,
        estimatedCost: this.estimatePlanCost(steps),
        estimatedTime: this.estimateTime(steps)
      };
    },

    getStepIcon(stepType) {
      const icons = {
        'analysis': '🔍',
        'planning': '📋',
        'generation': '⚡',
        'formatting': '🎨',
        'preview': '👁',
        'optimization': '⚙️',
        'validation': '✅',
        'documentation': '📚',
        'processing': '🔄',
        'output': '📤'
      };
      return icons[stepType] || '•';
    }
  };
}